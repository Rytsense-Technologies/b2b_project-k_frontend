'use client';
import { bandFor } from '@/components/shared/data-viz';

/**
 * Circular 0–100 ring. Colour follows the score band (80 / 60, design-system §0c)
 * unless `tone="progress"` (green completion ring) or an explicit `color` is passed.
 * Tokens only — no hard-coded hex.
 */
const BAND_STROKE = {
  strong: 'var(--band-strong)', ok: 'var(--band-ok)', focus: 'var(--band-focus)', none: 'var(--band-none)',
};
const BAND_TEXT = {
  strong: 'var(--band-strong-text)', ok: 'var(--band-ok-text)', focus: 'var(--band-focus-text)', none: 'var(--muted)',
};

export default function ScoreRing({ score = 0, size = 80, strokeWidth = 6, tone = 'band', color, suffix = '', label }) {
  const value = Number.isFinite(Number(score)) ? Math.max(0, Math.min(100, Number(score))) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const band = bandFor(score);
  const stroke = color || (tone === 'progress' ? 'var(--progress)' : BAND_STROKE[band]);
  const text = color || (tone === 'progress' ? 'var(--progress-text)' : BAND_TEXT[band]);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size, flex: 'none' }}
      role="img"
      aria-label={label || `${Math.round(value)}${suffix}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" style={{ stroke: 'var(--neutral-100)' }} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          style={{ stroke, transition: 'stroke-dashoffset 1s ease-in-out' }}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-center" style={{ color: text, fontSize: Math.round(size * 0.22), fontWeight: 500 }} aria-hidden="true">
        {Math.round(value)}{suffix}
      </span>
    </div>
  );
}
