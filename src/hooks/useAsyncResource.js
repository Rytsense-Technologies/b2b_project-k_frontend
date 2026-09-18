'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function samePayload(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * @param {() => Promise<any>} loader
 * @param {any[]} [deps] — when these change, reload runs again (initial + dep change).
 * @returns {{ data, setData, loading, error, reload }}
 *   reload(opts?: { silent?: boolean })
 *   - silent: skip loading spinner; on failure keep existing data/error (for polls).
 */
export function useAsyncResource(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async (opts = {}) => {
    const silent = Boolean(opts?.silent);
    if (!silent) setLoading(true);
    try {
      const result = await loaderRef.current();
      setData((prev) => (samePayload(prev, result) ? prev : result));
      setError(null);
      return result;
    } catch (err) {
      if (!silent) setError(err);
      throw err;
    } finally {
      if (!silent) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  return { data, setData, loading, error, reload };
}
