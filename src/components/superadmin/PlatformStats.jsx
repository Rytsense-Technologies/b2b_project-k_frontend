'use client';
import { Building2, Users, Video, IndianRupee } from 'lucide-react';

const STAT_CONFIG = [
  {
    key:     'total_tenants',
    label:   'Total Tenants',
    Icon:    Building2,
    color:   '#2563eb',
    format:  (v) => v ?? '—',
    sub:     (v) => v != null ? `${v} institutions` : 'Loading…',
  },
  {
    key:     'active_users',
    label:   'Active Users',
    Icon:    Users,
    color:   '#0984e3',
    format:  (v) => v != null ? v.toLocaleString() : '—',
    sub:     (v) => v != null ? 'across all tenants' : 'Loading…',
  },
  {
    key:     'interviews_today',
    label:   'Interviews Today',
    Icon:    Video,
    color:   '#00b894',
    format:  (v) => v ?? '—',
    sub:     (v) => v != null ? 'sessions completed' : 'Loading…',
  },
  {
    key:     'total_revenue',
    label:   'Monthly Revenue',
    Icon:    IndianRupee,
    color:   '#e17055',
    format:  (v) => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—',
    sub:     (v) => v != null ? 'this month' : 'Loading…',
  },
];

function StatCard({ label, value, Icon, color, subtitle, loading }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-tight">
          {label}
        </p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon size={16} style={{ color }} strokeWidth={2} />
        </div>
      </div>

      {loading ? (
        <>
          <div className="h-7 w-24 rounded-md bg-slate-100 animate-pulse mb-2" />
          <div className="h-3 w-32 rounded bg-slate-100 animate-pulse" />
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </>
      )}
    </div>
  );
}

export default function PlatformStats({ stats = null, loading = false }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {STAT_CONFIG.map(({ key, label, Icon, color, format, sub }) => (
        <StatCard
          key={key}
          label={label}
          Icon={Icon}
          color={color}
          value={format(stats?.[key])}
          subtitle={sub(stats?.[key])}
          loading={loading}
        />
      ))}
    </div>
  );
}
