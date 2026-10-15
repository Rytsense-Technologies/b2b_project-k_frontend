'use client';

/**
 * List-page helpers for the Super Admin portal (recipe v2): filters live in the URL
 * (useUrlState) and the search box writes to the URL only after the user stops typing,
 * so one request goes out per search, not one per keystroke.
 */
import { useEffect, useState } from 'react';

export const SEARCH_DEBOUNCE_MS = 350;

/**
 * Text input bound to a URL key with a debounce.
 *   const [q, setQ] = useDebouncedUrlSearch(url.q, (v) => setUrl({ q: v, page: '1' }));
 */
export function useDebouncedUrlSearch(urlValue, commit, delay = SEARCH_DEBOUNCE_MS) {
  const [input, setInput] = useState(urlValue || '');

  // Back / Forward or "Clear filters" change the URL: mirror it in the box.
  useEffect(() => { setInput(urlValue || ''); }, [urlValue]);

  useEffect(() => {
    const next = input.trim();
    if (next === (urlValue || '')) return undefined;
    const t = setTimeout(() => commit(next), delay);
    return () => clearTimeout(t);
    // commit is recreated with the URL; the debounce only needs the text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, urlValue, delay]);

  return [input, setInput];
}

/** Status chips shared by universities / colleges / departments ('all' keeps the URL value explicit). */
export const ACTIVE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

/** 'all' | 'true' | 'false' -> is_active param. */
export function activeParam(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

/** Positive page number from a URL string. */
export function pageParam(value) {
  return Math.max(1, Number(value) || 1);
}

/** Total from a list response (falls back to the row count). */
export function totalOf(data, rows) {
  if (data && typeof data.total === 'number') return data.total;
  return Array.isArray(rows) ? rows.length : 0;
}
