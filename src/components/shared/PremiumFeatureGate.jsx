'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { getUpgradeHref, UPGRADE_FROM } from '@/lib/constants/upgrade';

export default function PremiumFeatureGate({
  featureName = 'Job Board',
  description = 'Upgrade to Premium to access curated job openings matched to your profile and target role.',
  upgradeHref = getUpgradeHref({ from: UPGRADE_FROM.jobs, plan: 'premium' }),
}) {
  const router = useRouter();

  return (
    <div className="flex flex-1 min-h-0 items-center justify-center py-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <Lock size={22} className="text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Premium plan required</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-1">
          <span className="font-semibold text-slate-700">{featureName}</span> is included with Premium.
        </p>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">{description}</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Not now
          </button>
          <Link
            href={upgradeHref}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
          >
            Upgrade to Premium
          </Link>
        </div>
      </div>
    </div>
  );
}
