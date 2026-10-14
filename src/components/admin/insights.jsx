'use client';

/** Shared bits of the College Admin dashboard + analytics screens. */

export const RANGES = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'this_semester', label: 'This semester' },
  { value: 'all_time', label: 'All time' },
];

export function minutesLabel(mins) {
  const m = Number(mins) || 0;
  if (!m) return '0m';
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}

/** Completion bar (Progress green) with its number. */
export function Meter({ value }) {
  if (value == null) return <span className="sa-muted">—</span>;
  const v = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="sa-progress">
      <div className="bar green"><i style={{ width: `${v}%` }} /></div>
      <small>{v}%</small>
    </div>
  );
}
