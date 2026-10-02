'use client';

import { useState } from 'react';
import type { LessonModule, ModuleDifficulty } from '@/types';
import { ConfirmModal } from '@/components/ConfirmModal';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/ProgressRing';
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
  beginner: 'text-success bg-success-soft ring-success/25',
  intermediate: 'text-brand-ink bg-brand-soft ring-brand/25',
  advanced: 'text-warning bg-warning-soft ring-warning/25',
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
      <PageHeader
        eyebrow="Curriculum"
        title="Lessons"
        description="Build and publish the modules learners move through."
        meta={
          <p className="text-sm text-ink-soft">
            {data?.length ?? 0} module{data?.length === 1 ? '' : 's'}
            {data && data.filter((l) => l.published).length > 0 && (
              <span className="text-ink-faint">
                {' '}
                · {data.filter((l) => l.published).length} published
              </span>
            )}
          </p>
        }
        actions={
          <>
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
            <button type="button" onClick={() => setEditing('new')} className={primaryBtn}>
              + New module
            </button>
          </>
        }
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState
            title="No lesson modules yet"
            description="Create your first module to give learners a path to follow."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
                  <th scope="col" className="px-5 py-3.5">
                    Module
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Difficulty
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Lessons
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Completions
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Avg completion
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((lesson) => (
                  <tr
                    key={lesson.id}
                    className="border-b border-line transition-colors last:border-0 hover:bg-surface-2/50"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-ink">{lesson.title}</p>
                      <p className="text-xs text-ink-faint">{lesson.language}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${difficultyTone[lesson.difficulty]}`}
                      >
                        {lesson.difficulty}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-ink-soft">
                      {lesson.lessons}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-ink-soft">
                      {lesson.completions.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <ProgressBar
                          value={lesson.avgCompletionPercent}
                          label={`${lesson.title} average completion`}
                          className="w-24"
                        />
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
                          className={`${softBtn} px-2.5 py-1.5 text-xs`}
                        >
                          {lesson.published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(lesson)}
                          className={`${softBtn} px-2.5 py-1.5 text-xs`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(lesson)}
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-overlay p-4 backdrop-blur-sm"
      onClick={busy ? undefined : onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-modal-title"
        className="anim-pop glass-3 glass-sheen glass-shadow w-full max-w-lg rounded-hero p-6"
      >
        <h3 id="lesson-modal-title" className="text-lg font-semibold tracking-tight text-ink">
          {lesson ? 'Edit module' : 'New lesson module'}
        </h3>
        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="lesson-title" className="mb-1.5 block text-sm font-medium text-ink">
              Title
            </label>
            <input
              id="lesson-title"
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
              <label
                htmlFor="lesson-difficulty"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Difficulty
              </label>
              <select
                id="lesson-difficulty"
                className={`${selectCls} w-full`}
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
              <label htmlFor="lesson-count" className="mb-1.5 block text-sm font-medium text-ink">
                Number of lessons
              </label>
              <input
                id="lesson-count"
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
