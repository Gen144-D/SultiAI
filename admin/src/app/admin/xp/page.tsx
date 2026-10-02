'use client';

import { BarChart, chartColor } from '@/components/ChartCard';
import { PageHeader } from '@/components/PageHeader';
import { Stagger, StaggerItem } from '@/components/motion';
import { StatCard } from '@/components/StatCard';
import { Avatar, Card, CardHeader, ErrorState, LoadingState, ghostBtn } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/export';

export default function AdminXpPage() {
  const { data, loading, error, reload } = useAsync(() => api.getXpOverview(), []);

  if (loading) return <LoadingState label="Loading XP data..." />;
  if (error || !data)
    return <ErrorState message={error ?? 'Failed to load XP data'} onRetry={reload} />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Gamification"
        title="XP & Rewards"
        description="How the reward loop is performing and who is leading it."
        actions={
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                data.topUsers.map((u, i) => ({
                  rank: i + 1,
                  name: u.name,
                  level: u.level,
                  xp: u.xp,
                  streak: u.streak,
                })),
                `sultiai-top-learners-${new Date().toISOString().split('T')[0]}.csv`
              )
            }
            className={ghostBtn}
          >
            Export Top Learners
          </button>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-3" step={0.07}>
        <StaggerItem index={0}>
          <StatCard
            label="Total XP awarded"
            value={data.totalXpAwarded.toLocaleString()}
            delta="All time"
            icon="⚡"
            emphasis
          />
        </StaggerItem>
        <StaggerItem index={1}>
          <StatCard
            label="Avg daily XP"
            value={data.avgDailyXp.toLocaleString()}
            delta="Last 7 days"
            tone="amber"
            icon="◷"
          />
        </StaggerItem>
        <StaggerItem index={2}>
          <StatCard
            label="Daily rewards claimed"
            value={data.dailyRewardsClaimed.toLocaleString()}
            delta="Check-in rewards"
            tone="green"
            icon="◈"
          />
        </StaggerItem>
      </Stagger>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <CardHeader title="Level distribution" subtitle="Active users by level" />
          <div className="pt-6">
            <BarChart data={data.levelDistribution} color={chartColor(2)} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Top learners" subtitle="Highest XP this month" />
          <ul className="divide-y divide-line">
            {data.topUsers.map((u, i) => (
              <li
                key={u.id}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2/50 sm:px-6"
              >
                <span
                  aria-hidden="true"
                  className={`w-5 text-center text-sm font-semibold tabular-nums ${
                    i === 0 ? 'text-chart-5' : 'text-ink-faint'
                  }`}
                >
                  {i + 1}
                </span>
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{u.name}</p>
                  <p className="text-xs text-ink-faint">
                    Level {u.level} · {u.streak > 0 ? `${u.streak}-day streak` : 'no active streak'}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-brand-ink">
                  {u.xp.toLocaleString()} XP
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
