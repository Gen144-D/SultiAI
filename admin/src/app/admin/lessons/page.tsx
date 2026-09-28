'use client';

import { useState } from 'react';
import type { LessonModule, ModuleDifficulty } from '@/types';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  dangerSoftBtn,
  ghostBtn,
  inputCls,
  primaryBtn,
  selectCls,
  softBtn,
} from '@/components/ui';
import { downloadCsv } from '@/lib/export';

const difficultyTone: Record<ModuleDifficulty, string> = {
  beginner: 'text-success bg-success-soft',
  intermediate: 'text-brand bg-brand-soft',
  advanced: 'text-warning bg-warning-soft',
};

export default function AdminLessonsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.listLessons(), []);
  const [editing, setEditing] = useState<LessonModule | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LessonModule | null>(null);

  async function handleTogglePublish(lesson: LessonModule) {
    const updated = await api.updateLesson(lesson.id, { published: !lesson.published });
    toast.push('success', `"${updated.title}" ${updated.published ? 'published' : 'unpublished'}.`);
    reload();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await api.deleteLesson(deleteTarget.id);
    toast.push('success', `"${deleteTarget.title}" deleted.`);
    setDeleteTarget(null);
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Lessons</h1>
          <p className="mt-1 text-sm text-ink-soft">{data?.length ?? 0} learning modules</p>
        </div>
        <div className="flex items-center gap-3">
          {data && data.length > 0 && (
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  data.map((l) => ({
                    id: l.id,
                    title: l.title,
                    difficulty: l.difficulty,
                    language: l.language,
                    lessons: l.lessons,
                    completions: l.completions,
                    avgCompletionPercent: l.avgCompletionPercent,
                    published: l.published,
                    updatedAt: l.updatedAt,
                  })),
                  `sultiai-lessons-${new Date().toISOString().split('T')[0]}.csv`
                )
              }
              className={ghostBtn}
            >
              Export CSV
            </button>
          )}
          <button type="button" className={primaryBtn} onClick={() => setEditing('new')}>
            + New lesson module
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState
            title="No lesson modules yet"
            description="Create your first module to get started."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  <th className="px-5 py-3.5 font-semibold">Module</th>
                  <th className="px-5 py-3.5 font-semibold">Difficulty</th>
                  <th className="px-5 py-3.5 font-semibold">Lessons</th>
                  <th className="px-5 py-3.5 font-semibold">Completions</th>
                  <th className="px-5 py-3.5 font-semibold">Avg completion</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((lesson) => (
                  <tr
                    key={lesson.id}
                    className="border-b border-line transition-colors last:border-0 hover:bg-surface-2/60"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-ink">{lesson.title}</p>
                      <p className="text-xs text-ink-faint">{lesson.language}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${difficultyTone[lesson.difficulty]}`}
                      >
                        {lesson.difficulty}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-ink-soft">{lesson.lessons}</td>
                    <td className="px-5 py-3.5 tabular-nums text-ink-soft">
                      {lesson.completions.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-line-strong">
                          <div
                            className="h-full rounded-full bg-success-fill"
                            style={{ width: `${lesson.avgCompletionPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-ink-soft">
                          {lesson.avgCompletionPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={lesson.published ? 'published' : 'draft'} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(lesson)}
                          className={softBtn}
                        >
                          {lesson.published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(lesson)}
                          className={softBtn}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(lesson)}
                          className={dangerSoftBtn}
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
      )}

      {editing && (
        <LessonModal
          lesson={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast.push(
              'success',
              editing === 'new' ? 'Lesson module created.' : 'Lesson module updated.'
            );
            setEditing(null);
            reload();
          }}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.title}"?`}
        message="This permanently removes the module and its completion data. This cannot be undone."
        confirmLabel="Delete module"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function LessonModal({
  lesson,
  onClose,
  onSaved,
}: {
  lesson: LessonModule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: lesson?.title ?? '',
    difficulty: (lesson?.difficulty ?? 'beginner') as ModuleDifficulty,
    lessons: lesson?.lessons ?? 8,
    published: lesson?.published ?? true,
  });
  const [errors, setErrors] = useState<{ title?: string; lessons?: string }>({});

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    else if (form.title.trim().length < 3) e.title = 'Title must be at least 3 characters.';
    if (!form.lessons || form.lessons < 1) e.lessons = 'Must have at least 1 lesson.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      if (lesson) {
        await api.updateLesson(lesson.id, { ...form, title: form.title.trim() });
      } else {
        await api.createLesson({ ...form, title: form.title.trim(), language: 'Bisaya (Cebuano)' });
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-overlay p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl border border-line bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-ink">
          {lesson ? 'Edit module' : 'New lesson module'}
        </h3>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Title</label>
            <input
              className={`${inputCls} ${errors.title ? 'border-danger' : ''}`}
              placeholder="e.g. Greetings & Introductions"
              value={form.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value });
                setErrors((p) => ({ ...p, title: undefined }));
              }}
            />
            {errors.title && <p className="mt-1 text-xs text-danger">{errors.title}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Difficulty</label>
              <select
                className={selectCls}
                value={form.difficulty}
                onChange={(e) =>
                  setForm({ ...form, difficulty: e.target.value as ModuleDifficulty })
                }
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Number of lessons</label>
              <input
                type="number"
                min={1}
                className={`${inputCls} ${errors.lessons ? 'border-danger' : ''}`}
                value={form.lessons}
                onChange={(e) => {
                  setForm({ ...form, lessons: Number(e.target.value) });
                  setErrors((p) => ({ ...p, lessons: undefined }));
                }}
              />
              {errors.lessons && <p className="mt-1 text-xs text-danger">{errors.lessons}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="h-4 w-4"
            />
            Publish immediately
          </label>
        </div>
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" className={ghostBtn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={primaryBtn} disabled={busy}>
            {busy ? 'Saving...' : lesson ? 'Save changes' : 'Create module'}
          </button>
        </div>
      </form>
    </div>
  );
}
