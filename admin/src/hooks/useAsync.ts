'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loaderRef
      .current()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const id = setTimeout(() => {
      cleanup = reload();
    }, 0);
    return () => {
      clearTimeout(id);
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  return { data, loading, error, reload };
}
