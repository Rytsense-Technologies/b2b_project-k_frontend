'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { Plus, TrendingUp, LayoutGrid } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { CHART_STROKE, BANNER_BG, BANNER_BTN, BANNER_BTN_HOVER } from '@/lib/constants/theme';
import { superAdminApi } from '@/lib/api/superadmin/analytics';
import PlatformStats from '@/components/superadmin/PlatformStats';
import RecentTenants from '@/components/superadmin/RecentTenants';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTrendLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function normalizeTrend(raw = []) {
  return raw.map((item) => ({
    label:    item.label ?? formatTrendLabel(item.date),
    sessions: item.sessions ?? item.count ?? 0,
  }));
}

function normalizeTenants(raw = []) {
  return raw.map((t) => ({
    name:     t.name?.length > 18 ? `${t.name.slice(0, 16)}…` : t.name,
    sessions: t.interview_count ?? t.sessions ?? 0,
  }));
}

// ── Custom Tooltips ───────────────────────────────────────────────────────────

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-sm shadow-md">
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      <p className="font-bold text-[#2f6fea]">{payload[0].value} sessions</p>
    </div>
  );
}

function TenantTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-sm shadow-md">
      <p className="text-slate-500 text-xs mb-0.5 max-w-[140px] truncate">{label}</p>
      <p className="font-bold text-[#0984e3]">{payload[0].value} sessions</p>
    </div>
  );
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────

function ChartSkeleton({ height = 220 }) {
  return (
    <div
      className="w-full rounded-xl bg-slate-100 animate-pulse"
      style={{ height }}
    />
  );
}

// ── Trend Card ────────────────────────────────────────────────────────────────

function InterviewTrendCard({ data, loading }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-[#2f6fea]" />
          <h3 className="font-semibold text-slate-800 text-[15px]">Interview Sessions — Last 30 Days</h3>
        </div>
        <span className="text-xs text-slate-400">Daily volume</span>
      </div>

      {loading ? (
        <ChartSkeleton height={220} />
      ) : !data.length ? (
        <div className="flex items-center justify-center h-[220px] text-sm text-slate-400">
          No session data yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="sessionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CHART_STROKE} stopOpacity={0.18} />
                <stop offset="95%" stopColor={CHART_STROKE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<TrendTooltip />} />
            <Area
              type="monotone"
              dataKey="sessions"
              stroke={CHART_STROKE}
              strokeWidth={2.5}
              fill="url(#sessionGrad)"
              dot={false}
              activeDot={{ r: 5, fill: CHART_STROKE, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Top Tenants Bar Card ──────────────────────────────────────────────────────

function TopTenantsChart({ data, loading }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LayoutGrid size={16} className="text-[#0984e3]" />
          <h3 className="font-semibold text-slate-800 text-[15px]">Top Tenants by Usage</h3>
        </div>
        <span className="text-xs text-slate-400">Sessions</span>
      </div>

      {loading ? (
        <ChartSkeleton height={220} />
      ) : !data.length ? (
        <div className="flex items-center justify-center h-[220px] text-sm text-slate-400">
          No tenant data yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<TenantTooltip />} cursor={{ fill: '#f1f5f9' }} />
            <Bar
              dataKey="sessions"
              fill="#0984e3"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const user = useAppSelector(selectUser);
  const adminName = user?.first_name || user?.name?.split(' ')?.[0] || 'Admin';

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['superadmin', 'stats'],
    queryFn:  async () => {
      const res = await superAdminApi.getPlatformStats();
      return res.data;
    },
    staleTime: 60_000,
  });

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['superadmin', 'tenants', 'recent'],
    queryFn:  async () => {
      const res = await superAdminApi.getRecentTenants(5);
      return res.data;
    },
    staleTime: 60_000,
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['superadmin', 'trend'],
    queryFn:  async () => {
      const res = await superAdminApi.getInterviewTrend(30);
      return res.data;
    },
    staleTime: 60_000,
  });

  const trendPoints   = normalizeTrend(trendData?.data ?? trendData ?? []);
  const recentTenants = tenantsData?.tenants ?? tenantsData ?? [];

  // Top tenants chart: take top-5 from the same recent list sorted by sessions
  const topTenants = normalizeTenants(
    [...recentTenants]
      .sort((a, b) => (b.interview_count ?? 0) - (a.interview_count ?? 0))
      .slice(0, 5)
  );

  return (
    <div className="animate-fade-in space-y-5">

      {/* ── Welcome Banner (B2C-style) ── */}
      <div className={`rounded-2xl p-6 md:p-8 text-white`} style={{ backgroundColor: BANNER_BG }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold leading-tight">Welcome {adminName}</h2>
            <p className="text-sm md:text-base text-white/90 mt-2 max-w-2xl">
              Manage tenants, users, and platform analytics from your super admin workspace.
            </p>
          </div>
          <Link
            href="/superadmin/tenants/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold px-5 py-2.5 whitespace-nowrap transition-colors"
            style={{ backgroundColor: BANNER_BTN, color: '#0d2b28' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = BANNER_BTN_HOVER; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = BANNER_BTN; }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Add Tenant
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <PlatformStats stats={statsData} loading={statsLoading} />

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <InterviewTrendCard data={trendPoints} loading={trendLoading} />
        </div>
        <div>
          <TopTenantsChart data={topTenants} loading={tenantsLoading} />
        </div>
      </div>

      {/* ── Recent Tenants Table ── */}
      <RecentTenants tenants={recentTenants} loading={tenantsLoading} />

    </div>
  );
}
