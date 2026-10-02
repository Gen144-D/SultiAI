'use client';

import Link from 'next/link';
import { BarChart, LineChart, chartColor } from '@/components/ChartCard';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/ProgressRing';
import { StatCard } from '@/components/StatCard';
import { Stagger, StaggerItem } from '@/components/motion';
import { SultiOrb } from '@/components/sulti/SultiOrb';
import type { SultiState } from '@/components/sulti/SultiOrb';
import {
  Card,
  CardHeader,
  ErrorState,
  LoadingState,
  SectionLabel,
  StatusBadge,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { OverviewStats, SystemHealth } from '@/types';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

type Service = { label: string; value: string; ok: boolean };

function services(health: SystemHealth): Service[] {
  return [
    { label: 'Database', value: health.db, ok: health.db === 'connected' },
    { label: 'API server', value: health.api, ok: health.api === 'up' },
    { label: 'Groq AI', value: health.groq, ok: health.groq === 'configured' },
    { label: 'Whisper speech', value: health.whisper, ok: health.whisper === 'configured' },
    { label: 'Storage', value: health.storage, ok: health.storage === 'up' },
  ];
}

/**
 * Derives the single most useful next action from real platform state rather
 * than presenting a fixed pitch. Falls back to the AI console when everything
 * is nominal, so the hero always points somewhere.
 */
function brief(health: SystemHealth, stats: OverviewStats) {
  const broken = services(health).filter((s) => !s.ok);

  if (health.status === 'down' || broken.length >= 3) {
    return {
      state: 'offline' as SultiState,
      headline: `${broken.length} service${broken.length === 1 ? '' : 's'} offline`,
      body: 'Core platform services are not responding. Learner sessions will fail until this is resolved.',
      action: { href: '/admin/settings', label: 'Open settings' },
    };
  }

  if (health.status === 'degraded' || broken.length > 0) {
    return {
      state: 'thinking' as SultiState,
      headline: `${broken.length} service${broken.length === 1 ? '' : 's'} need attention`,
      body: `${broken.map((s) => s.label).join(', ')} ${
        broken.length === 1 ? 'is' : 'are'
      } not reporting healthy. Everything else is operating normally.`,
      action: { href: '/admin/ai', label: 'Review AI services' },
    };
  }

  if (stats.communityReports > 0) {
    return {
      state: 'listening' as SultiState,
      headline: `${stats.communityReports} community report${
        stats.communityReports === 1 ? '' : 's'
      } waiting`,
      body: 'Learners have flagged posts for moderation. Triage the queue before the backlog grows.',
      action: { href: '/admin/community', label: 'Open reports' },
    };
  }

  return {
    state: 'idle' as SultiState,
    headline: 'All systems nominal',
    body: 'Every service is reporting healthy and the community queue is clear. Platform activity is steady.',
    action: { href: '/admin/ai', label: 'Review AI usage' },
  };
}

export default function AdminDashboardPage() {
  const { data, loading, error, reload } = useAsync(() => api.getOverview(), []);
  const session = useSession();

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error || !data)
    return <ErrorState message={error ?? 'Failed to load dashboard'} onRetry={reload} />;

  const { stats, health, weeklyActive, lessonsTrend, aiTrend } = data;
  const attention = brief(health, stats);
  const failureRate = pct(stats.aiFailedRequests, stats.aiRequests);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title={session ? `${greeting()}, ${session.name.split(' ')[0]}` : greeting()}
        description="Platform health, learner activity, and AI traffic at a glance."
        meta={
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge status={health.status} label={`Platform ${health.status}`} />
            <span className="text-xs text-ink-faint">
              Checked {new Date(health.lastChecked).toLocaleTimeString()}
            </span>
          </div>
        }
      />

      {/* The one thing to act on, given the most prominent surface on the page. */}
      <Card level={3} className="rounded-hero">
        <div className="flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:gap-9">
          <SultiOrb state={attention.state} size="lg" showLabel={false} className="shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-brand-ink uppercase">
              Right now
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              {attention.headline}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{attention.body}</p>
          </div>

          <Link
            href={attention.action.href}
            className="press shrink-0 self-start rounded-control bg-brand-solid px-4 py-2.5 text-sm font-semibold text-on-brand shadow-lg shadow-brand/20 hover:bg-brand-hover lg:self-center"
          >
            {attention.action.label} →
          </Link>
        </div>

        {/* Service strip: the underlying evidence for the headline above. */}
        <div className="grid grid-cols-2 gap-px border-t border-line bg-line/40 sm:grid-cols-3 lg:grid-cols-5">
          {services(health).map((s) => (
            <div key={s.label} className="bg-bg-raise/40 px-4 py-3.5">
              <p className="text-[11px] font-medium text-ink-faint">{s.label}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    s.ok ? 'bg-success-fill' : 'bg-danger-fill'
                  } ${s.ok ? '' : 'anim-breathe'}`}
                />
                <span
                  className={`truncate text-xs font-semibold capitalize ${
                    s.ok ? 'text-success' : 'text-danger'
                  }`}
                >
                  {s.value.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Primary figures */}
      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" step={0.07}>
        <StaggerItem index={0}>
          <StatCard
            label="Total users"
            value={stats.totalUsers.toLocaleString()}
            delta={`${stats.activeToday.toLocaleString()} active today`}
            tone="brand"
            icon="◎"
          />
        </StaggerItem>
        <StaggerItem index={1}>
          <StatCard
            label="Active this week"
            value={stats.weeklyActive.toLocaleString()}
            delta={`${pct(stats.weeklyActive, stats.totalUsers)}% of all users`}
            tone="green"
            icon="◷"
          />
        </StaggerItem>
        <StaggerItem index={2}>
          <StatCard
            label="Lessons completed"
            value={stats.lessonsCompleted.toLocaleString()}
            delta={`${pct(stats.weeklyActive, stats.totalUsers)}% weekly return rate`}
            tone="amber"
            icon="▤"
          />
        </StaggerItem>
        <StaggerItem index={3}>
          <StatCard
            label="AI requests"
            value={stats.aiRequests.toLocaleString()}
            delta={
              failureRate > 0
                ? `${stats.aiFailedRequests.toLocaleString()} failed · ${failureRate}%`
                : 'No failures recorded'
            }
            tone={failureRate > 5 ? 'red' : 'violet'}
            icon="✦"
          />
        </StaggerItem>
      </Stagger>

      {/* Trends */}
      <section className="space-y-4">
        <SectionLabel>Activity</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <CardHeader title="Weekly active users" subtitle="Last 7 days" />
            <div className="pt-6">
              <BarChart data={weeklyActive} color={chartColor(0)} />
            </div>
          </Card>
          <Card className="p-6">
            <CardHeader title="Lessons completed" subtitle="Last 7 days" />
            <div className="pt-6">
              <BarChart data={lessonsTrend} color={chartColor(1)} />
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <CardHeader title="AI request volume" subtitle="Last 7 days" />
          <div className="pt-6">
            <LineChart data={aiTrend} color={chartColor(3)} gradientId="ai-trend" />
          </div>
        </Card>
      </section>

      {/* Supporting figures */}
      <section className="space-y-4">
        <SectionLabel>Learning health</SectionLabel>
        <Stagger className="grid gap-4 lg:grid-cols-3" step={0.07}>
          <StaggerItem index={0}>
            <Card className="p-5">
              <p className="text-xs font-medium text-ink-faint">Monthly active</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-ink">
                {stats.monthlyActive.toLocaleString()}
              </p>
              <div className="mt-4">
                <ProgressBar
                  value={pct(stats.monthlyActive, stats.totalUsers)}
                  label="Monthly active as a share of all users"
                />
              </div>
              <p className="mt-2 text-xs text-ink-faint">
                {pct(stats.monthlyActive, stats.totalUsers)}% of registered users
              </p>
            </Card>
          </StaggerItem>

          <StaggerItem index={1}>
            <Card className="p-5">
              <p className="text-xs font-medium text-ink-faint">Average XP per user</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-ink">
                {stats.avgXpPerUser.toLocaleString()}
              </p>
              <p className="mt-4 text-xs text-ink-faint">Lifetime average across the platform</p>
            </Card>
          </StaggerItem>

          <StaggerItem index={2}>
            <Card className="p-5">
              <p className="text-xs font-medium text-ink-faint">Average session</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-ink">
                {stats.avgSessionMinutes} min
              </p>
              <p className="mt-4 text-xs text-ink-faint">
                Longest streak on record: {stats.streakDays} days
              </p>
            </Card>
          </StaggerItem>
        </Stagger>
      </section>
    </div>
  );
}
