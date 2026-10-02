import type { ServiceHealth } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * Server-backed calls only — this module has no mock fallback. Build metadata
 * (size, checksum, build date) comes from `lib/apk.ts` reading the real file.
 */
export const api = {
  /**
   * Real service status. Returns null instead of throwing when the API is down,
   * so a status pill can render "unreachable" rather than breaking the page.
   */
  async getHealth(): Promise<ServiceHealth | null> {
    if (!API_BASE) return null;

    try {
      const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
      if (!res.ok) return null;

      const json = await res.json();
      const d = json?.data ?? json;

      return {
        status: d?.status === 'ok' ? 'ok' : 'degraded',
        timestamp: d?.timestamp ?? new Date().toISOString(),
        uptimeSeconds: Number(d?.uptime) || 0,
        aiProvider: d?.groq ?? 'not_set',
        cache: d?.redis ?? 'not_set',
        database: d?.database ?? null,
      };
    } catch {
      return null;
    }
  },
};
