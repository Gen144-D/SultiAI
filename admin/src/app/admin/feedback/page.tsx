'use client';

import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  inputCls,
} from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/export';
import { useState } from 'react';

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

  const items = (data ?? []).filter(
    (f) => f.user.name.toLowerCase().includes(search.toLowerCase()) || String(f.id).includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Feedback</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {data?.length ?? 0} submissions · {data?.filter((f) => !f.resolved).length ?? 0} open
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && data.length > 0 && (
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  data!.map((f) => ({
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
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand"
            >
              Export CSV
            </button>
          )}
          <input
            className={`${inputCls} max-w-xs`}
            placeholder="Search by user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState title="No feedback found" />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((f) => {
            const avg = ((f.functionality + f.usability + f.reliability) / 3).toFixed(1);
            return (
              <Card key={f.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={f.user.name} />
                    <div>
                      <p className="text-sm font-semibold text-ink">{f.user.name}</p>
                      <p className="text-xs text-ink-faint">
                        #{f.id} · {new Date(f.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={f.resolved ? 'resolved' : 'open'} />
                </div>

                <div className="mt-5 grid grid-cols-4 gap-3 text-center">
                  {[
                    { label: 'Functionality', value: f.functionality },
                    { label: 'Usability', value: f.usability },
                    { label: 'Reliability', value: f.reliability },
                    { label: 'Average', value: Number(avg) },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl bg-surface px-2 py-3">
                      <p className="text-lg font-extrabold text-brand-dark">
                        {typeof s.value === 'number' && !Number.isInteger(s.value)
                          ? s.value
                          : s.value}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-faint">{s.label}</p>
                    </div>
                  ))}
                </div>

                {f.comment && (
                  <p className="mt-4 rounded-xl bg-brand-light/50 px-4 py-3 text-sm italic leading-relaxed text-ink-soft">
                    “{f.comment}”
                  </p>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleResolve(f.id, f.resolved)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-semibold ${
                      f.resolved
                        ? 'border border-line text-ink-soft hover:border-brand'
                        : 'bg-success/10 text-success hover:bg-success hover:text-white'
                    }`}
                  >
                    {f.resolved ? 'Reopen' : 'Mark resolved'}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
