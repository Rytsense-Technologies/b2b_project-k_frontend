'use client';
import Link from 'next/link';
import { ArrowRight, Building2 } from 'lucide-react';

const PLAN_STYLE = {
  trial:    { label: 'Trial',    bg: '#fff7ed', text: '#c2410c' },
  standard: { label: 'Standard', bg: '#eff6ff', text: '#1d4ed8' },
  premium:  { label: 'Premium',  bg: '#f5f3ff', text: '#6d28d9' },
};

const STATUS_STYLE = {
  active:    { label: 'Active',    bg: '#f0fdf4', text: '#15803d' },
  suspended: { label: 'Suspended', bg: '#fef2f2', text: '#b91c1c' },
  trial:     { label: 'Trial',     bg: '#fefce8', text: '#a16207' },
};

function Badge({ value, map }) {
  const style = map[value?.toLowerCase()] ?? { label: value, bg: '#f1f5f9', text: '#475569' };
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function SkeletonRow() {
  return (
    <tr>
      {[140, 80, 60, 70, 90].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-3.5 rounded bg-slate-100 animate-pulse"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function RecentTenants({ tenants = [], loading = false }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-slate-400" />
          <h3 className="font-semibold text-slate-800 text-[15px]">Recent Tenants</h3>
        </div>
        <Link
          href="/superadmin/tenants"
          className="flex items-center gap-1 text-xs text-[#0b66d6] font-semibold hover:opacity-75 transition-opacity"
        >
          View All <ArrowRight size={13} />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                College Name
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Plan
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Users
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : tenants.length === 0
              ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    No tenants found
                  </td>
                </tr>
              )
              : tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/superadmin/tenants/${t.id}`}
                      className="font-medium text-slate-800 hover:text-[#0b66d6] transition-colors"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={t.plan} map={PLAN_STYLE} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">
                    {(t.user_count ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={t.status} map={STATUS_STYLE} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {formatDate(t.created_at)}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
