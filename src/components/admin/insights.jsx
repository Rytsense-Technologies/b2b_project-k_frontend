'use client';

import { useEffect } from 'react';
import { formatMinutes } from '@/lib/superadmin/format';

/** Shared bits of the College Admin dashboard + analytics screens. */

/**
 * Keep the selected TabNav tab visible when the tab strip scrolls sideways (390 px),
 * e.g. when a ?tab= link opens a later tab. Scrolls the strip only, never the page.
 */
export function useTabInView(idBase, value) {
  useEffect(() => {
    const tab = typeof document === 'undefined' ? null : document.getElementById(`${idBase}-${value}`);
    const strip = tab?.parentElement;
    if (!tab || !strip || strip.scrollWidth <= strip.clientWidth) return;
    const t = tab.getBoundingClientRect();
    const box = strip.getBoundingClientRect();
    strip.scrollLeft = Math.max(0, strip.scrollLeft + (t.left - box.left) - (strip.clientWidth - t.width) / 2);
  }, [idBase, value]);
}

export const RANGES = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'this_semester', label: 'This semester' },
  { value: 'all_time', label: 'All time' },
];

/** Watch time in the product-wide format ("0 min", "12 h 05 min"), same as the dashboards and reports. */
export function minutesLabel(mins) {
  return formatMinutes(Number(mins) || 0);
}

/** Completion bar (Progress green, or a subject / department series colour) with its number. */
export function Meter({ value, color }) {
  if (value == null) return <span className="sa-muted">—</span>;
  const v = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="sa-progress">
      <div className="bar green"><i style={color ? { width: `${v}%`, background: color } : { width: `${v}%` }} /></div>
      <small>{Math.round(v)}%</small>
    </div>
  );
}
