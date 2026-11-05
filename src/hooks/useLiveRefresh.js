'use client';

import { useEffect, useRef, useState } from 'react';
import { createRefreshGate } from '@/lib/refreshGate';

/** Regaining focus fires both visibilitychange and focus: refresh once. */
const FOCUS_GAP_MS = 5000;

/**
 * Live data, the same way the student pages do it: call `refresh` every
 * `intervalMs` while the tab is visible and again whenever it regains focus.
 * Returns the time of the last refresh (for a "Live · updated …" stamp).
 */
export function useLiveRefresh(refresh, intervalMs = 60000) {
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const ref = useRef(refresh);
  ref.current = refresh;

  useEffect(() => {
    const run = () => {
      if (document.visibilityState !== 'visible') return;
      Promise.resolve(ref.current?.()).catch(() => {}).finally(() => setUpdatedAt(Date.now()));
    };
    const gate = createRefreshGate(FOCUS_GAP_MS);
    const onReturn = () => {
      if (document.visibilityState === 'visible' && gate()) run();
    };
    const id = setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
    };
  }, [intervalMs]);

  return updatedAt;
}

/** "just now" / "3 min ago" — re-render the caller every 15 s to keep it fresh. */
export function useTimeAgo(ts) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  return `${Math.round(s / 60)} min ago`;
}
