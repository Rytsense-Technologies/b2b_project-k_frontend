'use client';

const BADGE_STYLES = {
  ok: 'quirri-badge-ok',
  warn: 'quirri-badge-warn',
  off: 'quirri-badge-off',
  learning: 'quirri-badge-learning',
  qa: 'quirri-badge-qa',
  mix: 'quirri-badge-mix',
};

export default function QuirriBadge({ children, variant = 'ok' }) {
  return (
    <span className={`quirri-badge ${BADGE_STYLES[variant] ?? BADGE_STYLES.off}`}>
      {children}
    </span>
  );
}
