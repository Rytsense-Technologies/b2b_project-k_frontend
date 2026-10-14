'use client';

/** Score in the owner's bands: >=75 strong (green), 50-74 teal, <50 orange - never red. Empty reads as a muted dash. */
export default function ScoreCell({ value }) {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return <span className="sa-muted">—</span>;
  const tone = n >= 75 ? 'sp-pill--good' : n >= 50 ? 'sp-pill--teal' : 'sp-pill--low';
  return <span className={`sp-pill ${tone}`}>{Math.round(n)}%</span>;
}
