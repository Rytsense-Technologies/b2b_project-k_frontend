'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download, TrendingUp, BarChart2, PieChart as PieIcon, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminApi } from '@/lib/api/superadmin/analytics';

// ── Palette ───────────────────────────────────────────────────────────────────

const ACCENT = '#2563eb';

const ROLE_COLORS = {
  superadmin:    '#2563eb',
  college_admin: '#0984e3',
  faculty:       '#00b894',
  student:       '#94a3b8',
};

const ROLE_LABELS = {
  superadmin:    'Super Admin',
  college_admin: 'College Admin',
  faculty:       'Faculty',
  student:       'Student',
};

// ── Data normalisers ──────────────────────────────────────────────────────────

function normaliseTrend(raw = []) {
  return raw.map((d) => ({
    label:    d.label ?? new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    sessions: d.sessions ?? d.count ?? 0,
  }));
}

function normaliseTopTenants(raw = []) {
  return raw
    .map((t) => ({
      name:     (t.name ?? t.tenant_name ?? '').slice(0, 20) + ((t.name ?? '').length > 20 ? '…' : ''),
      fullName: t.name ?? t.tenant_name ?? '—',
      sessions: t.interview_count ?? t.sessions ?? t.count ?? 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function normaliseRoles(raw) {
  if (!raw) return [];
  // Handle both array and object shapes
  const entries = Array.isArray(raw)
    ? raw.map((r) => [r.role, r.count ?? r.value ?? 0])
    : Object.entries(raw);
  return entries
    .filter(([key]) => ROLE_COLORS[key])
    .map(([key, value]) => ({
      name:  ROLE_LABELS[key] ?? key,
      value: Number(value),
      color: ROLE_COLORS[key],
    }));
}

function normaliseRevenue(raw = []) {
  return raw.map((d) => ({
    label:  d.label ?? new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    amount: d.amount ?? d.revenue ?? 0,
  }));
}

// ── Custom tooltips ───────────────────────────────────────────────────────────

function SessionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-sm shadow-md">
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      <p className="font-bold" style={{ color: ACCENT }}>{payload[0].value} sessions</p>
    </div>
  );
}

function TenantTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-sm shadow-md">
      <p className="text-slate-500 text-xs mb-0.5 max-w-[160px]">{payload[0]?.payload?.fullName}</p>
      <p className="font-bold text-[#0984e3]">{payload[0].value} sessions</p>
    </div>
  );
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-sm shadow-md">
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      <p className="font-bold text-emerald-600">₹{Number(payload[0].value).toLocaleString('en-IN')}</p>
    </div>
  );
}

function RoleTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="card px-3 py-2 text-sm shadow-md">
      <p className="text-slate-500 text-xs mb-0.5">{d.name}</p>
      <p className="font-bold" style={{ color: d.payload?.color }}>{d.value.toLocaleString()} users</p>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ChartSkeleton({ height = 240 }) {
  return <div className="w-full rounded-xl bg-slate-100 animate-pulse" style={{ height }} />;
}

// ── Chart card wrapper ────────────────────────────────────────────────────────

function ChartCard({ icon: Icon, title, subtitle, children, loading, height = 240, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ACCENT}15` }}>
            <Icon size={14} style={{ color: ACCENT }} />
          </div>
          <h3 className="font-semibold text-slate-800 text-[15px]">{title}</h3>
        </div>
        {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
      </div>
      {loading ? <ChartSkeleton height={height} /> : children}
    </div>
  );
}

// ── Date range selector ───────────────────────────────────────────────────────

const RANGES = [
  { label: '7D',  days: 7   },
  { label: '30D', days: 30  },
  { label: '90D', days: 90  },
];

// ── Custom PieChart legend ────────────────────────────────────────────────────

function RoleLegend({ data, total }) {
  return (
    <div className="space-y-2 mt-4">
      {data.map((d) => (
        <div key={d.name} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-slate-600">{d.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 tabular-nums">
              {d.value.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 w-9 text-right">
              {total > 0 ? `${Math.round((d.value / total) * 100)}%` : '—'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportCSV({ trend, topTenants, roles, revenue, days }) {
  try {
    const sections = [];

    sections.push(`Platform Analytics Export — Last ${days} Days`);
    sections.push(`Generated: ${new Date().toLocaleString('en-IN')}`);
    sections.push('');

    sections.push('Daily Sessions');
    sections.push('Date,Sessions');
    trend.forEach((d) => sections.push(`${d.label},${d.sessions}`));
    sections.push('');

    sections.push('Top Tenants');
    sections.push('Tenant,Sessions');
    topTenants.forEach((t) => sections.push(`"${t.fullName}",${t.sessions}`));
    sections.push('');

    sections.push('User Role Distribution');
    sections.push('Role,Count');
    roles.forEach((r) => sections.push(`${r.name},${r.value}`));
    sections.push('');

    if (revenue.length) {
      sections.push('Revenue Trend');
      sections.push('Date,Amount (INR)');
      revenue.forEach((r) => sections.push(`${r.label},${r.amount}`));
    }

    const csv  = sections.join('\n');
    const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `platform_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Analytics exported');
  } catch {
    toast.error('Export failed');
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuperAdminAnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data: trendRaw,   isLoading: trendLoading  } = useQuery({
    queryKey: ['superadmin', 'analytics', 'trend', days],
    queryFn:  async () => { const r = await superAdminApi.getPlatformTrend({ days }); return r.data; },
    staleTime: 60_000,
  });

  const { data: tenantsRaw, isLoading: tenantsLoading } = useQuery({
    queryKey: ['superadmin', 'analytics', 'top-tenants', days],
    queryFn:  async () => { const r = await superAdminApi.getTopTenants({ days, limit: 10 }); return r.data; },
    staleTime: 60_000,
  });

  const { data: rolesRaw,   isLoading: rolesLoading   } = useQuery({
    queryKey: ['superadmin', 'analytics', 'roles'],
    queryFn:  async () => { const r = await superAdminApi.getRoleDistribution(); return r.data; },
    staleTime: 120_000,
  });

  const { data: revenueRaw, isLoading: revenueLoading } = useQuery({
    queryKey: ['superadmin', 'analytics', 'revenue', days],
    queryFn:  async () => { const r = await superAdminApi.getRevenueTrend({ days }); return r.data; },
    staleTime: 60_000,
    retry: false,
  });

  const trend      = normaliseTrend(trendRaw?.data    ?? trendRaw    ?? []);
  const topTenants = normaliseTopTenants(tenantsRaw?.tenants ?? tenantsRaw?.data ?? tenantsRaw ?? []);
  const roles      = normaliseRoles(rolesRaw?.roles   ?? rolesRaw?.data ?? rolesRaw);
  const revenue    = normaliseRevenue(revenueRaw?.data ?? revenueRaw ?? []);

  const roleTotal  = roles.reduce((s, r) => s + r.value, 0);
  const hasRevenue = revenue.length > 0 && revenue.some((r) => r.amount > 0);

  const handleExport = () => exportCSV({ trend, topTenants, roles, revenue, days });

  return (
    <div className="animate-fade-in space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Platform Analytics</h2>
          <p className="text-sm text-slate-500 mt-0.5">Usage trends, tenant activity, and revenue overview</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {RANGES.map(({ label, days: d }) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={
                  days === d
                    ? { backgroundColor: ACCENT, color: '#fff' }
                    : { color: '#64748b' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-colors"
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Row 1: Sessions trend (full width) ── */}
      <ChartCard
        icon={TrendingUp}
        title="Daily Interview Sessions"
        subtitle={`Last ${days} days`}
        loading={trendLoading}
        height={240}
      >
        {!trend.length ? (
          <div className="flex items-center justify-center h-[240px] text-sm text-slate-400">
            No session data for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sessionGradAnalytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={ACCENT} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false} tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false} tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<SessionTooltip />} />
              <Area
                type="monotone" dataKey="sessions"
                stroke={ACCENT} strokeWidth={2.5}
                fill="url(#sessionGradAnalytics)"
                dot={false}
                activeDot={{ r: 5, fill: ACCENT, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Row 2: Top tenants + Role distribution ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Left: Top tenants bar chart */}
        <ChartCard
          icon={BarChart2}
          title="Top Tenants by Sessions"
          subtitle={`Last ${days} days`}
          loading={tenantsLoading}
          height={320}
          className="xl:col-span-2"
        >
          {!topTenants.length ? (
            <div className="flex items-center justify-center h-[320px] text-sm text-slate-400">
              No tenant session data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={topTenants}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category" dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false} tickLine={false}
                  width={90}
                />
                <Tooltip content={<TenantTooltip />} cursor={{ fill: '#f8faff' }} />
                <Bar dataKey="sessions" fill="#0984e3" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Right: Role distribution pie */}
        <ChartCard
          icon={PieIcon}
          title="User Role Distribution"
          loading={rolesLoading}
          height={200}
        >
          {!roles.length ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
              No user data yet.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={roles}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {roles.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<RoleTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <RoleLegend data={roles} total={roleTotal} />
            </>
          )}
        </ChartCard>
      </div>

      {/* ── Row 3: Revenue trend (full width) ── */}
      <ChartCard
        icon={IndianRupee}
        title="Revenue Trend"
        subtitle={`Last ${days} days`}
        loading={revenueLoading}
        height={220}
      >
        {!hasRevenue ? (
          <div className="flex flex-col items-center justify-center h-[220px] gap-2">
            <IndianRupee size={28} className="text-slate-300" />
            <p className="text-sm text-slate-400 font-medium">Revenue data coming soon</p>
            <p className="text-xs text-slate-400">Connect your billing integration to see trends here.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenue} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false} tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false} tickLine={false}
                allowDecimals={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<RevenueTooltip />} />
              <Area
                type="monotone" dataKey="amount"
                stroke="#10b981" strokeWidth={2.5}
                fill="url(#revenueGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#10b981', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

    </div>
  );
}
