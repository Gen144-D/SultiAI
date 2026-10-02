import { api } from '@/lib/api';

/**
 * Live service status from the Express `/api/health` endpoint. Renders nothing
 * when no API URL is configured, so it is invisible in local/preview builds.
 */
export default async function ServiceStatus() {
  const health = await api.getHealth();
  if (!health) return null;

  const ok = health.status === 'ok';
  const dbOk = health.database?.status === 'ok';

  const items = [
    { label: 'App API', ok, detail: ok ? 'Operational' : 'Degraded' },
    {
      label: 'Database',
      ok: dbOk,
      detail: health.database
        ? `${health.database.status} · ${health.database.latencyMs}ms`
        : 'Unconfigured',
    },
    {
      label: 'AI tutor',
      ok: health.aiProvider === 'configured',
      detail: health.aiProvider,
    },
  ];

  return (
    <div className="glass-1 rounded-card border-line px-5 py-5">
      <div className="flex items-center gap-2">
        <span
          className={`anim-pulse h-1.5 w-1.5 rounded-full ${ok ? 'bg-success' : 'bg-warning'}`}
          aria-hidden
        />
        <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
          Service status
        </p>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span
                className={`h-1.5 w-1.5 rounded-full ${item.ok ? 'bg-success' : 'bg-warning'}`}
                aria-hidden
              />
              {item.label}
            </dt>
            <dd className="mt-1 pl-3.5 font-mono text-xs text-ink-faint">{item.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
