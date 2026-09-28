'use client';

import { useState } from 'react';
import type { CommunityPost, CommunityReport } from '@/types';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  dangerSoftBtn,
  ghostBtn,
  softBtn,
  successSoftBtn,
} from '@/components/ui';
import { downloadCsv } from '@/lib/export';

type Tab = 'posts' | 'reports';

export default function AdminCommunityPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('posts');
  const [deleteTarget, setDeleteTarget] = useState<CommunityPost | null>(null);

  const posts = useAsync(() => api.listPosts(), []);
  const reports = useAsync(() => api.listReports(), []);

  async function handleFeature(p: CommunityPost) {
    const updated = await api.toggleFeatured(p.id);
    toast.push('success', updated.featured ? 'Post featured.' : 'Post unfeatured.');
    posts.reload();
  }

  async function handleHide(p: CommunityPost) {
    const updated = await api.setPostHidden(p.id, !p.hidden);
    toast.push(
      'success',
      updated.hidden ? 'Post hidden from community.' : 'Post made visible again.'
    );
    posts.reload();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await api.deletePost(deleteTarget.id);
    toast.push('success', 'Post removed.');
    setDeleteTarget(null);
    posts.reload();
    reports.reload();
  }

  async function handleReportStatus(r: CommunityReport, status: CommunityReport['status']) {
    await api.updateReportStatus(r.id, status);
    toast.push('success', `Report #${r.id} marked ${status}.`);
    reports.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Community</h1>
          <p className="mt-1 text-sm text-ink-soft">Moderate posts, comments, and user reports.</p>
        </div>
        {posts.data && posts.data.length > 0 && (
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                posts.data!.map((p) => ({
                  id: p.id,
                  title: p.title,
                  author: p.author.name,
                  category: p.category,
                  likes: p.likes,
                  comments: p.comments,
                  reports: p.reports,
                  featured: p.featured,
                  hidden: p.hidden,
                  createdAt: p.createdAt,
                })),
                `sultiai-community-posts-${new Date().toISOString().split('T')[0]}.csv`
              )
            }
            className={ghostBtn}
          >
            Export Posts
          </button>
        )}
      </div>

      <div className="inline-flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
        {(['posts', 'reports'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`inline-flex items-center rounded-md px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t}
            {t === 'reports' && reports.data && (
              <span className="ml-1.5 rounded-full bg-danger-soft px-1.5 text-[10px] font-semibold tabular-nums text-danger">
                {reports.data.filter((r) => r.status === 'open').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'posts' ? (
        <PostsTable
          loading={posts.loading}
          error={posts.error}
          data={posts.data}
          onReload={posts.reload}
          onFeature={handleFeature}
          onHide={handleHide}
          onDelete={setDeleteTarget}
        />
      ) : (
        <ReportsTable
          loading={reports.loading}
          error={reports.error}
          data={reports.data}
          onReload={reports.reload}
          onStatus={handleReportStatus}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.title}"?`}
        message="This permanently removes the post and its comments. This cannot be undone."
        confirmLabel="Delete post"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function PostsTable({
  loading,
  error,
  data,
  onReload,
  onFeature,
  onHide,
  onDelete,
}: {
  loading: boolean;
  error: string | null;
  data: CommunityPost[] | null;
  onReload: () => void;
  onFeature: (p: CommunityPost) => void;
  onHide: (p: CommunityPost) => void;
  onDelete: (p: CommunityPost) => void;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onReload} />;
  if (!data || data.length === 0) {
    return (
      <Card>
        <EmptyState title="No posts" description="Community posts will appear here." />
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <th className="px-5 py-3">Post</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Engagement</th>
              <th className="px-5 py-3">Reports</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-line transition-colors last:border-0 ${p.hidden ? 'bg-danger-soft/40' : 'hover:bg-surface-2/60'}`}
              >
                <td className="px-5 py-3.5">
                  <p className="max-w-[260px] truncate font-medium text-ink">
                    {p.featured && <span className="mr-1 text-warning">★</span>}
                    {p.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-faint">
                    <Avatar name={p.author.name} className="h-4 w-4 text-[8px]" />
                    {p.author.name} · {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-5 py-3.5 text-xs text-ink-soft">{p.category}</td>
                <td className="px-5 py-3.5 text-xs tabular-nums text-ink-soft">
                  <span aria-hidden>♥</span> {p.likes} · <span aria-hidden>◍</span> {p.comments}
                </td>
                <td className="px-5 py-3.5">
                  {p.reports > 0 ? (
                    <span className="rounded-md bg-danger-soft px-2 py-0.5 text-[11px] font-semibold tabular-nums text-danger">
                      {p.reports}
                    </span>
                  ) : (
                    <span className="text-xs tabular-nums text-ink-faint">0</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-col items-start gap-1">
                    {p.featured && <StatusBadge status="verified" label="Featured" />}
                    {p.hidden && <StatusBadge status="banned" label="Hidden" />}
                    {!p.featured && !p.hidden && <StatusBadge status="visible" label="Visible" />}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onFeature(p)}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        p.featured
                          ? 'bg-surface-2 text-ink-soft hover:bg-line'
                          : 'bg-warning-soft text-warning hover:bg-warning-fill hover:text-on-brand'
                      }`}
                    >
                      {p.featured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onHide(p)}
                      className={`${softBtn} px-2.5 py-1.5 text-xs`}
                    >
                      {p.hidden ? 'Show' : 'Hide'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(p)}
                      className={`${dangerSoftBtn} px-2.5 py-1.5 text-xs`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ReportsTable({
  loading,
  error,
  data,
  onReload,
  onStatus,
}: {
  loading: boolean;
  error: string | null;
  data: CommunityReport[] | null;
  onReload: () => void;
  onStatus: (r: CommunityReport, status: CommunityReport['status']) => void;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onReload} />;
  if (!data || data.length === 0) {
    return (
      <Card>
        <EmptyState title="No reports" description="User reports will appear here." />
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Post</th>
              <th className="px-5 py-3">Reported by</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr
                key={r.id}
                className="border-b border-line transition-colors last:border-0 hover:bg-surface-2/60"
              >
                <td className="px-5 py-3.5 font-medium tabular-nums text-ink">#{r.id}</td>
                <td className="px-5 py-3.5 text-xs text-ink-soft">Post #{r.postId}</td>
                <td className="px-5 py-3.5 text-xs text-ink-soft">{r.reportedBy.name}</td>
                <td className="px-5 py-3.5 text-xs text-ink-soft">{r.reason}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={r.status === 'resolved'}
                      onClick={() => onStatus(r, 'resolved')}
                      className={`${successSoftBtn} px-2.5 py-1.5 text-xs`}
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      disabled={r.status === 'dismissed'}
                      onClick={() => onStatus(r, 'dismissed')}
                      className={`${softBtn} px-2.5 py-1.5 text-xs`}
                    >
                      Dismiss
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
