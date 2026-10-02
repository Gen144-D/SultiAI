/**
 * Extracts a human-readable message from an unknown thrown value.
 *
 * `catch (err: unknown)` is the only type-safe way to catch, and the API layer
 * can reject with a plain `Error`, a `{ message }` object, or a bare string.
 * Centralising that keeps every catch block honest without `any` casts.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.trim()) return error;
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}
