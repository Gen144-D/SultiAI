import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const SYNC_DEBOUNCE_MS = 700;

const clampPercent = (value) => Math.max(0, Math.min(100, Number(value) || 0));

function computePercent(total, completed) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

/**
 * Persists a content module's progress to the server.
 *
 * Progress is measured from real work: `completed` items out of `total` items
 * loaded from the module's lesson content. Writes are debounced so tapping
 * through a list produces one request, not one per tap.
 *
 * Progress is treated as monotonic. The module's saved percent is used as a
 * floor so reopening a module can never overwrite stored progress with a
 * lower value (for example resetting a completed module to 0% on mount).
 */
export default function useModuleProgress(
  moduleKey,
  { total = 0, completed = 0, enabled = true, initialPercent = null } = {}
) {
  const [saving, setSaving] = useState(false);
  const [synced, setSynced] = useState(null);
  const [error, setError] = useState(null);

  const percent = computePercent(total, completed);
  const percentRef = useRef(percent);
  const timerRef = useRef(null);
  const lastSyncedRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    percentRef.current = percent;
  }, [percent]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !moduleKey || !total) return;

    if (lastSyncedRef.current === null) {
      // Adopt the stored value so the first render never pushes a reset.
      lastSyncedRef.current = initialPercent === null || initialPercent === undefined
        ? 0
        : clampPercent(initialPercent);
    }

    // Never write a value at or below what the server already holds.
    if (percent <= lastSyncedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const target = percentRef.current;
      if (target <= lastSyncedRef.current) return;
      setSaving(true);
      try {
        await api.updateLearningProgressByKey(moduleKey, target);
        lastSyncedRef.current = target;
        if (!mountedRef.current) return;
        setSynced(target);
        setError(null);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err?.message || 'Could not save your progress');
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, moduleKey, percent, total, initialPercent]);

  return { percent, saving, synced, error, computePercent };
}

export { computePercent };

/**
 * Loads a module's lesson content and groups it into the sections the UI renders.
 */
export function useModuleLessons(moduleKey) {
  const [sections, setSections] = useState([]);
  const [savedPercent, setSavedPercent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!moduleKey) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await api.getLearningModuleLessons(moduleKey);
        if (cancelled || !mountedRef.current) return;

        const items = Array.isArray(data?.items) ? data.items : [];
        const grouped = [];
        const byTitle = new Map();

        for (const item of items) {
          const title = item?.sectionTitle || 'Lessons';
          if (!byTitle.has(title)) {
            const group = { title, items: [] };
            byTitle.set(title, group);
            grouped.push(group);
          }
          byTitle.get(title).items.push({
            itemId: item.itemId,
            native: item.nativeText,
            english: item.englishText ?? '',
            note: item.note ?? '',
          });
        }

        setSections(grouped);
        setSavedPercent(
          data?.progress?.completionPercent === undefined ||
          data?.progress?.completionPercent === null
            ? 0
            : clampPercent(data.progress.completionPercent)
        );
        setError(null);
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        setSections([]);
        setSavedPercent(0);
        setError(err?.message || 'Could not load lesson content');
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [moduleKey]);

  const items = sections.flatMap((section) => section.items);
  return { sections, items, total: items.length, savedPercent, loading, error };
}
