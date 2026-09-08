import logger from './logger';

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuits = new Map<string, CircuitBreakerState>();

export function createCircuitBreaker(
  name: string,
  options: CircuitBreakerOptions = { failureThreshold: 5, resetTimeoutMs: 60000 }
) {
  if (!circuits.has(name)) {
    circuits.set(name, { failures: 0, lastFailureTime: 0, state: 'closed' });
  }

  return {
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      const circuit = circuits.get(name)!;
      const now = Date.now();

      if (circuit.state === 'open') {
        if (now - circuit.lastFailureTime >= options.resetTimeoutMs) {
          circuit.state = 'half-open';
          logger.info(`Circuit breaker "${name}" half-open, allowing request`);
        } else {
          throw new Error(`Circuit breaker "${name}" is open, request blocked`);
        }
      }

      try {
        const result = await fn();
        if (circuit.state === 'half-open') {
          circuit.state = 'closed';
          circuit.failures = 0;
          logger.info(`Circuit breaker "${name}" closed, service recovered`);
        }
        return result;
      } catch (error) {
        circuit.failures++;
        circuit.lastFailureTime = now;

        if (circuit.failures >= options.failureThreshold) {
          circuit.state = 'open';
          logger.warn(`Circuit breaker "${name}" opened after ${circuit.failures} failures`);
        }

        throw error;
      }
    },

    getState(): CircuitBreakerState {
      return { ...circuits.get(name)! };
    },

    reset(): void {
      circuits.set(name, { failures: 0, lastFailureTime: 0, state: 'closed' });
      logger.info(`Circuit breaker "${name}" manually reset`);
    },
  };
}

export const groqBreaker = createCircuitBreaker('groq', {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
});
export const whisperBreaker = createCircuitBreaker('whisper', {
  failureThreshold: 3,
  resetTimeoutMs: 30000,
});
