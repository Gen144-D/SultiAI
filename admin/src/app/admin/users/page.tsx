'use client';

import { useState } from 'react';
import type { AdminUser, UserDetail, UserFilters, UserRole } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import {
  Avatar,
  Card,
  CountPill,
  EmptyState,
  ErrorState,
  LoadingState,
  RoleBadge,
  StatusBadge,
  dangerSoftBtn,
  ghostBtn,
  inputCls,
  primaryBtn,
  selectCls,
  softBtn,
  successSoftBtn,
  tabStrip,
  tabStripBtn,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { ConfirmModal } from '@/components/ConfirmModal';
import { downloadCsv } from '@/lib/export';
import { errorMessage } from '@/lib/errors';

const PER_PAGE = 10;

const defaultFilters: UserFilters = {
  search: '',
  role: 'all',
  status: 'all',
  sort: 'recent',
};

type UsersTab = 'all' | 'pending';

export default function AdminUsersPage() {
  const toast = useToast();
  const [tab, setTab] = useState<UsersTab>('all');
  const [filters, setFilters] = useState<UserFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPending, setSelectedPending] = useState<Set<number>>(new Set());

  const { data, loading, error, reload } = useAsync(
    () => api.listUsers(filters, page, PER_PAGE),
    [filters, page]
  );

  // Only requested once the tab is opened, so the default view stays cheap.
  const pending = useAsync<{ items: AdminUser[] } | null>(
    () => (tab === 'pending' ? api.listPendingUsers() : Promise.resolve(null)),
    [tab]
  );
  const pendingUsers = pending.data?.items ?? [];

  const detail = useAsync<{ detail: UserDetail } | null>(
    () => (selectedId ? api.getUser(selectedId) : Promise.resolve(null)),
    [selectedId]
  );

  function updateFilters(patch: Partial<UserFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  async function handleRoleChange(id: number, role: UserRole) {
    await api.updateUserRole(id, role);
    toast.push('success', `Role updated to ${role}.`);
    reload();
  }

  async function handleBan(u: AdminUser, ban: boolean) {
    await api.updateUserStatus(u.id, ban ? 'banned' : 'approved');
    toast.push(
      ban ? 'error' : 'success',
      ban ? `${u.name} has been banned.` : `${u.name} has been reactivated.`
    );
    setBanTarget(null);
    reload();
  }

  async function handleApprove(u: AdminUser) {
    await api.approveUser(u.id);
    toast.push('success', `${u.name} has been approved.`);
    pending.reload();
  }

  async function handleReject(u: AdminUser) {
    await api.rejectUser(u.id);
    toast.push('info', `${u.name} has been rejected.`);
    pending.reload();
  }

  async function handleBulkApprove() {
    if (selectedPending.size === 0) return;
    await api.bulkApproveUsers(Array.from(selectedPending));
    toast.push('success', `${selectedPending.size} users approved.`);
    setSelectedPending(new Set());
    pending.reload();
  }

  function togglePendingSelection(id: number) {
    setSelectedPending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllPending() {
    setSelectedPending((prev) =>
      prev.size === pendingUsers.length ? new Set() : new Set(pendingUsers.map((u) => u.id))
    );
  }

  async function handleVerify(id: number, verified: boolean) {
    await api.verifyUser(id, verified);
    toast.push('success', verified ? 'Marked as verified.' : 'Verification removed.');
    reload();
    if (selectedId === id) detail.reload();
  }

  async function handleDelete(u: AdminUser) {
    try {
      await api.deleteUser(u.id);
      toast.push('success', `${u.name} has been deleted permanently.`);
      setDeleteTarget(null);
      if (selectedId === u.id) setSelectedId(null);
      reload();
    } catch (err: unknown) {
      toast.push('error', errorMessage(err, 'Failed to delete user.'));
    }
  }

  async function handleCreateUser(data: {
    fullname: string;
    email: string;
    password: string;
    role: UserRole;
  }) {
    try {
      await api.createUser(data);
      toast.push('success', `User "${data.fullname}" created successfully.`);
      setShowCreateModal(false);
      reload();
    } catch (err: unknown) {
      toast.push('error', errorMessage(err, 'Failed to create user.'));
    }
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PER_PAGE));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accounts"
        title="Users"
        description="Review accounts, roles, and access across the platform."
        meta={
          <p className="text-sm text-ink-soft">
            {data?.total.toLocaleString() ?? '0'} account{data?.total === 1 ? '' : 's'} matching the
            current filters
          </p>
        }
        actions={
          <>
            {data && data.items.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    data.items.map((u) => ({
                      id: u.id,
                      name: u.name,
                      email: u.email,
                      role: u.role,
                      status: u.status,
                      level: u.level,
                      xp: u.xp,
                      streak: u.streak,
                      lessons: u.lessons,
                      joinedAt: u.joinedAt,
                      lastActive: u.lastActive,
                    })),
                    `sultiai-users-${new Date().toISOString().split('T')[0]}.csv`
                  )
                }
                className={ghostBtn}
              >
                Export CSV
              </button>
            )}
            <button type="button" onClick={() => setShowCreateModal(true)} className={primaryBtn}>
              + Create user
            </button>
          </>
        }
      />

      <div className={tabStrip} role="tablist" aria-label="User views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'all'}
          onClick={() => setTab('all')}
          className={tabStripBtn(tab === 'all')}
        >
          All users
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'pending'}
          onClick={() => setTab('pending')}
          className={tabStripBtn(tab === 'pending')}
        >
          Pending approvals
          {pendingUsers.length > 0 && <CountPill value={pendingUsers.length} tone="caution" />}
        </button>
      </div>

      {tab === 'pending' &&
        (pending.loading ? (
          <LoadingState />
        ) : pending.error ? (
          <ErrorState message={pending.error} onRetry={pending.reload} />
        ) : pendingUsers.length === 0 ? (
          <Card>
            <EmptyState
              title="No pending approvals"
              description="Every account has been reviewed. New signups will appear here."
            />
          </Card>
        ) : (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedPending.size === pendingUsers.length && pendingUsers.length > 0}
                  onChange={toggleAllPending}
                  className="h-4 w-4 rounded border-line-strong"
                />
                <span className="text-ink-soft">
                  {selectedPending.size > 0
                    ? `${selectedPending.size} selected`
                    : `${pendingUsers.length} awaiting review`}
                </span>
              </label>
              {selectedPending.size > 0 && (
                <button type="button" onClick={handleBulkApprove} className={successSoftBtn}>
                  Approve {selectedPending.size}
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
                    <th scope="col" className="w-10 px-5 py-3.5">
                      <span className="sr-only">Select</span>
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      User
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Auth provider
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Joined
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-line transition-colors last:border-0 hover:bg-surface-2/50"
                    >
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedPending.has(u.id)}
                          onChange={() => togglePendingSelection(u.id)}
                          className="h-4 w-4 rounded border-line-strong"
                          aria-label={`Select ${u.name}`}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink">{u.name}</span>
                            <span className="block truncate text-xs text-ink-faint">{u.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-soft capitalize ring-1 ring-line-strong/30 ring-inset">
                          {u.authProvider ?? 'email'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink-soft">
                        {new Date(u.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(u)}
                            className={`${successSoftBtn} px-2.5 py-1.5 text-xs`}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(u)}
                            className={`${dangerSoftBtn} px-2.5 py-1.5 text-xs`}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

      {tab === 'all' && (
        <>
          <Card className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label htmlFor="user-search" className="sr-only">
                Search users
              </label>
              <input
                id="user-search"
                className={`${inputCls} lg:max-w-xs`}
                placeholder="Search name or email..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
              />
              <div className="flex flex-wrap gap-3">
                <label htmlFor="filter-role" className="sr-only">
                  Filter by role
                </label>
                <select
                  id="filter-role"
                  className={selectCls}
                  value={filters.role}
                  onChange={(e) => updateFilters({ role: e.target.value as UserFilters['role'] })}
                >
                  <option value="all">All roles</option>
                  <option value="admin">Admins</option>
                  <option value="moderator">Moderators</option>
                  <option value="user">Users</option>
                </select>
                <label htmlFor="filter-status" className="sr-only">
                  Filter by status
                </label>
                <select
                  id="filter-status"
                  className={selectCls}
                  value={filters.status}
                  onChange={(e) =>
                    updateFilters({ status: e.target.value as UserFilters['status'] })
                  }
                >
                  <option value="all">All statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="banned">Banned</option>
                  <option value="suspended">Suspended</option>
                </select>
                <label htmlFor="filter-sort" className="sr-only">
                  Sort users
                </label>
                <select
                  id="filter-sort"
                  className={selectCls}
                  value={filters.sort}
                  onChange={(e) => updateFilters({ sort: e.target.value as UserFilters['sort'] })}
                >
                  <option value="recent">Recently active</option>
                  <option value="xp">Highest XP</option>
                  <option value="level">Highest level</option>
                  <option value="joined">Newest</option>
                </select>
              </div>
            </div>
          </Card>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : !data || data.items.length === 0 ? (
            <Card>
              <EmptyState
                title="No users found"
                description="Try adjusting your search or filters."
              />
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
                      <th scope="col" className="px-5 py-3.5">
                        User
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Role
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Status
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        Level
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        XP
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        Streak
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        Lessons
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-line transition-colors last:border-0 hover:bg-surface-2/50"
                      >
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => setSelectedId(u.id)}
                            className="press flex items-center gap-3 rounded-control py-1 text-left"
                            aria-label={`View details for ${u.name}`}
                          >
                            <Avatar name={u.name} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-ink">
                                {u.name}
                                {u.nativeSpeaker && (
                                  <span title="Native speaker" className="ml-1">
                                    🇵🇭
                                  </span>
                                )}
                              </span>
                              <span className="block truncate text-xs text-ink-faint">
                                {u.email}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-ink">{u.level}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-ink-soft">
                          {(u.xp ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {(u.streak ?? 0) > 0 ? (
                            <span className="font-semibold text-warning tabular-nums">
                              {u.streak}d
                            </span>
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-ink-soft">
                          {u.lessons ?? 0}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <label htmlFor={`role-${u.id}`} className="sr-only">
                              Change role for {u.name}
                            </label>
                            <select
                              id={`role-${u.id}`}
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                              className="rounded-md border border-line bg-surface-2 px-2 py-1.5 text-xs text-ink outline-none focus:border-brand/60"
                            >
                              <option value="user">User</option>
                              <option value="moderator">Mod</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => setBanTarget(u)}
                              className={`px-2.5 py-1.5 text-xs font-semibold ${
                                u.status === 'banned' ? `${successSoftBtn}` : `${dangerSoftBtn}`
                              }`}
                            >
                              {u.status === 'banned' ? 'Unban' : 'Ban'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(u)}
                              className={`${dangerSoftBtn} px-2.5 py-1.5 text-xs`}
                              aria-label={`Delete ${u.name} permanently`}
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

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
                <p className="text-xs text-ink-faint">
                  Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, data.total)} of{' '}
                  {data.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className={`${softBtn} px-2.5 py-1.5 text-xs`}
                  >
                    Prev
                  </button>
                  <span className="text-xs tabular-nums text-ink-faint">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className={`${softBtn} px-2.5 py-1.5 text-xs`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {selectedId && (
        <UserDrawer
          loading={detail.loading}
          user={detail.data?.detail ?? null}
          onClose={() => setSelectedId(null)}
          onRoleChange={handleRoleChange}
          onVerify={handleVerify}
        />
      )}

      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateUser} />
      )}

      <ConfirmModal
        open={!!banTarget}
        title={banTarget?.status === 'banned' ? 'Reactivate user' : `Ban ${banTarget?.name}?`}
        message={
          banTarget?.status === 'banned'
            ? "This will restore the user's account and remove the ban."
            : 'The user will lose access to SultiAI. Their data is preserved so the account can be reactivated later.'
        }
        confirmLabel={banTarget?.status === 'banned' ? 'Reactivate' : 'Ban user'}
        onConfirm={() => banTarget && handleBan(banTarget, banTarget.status !== 'banned')}
        onClose={() => setBanTarget(null)}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name}?`}
        message="This action is permanent and cannot be undone. All user data, including progress, posts, and settings, will be deleted."
        confirmLabel="Delete permanently"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function CreateUserModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { fullname: string; email: string; password: string; role: UserRole }) => void;
}) {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ fullname?: string; email?: string; password?: string }>(
    {}
  );

  function validate(): boolean {
    const e: typeof errors = {};
    if (!fullname.trim()) e.fullname = 'Name is required.';
    else if (fullname.trim().length < 2) e.fullname = 'Name must be at least 2 characters.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    await onCreate({ fullname: fullname.trim(), email: email.trim(), password, role });
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[80] bg-overlay backdrop-blur-sm" onClick={onClose}>
      <aside
        className="anim-enter absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-line glass-3"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-title"
      >
        <div className="flex items-start justify-between border-b border-line p-6">
          <div>
            <h2 id="create-user-title" className="text-lg font-semibold tracking-tight text-ink">
              Create user
            </h2>
            <p className="mt-1 text-xs text-ink-faint">
              Add a new account to the platform directly.
            </p>
          </div>
          <button type="button" onClick={onClose} className="iconBtn" aria-label="Close">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label htmlFor="new-fullname" className="block text-sm font-medium text-ink">
              Full name
            </label>
            <input
              id="new-fullname"
              type="text"
              value={fullname}
              onChange={(e) => {
                setFullname(e.target.value);
                setErrors((p) => ({ ...p, fullname: undefined }));
              }}
              className={`${inputCls} mt-1.5 ${errors.fullname ? 'border-danger' : ''}`}
              placeholder="e.g. Juan Dela Cruz"
            />
            {errors.fullname && <p className="mt-1 text-xs text-danger">{errors.fullname}</p>}
          </div>

          <div>
            <label htmlFor="new-email" className="block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((p) => ({ ...p, email: undefined }));
              }}
              className={`${inputCls} mt-1.5 ${errors.email ? 'border-danger' : ''}`}
              placeholder="user@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((p) => ({ ...p, password: undefined }));
              }}
              className={`${inputCls} mt-1.5 ${errors.password ? 'border-danger' : ''}`}
              placeholder="Min 6 characters"
            />
            {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="new-role" className="block text-sm font-medium text-ink">
              Role
            </label>
            <select
              id="new-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className={`${selectCls} mt-1.5 w-full`}
            >
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className={ghostBtn}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? 'Creating...' : 'Create user'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function UserDrawer({
  loading,
  user,
  onClose,
  onRoleChange,
  onVerify,
}: {
  loading: boolean;
  user: UserDetail | null;
  onClose: () => void;
  onRoleChange: (id: number, role: UserRole) => void;
  onVerify: (id: number, verified: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] bg-overlay backdrop-blur-sm" onClick={onClose}>
      <aside
        className="anim-enter absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-line glass-3"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={user ? `Details for ${user.name}` : 'User details'}
      >
        <div className="flex items-start justify-between border-b border-line p-6">
          {user ? (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={user.name} className="h-12 w-12 text-base" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold tracking-tight text-ink">
                  {user.name}
                </h2>
                <p className="truncate text-xs text-ink-faint">{user.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <RoleBadge role={user.role} />
                  <StatusBadge status={user.status} />
                </div>
              </div>
            </div>
          ) : (
            <h2 className="text-lg font-semibold tracking-tight text-ink">User details</h2>
          )}
          <button type="button" onClick={onClose} className="iconBtn shrink-0" aria-label="Close">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : user ? (
          <div className="space-y-6 p-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Level', value: user.level ?? 'beginner' },
                { label: 'XP', value: (user.xp ?? 0).toLocaleString() },
                { label: 'Streak', value: `${user.streak ?? 0} days` },
                { label: 'Lessons', value: user.lessons ?? 0 },
                { label: 'Coins', value: (user.totalCoins ?? 0).toLocaleString() },
                { label: 'Daily goal', value: `${user.dailyGoal ?? 50} XP` },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-control bg-surface-2 p-3 ring-1 ring-line-strong/25 ring-inset"
                >
                  <p className="text-xs text-ink-faint">{s.label}</p>
                  <p className="mt-1 text-lg font-semibold text-ink">{s.value}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
                Badges
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {(user.badges ?? []).length === 0 ? (
                  <span className="text-xs text-ink-faint">No badges yet</span>
                ) : (
                  (user.badges ?? []).map((b) => (
                    <span
                      key={b}
                      className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-ink ring-1 ring-brand/25 ring-inset"
                    >
                      {b}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
                Weak areas
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {(user.weakAreas ?? []).length === 0 ? (
                  <span className="text-xs text-ink-faint">None identified</span>
                ) : (
                  (user.weakAreas ?? []).map((w) => (
                    <span
                      key={w}
                      className="rounded-md bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning ring-1 ring-warning/25 ring-inset"
                    >
                      {w}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-control border border-line p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Native speaker</p>
                <span className={user.nativeSpeaker ? 'text-success' : 'text-ink-faint'}>
                  {user.nativeSpeaker ? '✓ Verified' : 'Not marked'}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                <p className="text-sm font-semibold text-ink">Verified account</p>
                <button
                  type="button"
                  onClick={() => onVerify(user.id, !user.verified)}
                  className={
                    user.verified
                      ? `${dangerSoftBtn} px-3 py-1.5 text-xs`
                      : `${successSoftBtn} px-3 py-1.5 text-xs`
                  }
                >
                  {user.verified ? 'Remove verification' : 'Verify account'}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor={`drawer-role-${user.id}`}
                className="block text-[11px] font-semibold tracking-wider text-ink-faint uppercase"
              >
                Role
              </label>
              <select
                id={`drawer-role-${user.id}`}
                value={user.role}
                onChange={(e) => onRoleChange(user.id, e.target.value as UserRole)}
                className={`${selectCls} mt-2 w-full`}
              >
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <dl className="rounded-control bg-surface-2 p-4 text-xs text-ink-soft ring-1 ring-line-strong/25 ring-inset">
              <div className="flex justify-between gap-3">
                <dt>Joined</dt>
                <dd className="text-ink">{new Date(user.joinedAt).toLocaleDateString()}</dd>
              </div>
              <div className="mt-1.5 flex justify-between gap-3">
                <dt>Last active</dt>
                <dd className="text-ink">{new Date(user.lastActive).toLocaleString()}</dd>
              </div>
              <div className="mt-1.5 flex justify-between gap-3">
                <dt>Favorite category</dt>
                <dd className="text-ink">{user.favoriteCategory ?? 'general'}</dd>
              </div>
              <div className="mt-1.5 flex justify-between gap-3">
                <dt>Feedback submitted</dt>
                <dd className="text-ink">{user.feedbackCount ?? 0}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <EmptyState title="User not found" />
        )}
      </aside>
    </div>
  );
}
