'use client';
import { Zap } from 'lucide-react';

export default function UpgradeBanner({ feature = 'this feature', targetPlan = 'premium' }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white">
      <div className="flex items-center gap-3">
        <Zap size={18} className="flex-shrink-0" />
        <p className="text-sm font-medium">
          Upgrade to{' '}
          <span className="capitalize font-bold">{targetPlan}</span> to access {feature}.
        </p>
      </div>
      <a
        href="/pricing"
        className="flex-shrink-0 px-4 py-1.5 bg-white text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
      >
        Upgrade
      </a>
    </div>
  );
}
