'use client';

const PLAN_CONFIG = {
  standard: { label: 'Standard', className: 'plan-standard' },
  premium:  { label: 'Premium',  className: 'plan-premium' },
};

export default function PlanBadge({ plan = 'free', className = '' }) {
  if (!plan || plan === 'free') return null;
  const config = PLAN_CONFIG[plan];
  if (!config) return null;
  return (
    <span
      suppressHydrationWarning
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
