const DEFAULT_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 2000;

export interface FetchWithRetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOnStatus?: (status: number) => boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function delayFor(attempt: number, base: number, max: number): number {
  return Math.min(max, base * Math.pow(2, attempt));
}

function isRetryableNetworkError(err: unknown): boolean {
  const cause: any = err && typeof err === 'object' ? (err as any).cause : undefined;
  const code = (cause && cause.code) || (err as any)?.code;
  if (
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ENETUNREACH' ||
    code === 'EADDRNOTAVAIL'
  ) {
    return true;
  }
  return /fetch failed/i.test(String((err as any)?.message || ''));
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return Math.min(10000, seconds * 1000);
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.min(10000, Math.max(0, date - Date.now()));
  return null;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const retryOnStatus =
    options.retryOnStatus ?? ((status: number) => status === 429 || status >= 500);

  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      lastErr = err;
      if (!isRetryableNetworkError(err) || attempt >= retries) throw err;
      await sleep(delayFor(attempt, baseDelayMs, maxDelayMs));
      continue;
    }

    if (!retryOnStatus(res.status) || attempt >= retries) return res;

    try {
      res.body && res.body.cancel();
    } catch {}
    const retryAfter = parseRetryAfter(res.headers.get('retry-after'));
    await sleep(retryAfter ?? delayFor(attempt, baseDelayMs, maxDelayMs));
  }

  throw lastErr ?? new Error('fetchWithRetry exhausted retries');
}
