'use client';
import { useAppSelector } from '@/store/hooks';
import { selectPlan } from '@/store/slices/authSlice';
import { PLAN_RANK } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { getUpgradeHref } from '@/lib/constants/upgrade';

function UpgradeOverlay({ targetPlan, upgradeHref }) {
  const labels = { standard: 'Standard', premium: 'Premium' };
  return (
    <div className="locked-overlay">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
          <Lock size={18} className="text-blue-600" />
        </div>
        <p className="text-sm font-semibold text-slate-700">
          Unlock with {labels[targetPlan] || targetPlan} Plan
        </p>
        <a
          href={upgradeHref ?? getUpgradeHref({ plan: 'premium' })}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2"
        >
          Upgrade now →
        </a>
      </div>
    </div>
  );
}

export default function BlurredSection({ children, unlockPlan, upgradeHref }) {
  const plan = useAppSelector(selectPlan);
  const locked = PLAN_RANK[plan] < PLAN_RANK[unlockPlan];

  return (
    <div className="relative">
      <div className={locked ? 'blur-sm pointer-events-none select-none' : ''}>
        {children}
      </div>
      {locked && <UpgradeOverlay targetPlan={unlockPlan} upgradeHref={upgradeHref} />}
    </div>
  );
}
