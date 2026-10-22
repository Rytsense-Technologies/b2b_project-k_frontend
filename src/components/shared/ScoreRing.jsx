'use client';
import { bandFor } from '@/components/shared/data-viz';

/**
 * Circular 0–100 ring. Colour follows the score band (80 / 60, design-system §0c)
 * unless `tone="progress"` (green completion ring) or an explicit `color` is passed.
 * Tokens only — no hard-coded hex.
 *
 * Replacement for ScoreMeter (modern-cards-plan.md): `<ScoreRing score={72} size="sm" suffix="%" label="Completion 72%" />`
 *   size: number (px) or preset 'xs' 32 · 'sm' 44 · 'md' 64 · 'lg' 80 (default 80)
 *   score null / '' / NaN → grey ring with "—" (no data), never "0".
 */
const BAND_STROKE = {
  strong: 'var(--band-strong)', ok: 'var(--band-ok)', focus: 'var(--band-focus)', none: 'var(--band-none)',
};
const BAND_TEXT = {
  strong: 'var(--band-strong-text)', ok: 'var(--band-ok-text)', focus: 'var(--band-focus-text)', none: 'var(--muted)',
};
const SIZES = { xs: 32, sm: 44, md: 64, lg: 80 };

export default function ScoreRing({ score = 0, size = 80, strokeWidth, tone = 'band', color, suffix = '', label, className = '' }) {
  const px = typeof size === 'string' ? (SIZES[size] ?? 80) : size;
  const sw = strokeWidth ?? (px <= 36 ? 4 : px <= 48 ? 5 : 6);
  const noData = score == null || score === '' || !Number.isFinite(Number(score));
  const value = noData ? 0 : Math.max(0, Math.min(100, Number(score)));
  const radius = (px - sw) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const band = bandFor(score);
  const stroke = color || (tone === 'progress' ? 'var(--progress)' : BAND_STROKE[band]);
  const text = noData ? 'var(--muted)' : color || (tone === 'progress' ? 'var(--progress-text)' : BAND_TEXT[band]);
  // Small rings drop the suffix when it would not fit ("100%" at 32px).
  const shown = noData ? '—' : `${Math.round(value)}${px < 40 ? '' : suffix}`;
  const fontSize = Math.max(px < 40 ? 10 : 11, Math.round(px * (px < 56 ? 0.26 : 0.22)));

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`.trim()}
      style={{ width: px, height: px, flex: 'none' }}
      role="img"
      aria-label={label || (noData ? 'No data' : `${Math.round(value)}${suffix}`)}
    >
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} className="-rotate-90" aria-hidden="true">
        <circle cx={px / 2} cy={px / 2} r={radius} fill="none" style={{ stroke: 'var(--neutral-100)' }} strokeWidth={sw} />
        {noData ? null : (
          <circle
            cx={px / 2}
            cy={px / 2}
            r={radius}
            fill="none"
            style={{ stroke, transition: 'stroke-dashoffset 1s ease-in-out' }}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        )}
      </svg>
      <span className="absolute text-center" style={{ color: text, fontSize, fontWeight: px < 56 ? 600 : 500, fontVariantNumeric: 'tabular-nums' }} aria-hidden="true">
        {shown}
      </span>
    </div>
  );
}
