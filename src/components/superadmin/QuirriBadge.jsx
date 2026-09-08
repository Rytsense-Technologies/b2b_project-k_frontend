'use client';

const PILL_VARIANTS = {
  ok: 'green',
  warn: 'amber',
  off: 'red',
  learning: 'blue',
  qa: 'violet',
  mix: 'grey',
  green: 'green',
  amber: 'amber',
  red: 'red',
  blue: 'blue',
  violet: 'violet',
  grey: 'grey',
  teal: 'teal',
};

export default function QuirriBadge({ children, variant = 'ok', plain = false }) {
  const color = PILL_VARIANTS[variant] ?? 'grey';
  return (
    <span className={`pill ${color}${plain ? ' plain' : ''}`}>
      {children}
    </span>
  );
}
