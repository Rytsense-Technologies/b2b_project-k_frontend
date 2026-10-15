'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
    // Build from the live URL, not the last render: two quick changes (e.g. department then
    // programme) must both survive even if the first navigation has not re-rendered yet.
    const live = typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : paramString;
    const next = new URLSearchParams(live);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === null || value === defaults[key]) next.delete(key);
      else next.set(key, String(value));
    });
    const qs = next.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    // Next 14.2 keeps useSearchParams in sync with the native history API, so filters and tabs
    // change the URL without a server round trip (Back / Forward still work).
    if (typeof window !== 'undefined' && window.history) {
      if (push) window.history.pushState(null, '', url);
      else window.history.replaceState(null, '', url);
    } else if (push) router.push(url, { scroll: false });
    else router.replace(url, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramString, pathname, router]);

  return [state, setState];
}

/**
 * Module tab kept in ?tab= (linkable, Back-safe). Unknown values fall back to the first tab.
 *   const [tab, setTab] = useTabParam(['overview', 'students'], 'overview');
 */
export function useTabParam(values, fallback = values[0], key = 'tab') {
  const [state, setState] = useUrlState({ [key]: fallback });
  const fromUrl = values.includes(state[key]) ? state[key] : fallback;
  // Switch the tab at once; the URL catches up after the router round trip.
  // Back / Forward (a URL change) always wins over the optimistic value.
  const [optimistic, setOptimistic] = useState(null);
  useEffect(() => { setOptimistic(null); }, [fromUrl]);
  const current = optimistic && values.includes(optimistic) ? optimistic : fromUrl;
  const set = useCallback((v) => {
    setOptimistic(v);
    setState({ [key]: v }, { push: true });
  }, [setState, key]);
  return [current, set];
}

/**
 * Search box bound to a URL key: the box updates on every keystroke, the URL (and so the
 * request) only after the user pauses. Typing fast never drops characters.
 *   const [q, setQ] = useUrlSearch(state.q, (v) => setState({ q: v, page: undefined }));
 */
export function useUrlSearch(urlValue, commit, delay = 350) {
  const [input, setInput] = useState(urlValue || '');
  // Back / Forward / Clear change the URL: mirror it in the box.
  useEffect(() => { setInput(urlValue || ''); }, [urlValue]);
  useEffect(() => {
    const next = input.trim();
    if (next === (urlValue || '')) return undefined;
    const t = setTimeout(() => commit(next), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, urlValue, delay]);
  return [input, setInput];
}
