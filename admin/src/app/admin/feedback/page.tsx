'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Stagger, StaggerItem } from '@/components/motion';
import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  ghostBtn,
  inputCls,
  successSoftBtn,
} from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/export';

const RATING_LABELS = ['Functionality', 'Usability', 'Reliability'] as const;

export default function AdminFeedbackPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.listFeedback(), []);
  const [search, setSearch] = useState('');

  async function handleResolve(id: number, resolved: boolean) {
    await api.resolveFeedback(id);
    toast.push(
      'success',
      resolved ? 'Feedback marked as unresolved.' : 'Feedback marked as resolved.'
    );
    reload();
  }

  if (loading) return <LoadingState label="Loading feedback..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const all = data ?? [];
  const items = all.filter(
    (f) => f.user.name.toLowerCase().includes(search.toLowerCase()) || String(f.id).includes(search)
  );
  const openCount = all.filter((f) => !f.resolved).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Learner voice"
        title="Feedback"
        description="Ratings and comments submitted from the app."
        meta={
          <p className="text-sm text-ink-soft">
            {all.length} submission{all.length === 1 ? '' : 's'}
            {openCount > 0 && <span className="text-warning"> · {openCount} still open</span>}
          </p>
        }
        actions={
          <>
            {all.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    all.map((f) => ({
                      id: f.id,
                      user: f.user.name,
                      email: f.user.email,
                      functionality: f.functionality,
                      usability: f.usability,
                      reliability: f.reliability,
                      comment: f.comment ?? '',
                      resolved: f.resolved,
                      createdAt: f.createdAt,
                    })),
                    `sultiai-feedback-${new Date().toISOString().split('T')[0]}.csv`
                  )
                }
                className={ghostBtn}
              >
                Export CSV
              </button>
            )}
            <label htmlFor="feedback-search" className="sr-only">
              Search feedback
            </label>
            <input
              id="feedback-search"
              className={`${inputCls} w-full sm:w-64`}
              placeholder="Search by user or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </>
        }
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            title="No feedback found"
            description={search ? 'Try a different name or ID.' : 'Nothing has been submitted yet.'}
          />
        </Card>
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2" step={0.05}>
          {items.map((f, i) => {
            const scores = [f.functionality, f.usability, f.reliability];
            const avg = scores.reduce((sum, n) => sum + n, 0) / scores.length;

            return (
              <StaggerItem key={f.id} index={i}>
                <Card className="lift flex h-full flex-col p-5 hover:border-brand/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={f.user.name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{f.user.name}</p>
                        <p className="text-xs text-ink-faint">
                          #{f.id} · {new Date(f.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={f.resolved ? 'resolved' : 'open'} />
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                    {RATING_LABELS.map((label, index) => (
                      <div
                        key={label}
                        className="rounded-control bg-surface-2 px-2 py-2.5 ring-1 ring-line-strong/25 ring-inset"
                      >
                        <p className="text-base font-semibold tabular-nums text-ink">
                          {scores[index]}
                        </p>
                        <p className="mt-0.5 text-[10px] text-ink-faint">{label}</p>
                      </div>
                    ))}
                    <div className="rounded-control bg-brand-soft px-2 py-2.5 ring-1 ring-brand/20 ring-inset">
                      <p className="text-base font-semibold tabular-nums text-brand-ink">
                        {avg.toFixed(1)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-brand-ink/70">Average</p>
                    </div>
                  </div>

                  {f.comment ? (
                    <blockquote className="mt-4 flex-1 border-l-2 border-brand/50 pl-3.5 text-sm leading-relaxed text-ink-soft">
                      {f.comment}
                    </blockquote>
                  ) : (
                    <p className="mt-4 flex-1 text-sm text-ink-faint">No comment left.</p>
                  )}

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleResolve(f.id, f.resolved)}
                      className={
                        f.resolved
                          ? `${ghostBtn} px-3 py-1.5 text-xs`
                          : `${successSoftBtn} px-3 py-1.5 text-xs`
                      }
                    >
                      {f.resolved ? 'Reopen' : 'Mark resolved'}
                    </button>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
