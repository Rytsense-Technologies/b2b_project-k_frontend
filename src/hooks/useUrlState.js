'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Keep list/record UI state (search, filters, tab, paging) in the query string so that
 * refresh, Back/Forward and shared links reopen the same view (docs/ux/ux-architecture.md §4).
 *
 *   const [state, setState] = useUrlState({ q: '', status: 'true' });
 *   setState({ q: 'phys' });          // replaces history entry, keeps other keys
 *
 * Defaults are omitted from the URL to keep links clean.
 */
export function useUrlState(defaults) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const paramString = params?.toString() ?? '';

  const state = useMemo(() => {
    const current = new URLSearchParams(paramString);
    const out = {};
    Object.keys(defaults).forEach((key) => {
      out[key] = current.has(key) ? current.get(key) : defaults[key];
    });
    return out;
    // defaults is a stable literal per call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramString]);

  const setState = useCallback((patch, { push = false } = {}) => {
    const next = new URLSearchParams(paramString);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === null || value === defaults[key]) next.delete(key);
      else next.set(key, String(value));
    });
    const qs = next.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (push) router.push(url, { scroll: false });
    else router.replace(url, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramString, pathname, router]);

  return [state, setState];
}
