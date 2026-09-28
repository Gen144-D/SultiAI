'use client';

import { BarChart, LineChart, chartColor } from '@/components/ChartCard';
import { StatCard } from '@/components/StatCard';
import { Card, CardHeader, ErrorState, LoadingState, StatusBadge } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';

export default function AdminDashboardPage() {
  const { data, loading, error, reload } = useAsync(() => api.getOverview(), []);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error || !data)
    return <ErrorState message={error ?? 'Failed to load dashboard'} onRetry={reload} />;

  const { stats, health, weeklyActive, lessonsTrend, aiTrend } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-soft">Platform overview and live health.</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={health.status} label="System healthy" />
          <span className="text-xs text-ink-faint">
            Checked {new Date(health.lastChecked).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={stats.totalUsers.toLocaleString()}
          delta="+12.4% this month"
          tone="brand"
          icon="👥"
        />
        <StatCard
          label="Active today"
          value={stats.activeToday.toLocaleString()}
          delta="+8.1% vs yesterday"
          tone="green"
          icon="🔥"
        />
        <StatCard
          label="Lessons completed"
          value={stats.lessonsCompleted.toLocaleString()}
          delta="+18.7% this month"
          tone="amber"
          icon="📚"
        />
        <StatCard
          label="AI requests"
          value={stats.aiRequests.toLocaleString()}
          delta={`${stats.aiFailedRequests} failed · ${Math.round((stats.aiFailedRequests / stats.aiRequests) * 100)}%`}
          tone="violet"
          icon="🤖"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Weekly active"
          value={stats.weeklyActive.toLocaleString()}
          delta={`${((stats.weeklyActive / stats.totalUsers) * 100).toFixed(0)}% of users`}
          icon="📈"
        />
        <StatCard
          label="Monthly active"
          value={stats.monthlyActive.toLocaleString()}
          tone="green"
          icon="🌙"
        />
        <StatCard
          label="Avg XP / user"
          value={stats.avgXpPerUser.toLocaleString()}
          delta="Daily goal: 50 XP"
          tone="amber"
          icon="⚡"
        />
        <StatCard
          label="Avg session"
          value={`${stats.avgSessionMinutes} min`}
          delta="18-day longest streak"
          icon="⏱"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Weekly active users" subtitle="Last 7 days" />
          <div className="p-6">
            <BarChart data={weeklyActive} color={chartColor(0)} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Lessons completed" subtitle="Last 7 days" />
          <div className="p-6">
            <BarChart data={lessonsTrend} color={chartColor(1)} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="AI request volume" subtitle="Last 7 days" />
          <div className="p-6">
            <LineChart data={aiTrend} color={chartColor(3)} gradientId="ai-trend" />
          </div>
        </Card>

        <Card>
          <CardHeader title="System status" />
          <div className="grid grid-cols-2 gap-3 p-6">
            {[
              { label: 'Database', value: health.db, ok: health.db === 'connected' },
              { label: 'API server', value: health.api, ok: health.api === 'up' },
              { label: 'Groq AI', value: health.groq, ok: health.groq === 'configured' },
              { label: 'Whisper', value: health.whisper, ok: health.whisper === 'configured' },
              { label: 'Storage', value: health.storage, ok: health.storage === 'up' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-surface-2 p-3">
                <p className="text-[11px] font-medium text-ink-faint">{s.label}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${s.ok ? 'bg-success-fill' : 'bg-danger-fill'}`}
                  />
                  <span
                    className={`text-sm font-medium capitalize ${s.ok ? 'text-success' : 'text-danger'}`}
                  >
                    {s.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
