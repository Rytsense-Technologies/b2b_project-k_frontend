'use client';
import { Zap } from 'lucide-react';

export default function UpgradeBanner({ feature = 'this feature', targetPlan = 'premium' }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-quirri-lg bg-brand-900 text-white">
      <div className="flex items-center gap-3">
        <Zap size={18} className="flex-shrink-0 text-amber-500" />
        <p className="text-sm font-medium">
          Upgrade to{' '}
          <span className="capitalize font-bold">{targetPlan}</span> to access {feature}.
        </p>
      </div>
      <a
        href="/pricing"
        className="flex-shrink-0 px-4 py-2 min-h-11 inline-flex items-center rounded-full bg-amber-700 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
      >
        Upgrade
      </a>
    </div>
  );
}
