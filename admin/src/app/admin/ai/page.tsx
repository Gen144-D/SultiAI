'use client';

import { DonutChart, LineChart, chartColor } from '@/components/ChartCard';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/ProgressRing';
import { Stagger, StaggerItem } from '@/components/motion';
import { StatCard } from '@/components/StatCard';
import { Card, CardHeader, ErrorState, LoadingState, ghostBtn } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/export';

export default function AdminAiPage() {
  const { data, loading, error, reload } = useAsync(() => api.getAiUsage(), []);

  if (loading) return <LoadingState label="Loading AI usage..." />;
  if (error || !data)
    return <ErrorState message={error ?? 'Failed to load AI usage'} onRetry={reload} />;

  const totalRequests =
    data.conversations + data.voiceRequests + data.tutorRequests + data.whisperRequests;
  const failureRate = Math.round((data.failedRequests / (totalRequests || 1)) * 1000) / 10;
  const slowest = [...data.providers].sort(
    (a, b) => b.failed / (b.requests || 1) - a.failed / (a.requests || 1)
  )[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI console"
        title="AI Usage"
        description="Model traffic, failures, and response latency across every Sulti service."
        actions={
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                data.providers.map((p) => ({
                  provider: p.name,
                  requests: p.requests,
                  failed: p.failed,
                  failureRate: `${((p.failed / (p.requests || 1)) * 100).toFixed(1)}%`,
                })),
                `sultiai-ai-usage-${new Date().toISOString().split('T')[0]}.csv`
              )
            }
            className={ghostBtn}
          >
            Export CSV
          </button>
        }
      />

      {/* Request mix, leading with the figure that gates learner experience. */}
      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" step={0.06}>
        <StaggerItem index={0}>
          <StatCard
            label="Total AI requests"
            value={totalRequests.toLocaleString()}
            delta={`${failureRate}% failure rate`}
            tone={failureRate > 5 ? 'red' : 'brand'}
            icon="✦"
            emphasis
          />
        </StaggerItem>
        <StaggerItem index={1}>
          <StatCard
            label="Avg response time"
            value={`${data.avgResponseMs} ms`}
            delta={data.avgResponseMs < 1000 ? 'Within the 1s target' : 'Above the 1s target'}
            tone={data.avgResponseMs < 1000 ? 'green' : 'amber'}
            icon="◷"
          />
        </StaggerItem>
        <StaggerItem index={2}>
          <StatCard
            label="Failed requests"
            value={data.failedRequests.toLocaleString()}
            delta={slowest ? `Most failures: ${slowest.name}` : 'No failures recorded'}
            tone={data.failedRequests > 0 ? 'red' : 'green'}
            icon="!"
          />
        </StaggerItem>
        <StaggerItem index={3}>
          <StatCard
            label="Tokens (estimated)"
            value={data.totalTokens.toLocaleString()}
            delta="30-day estimate"
            tone="violet"
            icon="▦"
          />
        </StaggerItem>
      </Stagger>

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" step={0.06}>
        <StaggerItem index={0}>
          <StatCard
            label="AI conversations"
            value={data.conversations.toLocaleString()}
            delta="Contextual two-way chat"
            icon="◎"
          />
        </StaggerItem>
        <StaggerItem index={1}>
          <StatCard
            label="Tutor requests"
            value={data.tutorRequests.toLocaleString()}
            delta="Structured tutoring flow"
            tone="green"
            icon="✧"
          />
        </StaggerItem>
        <StaggerItem index={2}>
          <StatCard
            label="Voice requests"
            value={data.voiceRequests.toLocaleString()}
            delta="Live conversation sessions"
            tone="amber"
            icon="◍"
          />
        </StaggerItem>
        <StaggerItem index={3}>
          <StatCard
            label="Whisper requests"
            value={data.whisperRequests.toLocaleString()}
            delta="Speech recognition"
            tone="violet"
            icon="◑"
          />
        </StaggerItem>
      </Stagger>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <CardHeader title="Requests by provider" subtitle="Distribution across AI services" />
          <div className="pt-6">
            <DonutChart data={data.providers.map((p) => ({ label: p.name, value: p.requests }))} />
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader title="Daily request volume" subtitle="Last 7 days" />
          <div className="pt-6">
            <LineChart data={data.trend} color={chartColor(0)} gradientId="ai-volume" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Provider breakdown" subtitle="Requests and failures per service" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
                <th scope="col" className="px-6 py-3.5">
                  Provider
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Requests
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Failed
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Failure rate
                </th>
              </tr>
            </thead>
            <tbody>
              {data.providers.map((p) => {
                const rate = (p.failed / (p.requests || 1)) * 100;
                return (
                  <tr key={p.name} className="border-b border-line last:border-0">
                    <td className="px-6 py-3.5 font-semibold text-ink">{p.name}</td>
                    <td className="px-6 py-3.5 text-right tabular-nums text-ink-soft">
                      {p.requests.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right tabular-nums text-ink-soft">
                      {p.failed.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <ProgressBar
                          value={Math.min(100, rate)}
                          tone={rate > 2 ? 'var(--danger-fill)' : 'var(--success-fill)'}
                          label={`${p.name} failure rate`}
                          className="w-32"
                        />
                        <span className="text-xs tabular-nums text-ink-soft">
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
