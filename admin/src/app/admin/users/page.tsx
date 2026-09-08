'use client';

import { useState, useEffect } from 'react';
import type { AdminUser, UserDetail, UserFilters, UserRole } from '@/types';
import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  RoleBadge,
  StatusBadge,
  inputCls,
  selectCls,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { ConfirmModal } from '@/components/ConfirmModal';
import { downloadCsv } from '@/lib/export';

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

  // Pending users
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [selectedPending, setSelectedPending] = useState<Set<number>>(new Set());

  const { data, loading, error, reload } = useAsync(
    () => api.listUsers(filters, page, PER_PAGE),
    [filters, page]
  );

  const detail = useAsync<{ detail: UserDetail } | null>(
    () => (selectedId ? api.getUser(selectedId) : Promise.resolve(null)),
    [selectedId]
  );

  async function loadPendingUsers() {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const res = await api.listPendingUsers();
      setPendingUsers(res.items || []);
    } catch (err: any) {
      setPendingError(err?.message || 'Failed to load pending users');
    } finally {
      setPendingLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'pending') loadPendingUsers();
  }, [tab]);

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
    loadPendingUsers();
  }

  async function handleReject(u: AdminUser) {
    await api.rejectUser(u.id);
    toast.push('info', `${u.name} has been rejected.`);
    loadPendingUsers();
  }

  async function handleBulkApprove() {
    if (selectedPending.size === 0) return;
    await api.bulkApproveUsers(Array.from(selectedPending));
    toast.push('success', `${selectedPending.size} users approved.`);
    setSelectedPending(new Set());
    loadPendingUsers();
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
    if (selectedPending.size === pendingUsers.length) {
      setSelectedPending(new Set());
    } else {
      setSelectedPending(new Set(pendingUsers.map((u) => u.id)));
    }
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
    } catch (err: any) {
      toast.push('error', err?.message || 'Failed to delete user.');
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
    } catch (err: any) {
      toast.push('error', err?.message || 'Failed to create user.');
    }
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PER_PAGE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Users</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {data?.total.toLocaleString() ?? '0'} accounts total
          </p>
        </div>
        <div className="flex items-center gap-3">
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
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand"
            >
              Export CSV
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-gradient-to-r from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            + Create User
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'all' ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
          }`}
        >
          All Users
        </button>
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'pending' ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
          }`}
        >
          Pending Approvals
          {pendingUsers.length > 0 && (
            <span className="ml-2 rounded-full bg-warning px-2 py-0.5 text-xs text-white">
              {pendingUsers.length}
            </span>
          )}
        </button>
      </div>

      {/* Pending Approvals Tab */}
      {tab === 'pending' && (
        <>
          {pendingLoading ? (
            <LoadingState />
          ) : pendingError ? (
            <ErrorState message={pendingError} onRetry={loadPendingUsers} />
          ) : pendingUsers.length === 0 ? (
            <Card>
              <EmptyState
                title="No pending approvals"
                description="All user accounts have been reviewed."
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPending.size === pendingUsers.length}
                    onChange={toggleAllPending}
                    className="h-4 w-4 rounded border-line"
                  />
                  <span className="text-ink-soft">
                    {selectedPending.size > 0
                      ? `${selectedPending.size} selected`
                      : `${pendingUsers.length} pending`}
                  </span>
                </label>
                {selectedPending.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkApprove}
                    className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Approve Selected ({selectedPending.size})
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-faint">
                      <th className="w-10 px-5 py-3.5"></th>
                      <th className="px-5 py-3.5 font-semibold">User</th>
                      <th className="px-5 py-3.5 font-semibold">Auth Provider</th>
                      <th className="px-5 py-3.5 font-semibold">Joined</th>
                      <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-line transition-colors last:border-0 hover:bg-surface/60"
                      >
                        <td className="px-5 py-3.5">
                          <input
                            type="checkbox"
                            checked={selectedPending.has(u.id)}
                            onChange={() => togglePendingSelection(u.id)}
                            className="h-4 w-4 rounded border-line"
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-ink">
                                {u.name}
                              </span>
                              <span className="block truncate text-xs text-ink-faint">
                                {u.email}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft capitalize">
                            {(u as any).authProvider || 'email'}
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
                              className="rounded-lg bg-success/10 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success hover:text-white"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(u)}
                              className="rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger hover:text-white"
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
          )}
        </>
      )}

      {/* All Users Tab */}
      {tab === 'all' && (
        <>
          <Card className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <input
                className={`${inputCls} lg:max-w-xs`}
                placeholder="Search name or email..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
              />
              <div className="flex flex-wrap gap-3">
                <select
                  className={selectCls}
                  value={filters.role}
                  onChange={(e) => updateFilters({ role: e.target.value as UserFilters['role'] })}
                >
                  <option value="all">All roles</option>
                  <option value="admin">Admins</option>
                  <option value="moderator">Moderators</option>
                  <option value="user">Users</option>
                </select>
                <select
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
                <select
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
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-faint">
                      <th className="px-5 py-3.5 font-semibold">User</th>
                      <th className="px-5 py-3.5 font-semibold">Role</th>
                      <th className="px-5 py-3.5 font-semibold">Status</th>
                      <th className="px-5 py-3.5 font-semibold">Level</th>
                      <th className="px-5 py-3.5 font-semibold">XP</th>
                      <th className="px-5 py-3.5 font-semibold">Streak</th>
                      <th className="px-5 py-3.5 font-semibold">Lessons</th>
                      <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-line transition-colors last:border-0 hover:bg-surface/60"
                      >
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => setSelectedId(u.id)}
                            className="flex items-center gap-3 text-left"
                          >
                            <Avatar name={u.name} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-ink">
                                {u.name} {u.nativeSpeaker && <span title="Native speaker">🇵🇭</span>}
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
                        <td className="px-5 py-3.5 font-semibold text-ink">{u.level}</td>
                        <td className="px-5 py-3.5 tabular-nums text-ink-soft">
                          {(u.xp ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5">
                          {(u.streak ?? 0) > 0 && (
                            <span className="font-semibold text-accent">🔥 {u.streak}d</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-ink-soft">{u.lessons ?? 0}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                              className="rounded-lg border border-line px-2 py-1.5 text-xs text-ink"
                              title="Change role"
                            >
                              <option value="user">User</option>
                              <option value="moderator">Mod</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => setBanTarget(u)}
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                                u.status === 'banned'
                                  ? 'bg-success/10 text-success hover:bg-success hover:text-white'
                                  : 'bg-danger/10 text-danger hover:bg-danger hover:text-white'
                              }`}
                            >
                              {u.status === 'banned' ? 'Unban' : 'Ban'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(u)}
                              className="rounded-lg bg-danger/10 px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger hover:text-white"
                              title="Delete user permanently"
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-line px-5 py-3.5">
                <p className="text-xs text-ink-faint">
                  Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, data.total)} of{' '}
                  {data.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-ink-faint">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40"
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
            : 'The user will lose access to SultiAI. Their data remains preserved for reactivation.'
        }
        confirmLabel={banTarget?.status === 'banned' ? 'Reactivate' : 'Ban user'}
        onConfirm={() => banTarget && handleBan(banTarget, banTarget.status !== 'banned')}
        onClose={() => setBanTarget(null)}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name}?`}
        message="This action is permanent and cannot be undone. All user data, including progress, posts, and settings, will be permanently deleted."
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
    <div className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line p-6">
          <div>
            <h2 className="text-lg font-bold text-ink">Create User</h2>
            <p className="mt-1 text-xs text-ink-faint">Add a new user account to the platform.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-faint hover:text-ink"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
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
            <label className="block text-xs font-bold uppercase tracking-wide text-ink-faint">
              Full name
            </label>
            <input
              type="text"
              value={fullname}
              onChange={(e) => {
                setFullname(e.target.value);
                setErrors((p) => ({ ...p, fullname: undefined }));
              }}
              className={`${inputCls} mt-2 ${errors.fullname ? 'border-danger' : ''}`}
              placeholder="e.g. Juan Dela Cruz"
            />
            {errors.fullname && <p className="mt-1 text-xs text-danger">{errors.fullname}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-ink-faint">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((p) => ({ ...p, email: undefined }));
              }}
              className={`${inputCls} mt-2 ${errors.email ? 'border-danger' : ''}`}
              placeholder="user@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-ink-faint">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((p) => ({ ...p, password: undefined }));
              }}
              className={`${inputCls} mt-2 ${errors.password ? 'border-danger' : ''}`}
              placeholder="Min 6 characters"
            />
            {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-ink-faint">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className={`${selectCls} mt-2`}
            >
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Creating...' : 'Create User'}
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
    <div className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <LoadingState />
        ) : user ? (
          <>
            <div className="flex items-start justify-between border-b border-line p-6">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} className="h-12 w-12 text-base" />
                <div>
                  <h2 className="text-lg font-bold text-ink">{user.name}</h2>
                  <p className="text-xs text-ink-faint">{user.email}</p>
                  <div className="mt-1.5 flex gap-2">
                    <RoleBadge role={user.role} />
                    <StatusBadge status={user.status} />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-ink-faint hover:text-ink"
                aria-label="Close"
              >
                <svg
                  width="20"
                  height="20"
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
                  <div key={s.label} className="rounded-2xl border border-line bg-surface p-4">
                    <p className="text-xs text-ink-faint">{s.label}</p>
                    <p className="mt-1 text-lg font-bold text-ink">{s.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">Badges</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(user.badges ?? []).length === 0 && (
                    <span className="text-xs text-ink-faint">No badges yet</span>
                  )}
                  {(user.badges ?? []).map((b) => (
                    <span
                      key={b}
                      className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                  Weak areas
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(user.weakAreas ?? []).length === 0 && (
                    <span className="text-xs text-ink-faint">None identified</span>
                  )}
                  {(user.weakAreas ?? []).map((w) => (
                    <span
                      key={w}
                      className="rounded-full bg-accent-light px-3 py-1 text-xs font-semibold text-[#b45309]"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-line p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">Native speaker</p>
                  <span className={user.nativeSpeaker ? 'text-success' : 'text-ink-faint'}>
                    {user.nativeSpeaker ? '✓ Verified' : 'Not marked'}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">Verified account</p>
                  <button
                    type="button"
                    onClick={() => onVerify(user.id, !user.verified)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      user.verified ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                    }`}
                  >
                    {user.verified ? 'Remove verification' : 'Verify account'}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-faint">Role</h3>
                <select
                  value={user.role}
                  onChange={(e) => onRoleChange(user.id, e.target.value as UserRole)}
                  className="mt-2 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink"
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="rounded-2xl bg-surface p-4 text-xs text-ink-soft">
                <p>Joined: {new Date(user.joinedAt).toLocaleDateString()}</p>
                <p className="mt-1">Last active: {new Date(user.lastActive).toLocaleString()}</p>
                <p className="mt-1">Favorite category: {user.favoriteCategory ?? 'general'}</p>
                <p className="mt-1">Feedback submitted: {user.feedbackCount ?? 0}</p>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="User not found" />
        )}
      </aside>
    </div>
  );
}
