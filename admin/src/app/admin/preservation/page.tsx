'use client';

import { PageHeader } from '@/components/PageHeader';
import { Stagger, StaggerItem } from '@/components/motion';
import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  dangerSoftBtn,
  ghostBtn,
  successSoftBtn,
} from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/export';
import type { PreservedWord } from '@/types';

export default function AdminPreservationPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.listPreserved(), []);

  async function handleVerify(word: PreservedWord, status: PreservedWord['status']) {
    await api.verifyPreserved(word.id, status);
    toast.push('success', `"${word.word}" marked as ${status}.`);
    reload();
  }

  if (loading) return <LoadingState label="Loading Living Lexicon..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const words = data ?? [];
  const pending = words.filter((w) => w.status === 'pending');

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Language preservation"
        title="Preservation"
        description="Moderating the Living Lexicon — community-submitted words and their dialects."
        meta={
          <p className="text-sm text-ink-soft">
            {words.length} word{words.length === 1 ? '' : 's'} recorded
            {pending.length > 0 && (
              <span className="text-warning"> · {pending.length} awaiting review</span>
            )}
          </p>
        }
        actions={
          words.length > 0 && (
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  words.map((w) => ({
                    id: w.id,
                    word: w.word,
                    dialect: w.dialect,
                    meaning: w.meaning,
                    variations: w.variations.join('; '),
                    submittedBy: w.submittedBy.name,
                    status: w.status,
                    createdAt: w.createdAt,
                  })),
                  `sultiai-preserved-words-${new Date().toISOString().split('T')[0]}.csv`
                )
              }
              className={ghostBtn}
            >
              Export CSV
            </button>
          )
        }
      />

      {words.length === 0 ? (
        <Card>
          <EmptyState
            title="No preserved words"
            description="Community submissions will appear here for review."
          />
        </Card>
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" step={0.05}>
          {words.map((w, i) => (
            <StaggerItem key={w.id} index={i}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold tracking-tight text-ink">{w.word}</p>
                    <p className="text-xs text-ink-faint">{w.dialect}</p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{w.meaning}</p>

                {w.variations.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {w.variations.map((v) => (
                      <span
                        key={v}
                        className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-ink-faint ring-1 ring-line-strong/25 ring-inset"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
                  <Avatar name={w.submittedBy.name} className="h-6 w-6 text-[8px]" />
                  <span className="truncate text-xs text-ink-faint">
                    Submitted by {w.submittedBy.name}
                  </span>
                </div>

                {w.status === 'pending' && (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleVerify(w, 'approved')}
                      className={`${successSoftBtn} flex-1 py-1.5 text-xs`}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerify(w, 'rejected')}
                      className={`${dangerSoftBtn} flex-1 py-1.5 text-xs`}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
