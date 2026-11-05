'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createLatestRequest } from '@/lib/latestRequest';
import { reportLookupFailure } from '@/lib/lookupFailure';

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
 * @param {{ lookup?: string }} [options] — lookup: this is a supporting list (filter options,
 *   a picker) named so; a failed load tells the user instead of reading as an empty list.
 * @returns {{ data, setData, loading, error, reload }}
 *   reload(opts?: { silent?: boolean })
 *   - silent: skip loading spinner; on failure keep existing data/error (for polls).
 *   Only the latest request updates state; a slower, older response is ignored.
 */
export function useAsyncResource(loader, deps = [], { lookup = '' } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const latestRef = useRef(null);
  if (!latestRef.current) latestRef.current = createLatestRequest();

  const reload = useCallback(async (opts = {}) => {
    const silent = Boolean(opts?.silent);
    const ticket = latestRef.current.begin(silent);
    if (!silent) setLoading(true);
    try {
      const result = await loaderRef.current();
      if (ticket.current()) {
        setData((prev) => (samePayload(prev, result) ? prev : result));
        setError(null);
      }
      return result;
    } catch (err) {
      if (!silent && ticket.current()) {
        setError(err);
        if (lookup) reportLookupFailure(lookup, err);
      }
      throw err;
    } finally {
      if (ticket.finish() && !silent) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  return { data, setData, loading, error, reload };
}
