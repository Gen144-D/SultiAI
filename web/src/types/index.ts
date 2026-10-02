/** Shape of `GET /api/health` on the Express server, after envelope unwrapping. */
export interface ServiceHealth {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  /** The server reports its LLM provider under `groq`. */
  aiProvider: string;
  cache: string;
  database: { status: string; dialect: string; latencyMs: number } | null;
}
