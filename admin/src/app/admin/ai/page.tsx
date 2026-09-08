'use client';

import { DonutChart, LineChart } from '@/components/ChartCard';
import { StatCard } from '@/components/StatCard';
import { Card, CardHeader, ErrorState, LoadingState } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/export';

export default function AdminAiPage() {
  const { data, loading, error, reload } = useAsync(() => api.getAiUsage(), []);

  if (loading) return <LoadingState label="Loading AI usage..." />;
  if (error || !data)
    return <ErrorState message={error ?? 'Failed to load AI usage'} onRetry={reload} />;

  const failureRate =
    Math.round(
      (data.failedRequests /
        (data.conversations + data.voiceRequests + data.tutorRequests + data.whisperRequests)) *
        1000
    ) / 10;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">AI Usage</h1>
          <p className="mt-1 text-sm text-ink-soft">Model traffic, failures, and performance.</p>
        </div>
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              data.providers.map((p) => ({
                provider: p.name,
                requests: p.requests,
                failed: p.failed,
                failureRate: `${((p.failed / p.requests) * 100).toFixed(1)}%`,
              })),
              `sultiai-ai-usage-${new Date().toISOString().split('T')[0]}.csv`
            )
          }
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand"
        >
          Export CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="AI conversations" value={data.conversations.toLocaleString()} icon="💬" />
        <StatCard
          label="Tutor requests"
          value={data.tutorRequests.toLocaleString()}
          tone="green"
          icon="🤖"
        />
        <StatCard
          label="Voice requests"
          value={data.voiceRequests.toLocaleString()}
          tone="amber"
          icon="🎙"
        />
        <StatCard
          label="Whisper requests"
          value={data.whisperRequests.toLocaleString()}
          tone="violet"
          icon="🔉"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Failed requests"
          value={data.failedRequests.toLocaleString()}
          delta={`${failureRate}% of total`}
          tone="red"
          icon="⚠️"
        />
        <StatCard
          label="Avg response time"
          value={`${data.avgResponseMs} ms`}
          delta="Target: < 1000ms"
          tone="green"
          icon="⏱"
        />
        <StatCard
          label="Tokens (est.)"
          value={data.totalTokens.toLocaleString()}
          delta="30-day estimate"
          icon="🧮"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Requests by provider" subtitle="Distribution across AI services" />
          <div className="p-6">
            <DonutChart data={data.providers.map((p) => ({ label: p.name, value: p.requests }))} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Daily request volume" subtitle="Last 7 days" />
          <div className="p-6">
            <LineChart data={data.trend} color="#1e6f9f" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Provider breakdown" subtitle="Requests and failures per service" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-6 py-3.5 font-semibold">Provider</th>
                <th className="px-6 py-3.5 font-semibold">Requests</th>
                <th className="px-6 py-3.5 font-semibold">Failed</th>
                <th className="px-6 py-3.5 font-semibold">Failure rate</th>
              </tr>
            </thead>
            <tbody>
              {data.providers.map((p) => (
                <tr key={p.name} className="border-b border-line last:border-0">
                  <td className="px-6 py-3.5 font-semibold text-ink">{p.name}</td>
                  <td className="px-6 py-3.5 tabular-nums text-ink-soft">
                    {p.requests.toLocaleString()}
                  </td>
                  <td className="px-6 py-3.5 tabular-nums text-ink-soft">{p.failed}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
                        <div
                          className={`h-full rounded-full ${p.failed / p.requests > 0.02 ? 'bg-danger' : 'bg-success'}`}
                          style={{ width: `${Math.min(100, (p.failed / p.requests) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-ink-soft">
                        {((p.failed / p.requests) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
