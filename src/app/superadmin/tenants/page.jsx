'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, Search, Pencil, Trash2,
  ToggleLeft, ToggleRight, Building2,
} from 'lucide-react';
import { tenantsApi } from '@/lib/api/superadmin/tenants';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Pagination from '@/components/shared/Pagination';

const PLAN_STYLE = {
  trial:    { label: 'Trial',    bg: '#fff7ed', color: '#c2410c' },
  standard: { label: 'Standard', bg: '#eff6ff', color: '#1d4ed8' },
  premium:  { label: 'Premium',  bg: '#f5f3ff', color: '#6d28d9' },
};

const STATUS_STYLE = {
  active:    { label: 'Active',    bg: '#f0fdf4', color: '#15803d' },
  suspended: { label: 'Suspended', bg: '#fef2f2', color: '#b91c1c' },
  trial:     { label: 'Trial',     bg: '#fefce8', color: '#a16207' },
};

function Badge({ value, map }) {
  const s = map[value?.toLowerCase()] ?? { label: value ?? '—', bg: '#f1f5f9', color: '#475569' };
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TableSkeleton() {
  return Array.from({ length: 6 }).map((_, i) => (
    <tr key={i}>
      {[180, 160, 70, 50, 80, 90, 80].map((w, j) => (
        <td key={j} className="px-4 py-3.5">
          <div className="h-3.5 rounded bg-slate-100 animate-pulse" style={{ width: w }} />
        </td>
      ))}
    </tr>
  ));
}

const LIMIT = 10;

export default function TenantsPage() {
  const qc = useQueryClient();

  const [search,   setSearch]   = useState('');
  const [debSearch, setDebSearch] = useState('');
  const [status,   setStatus]   = useState('');
  const [page,     setPage]     = useState(1);

  const [deleteTarget, setDeleteTarget] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin', 'tenants', { page, search: debSearch, status }],
    queryFn:  async () => {
      const res = await tenantsApi.getTenants({ page, limit: LIMIT, search: debSearch, status });
      return res.data;
    },
    staleTime: 30_000,
  });

  const tenants   = data?.tenants   ?? data?.items ?? data?.data ?? [];
  const totalPages = Math.ceil((data?.total ?? tenants.length) / LIMIT) || 1;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['superadmin', 'tenants'] });

  const toggleMutation = useMutation({
    mutationFn: ({ id, current }) =>
      tenantsApi.toggleTenantStatus(id, current === 'active' ? 'suspended' : 'active'),
    onSuccess: () => { toast.success('Tenant status updated'); invalidate(); },
    onError:   () => toast.error('Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => tenantsApi.deleteTenant(id),
    onSuccess: () => { toast.success('Tenant deleted'); setDeleteTarget(null); invalidate(); },
    onError:   () => toast.error('Failed to delete tenant'),
  });

  return (
    <div className="animate-fade-in space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Tenants</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage all institutions on the platform</p>
        </div>
        <Link
          href="/superadmin/tenants/new"
          className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors"
          style={{ backgroundColor: '#2563eb' }}
        >
          <Plus size={15} strokeWidth={2.5} />
          New Tenant
        </Link>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-9 py-2 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="input-base py-2 text-sm w-40"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['College Name', 'Admin Email', 'Plan', 'Users', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <TableSkeleton />
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <Building2 size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">No tenants found</p>
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/superadmin/tenants/${t.id}`}
                        className="font-medium text-slate-800 hover:text-[#2563eb] transition-colors"
                      >
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{t.admin_email ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <Badge value={t.plan} map={PLAN_STYLE} />
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-slate-600">
                      {(t.user_count ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge value={t.status} map={STATUS_STYLE} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">{formatDate(t.created_at)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        {/* Edit */}
                        <Link
                          href={`/superadmin/tenants/${t.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#2563eb] hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </Link>

                        {/* Toggle status */}
                        <button
                          onClick={() => toggleMutation.mutate({ id: t.id, current: t.status })}
                          disabled={toggleMutation.isPending}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          title={t.status === 'active' ? 'Suspend' : 'Activate'}
                        >
                          {t.status === 'active'
                            ? <ToggleRight size={16} className="text-emerald-500" />
                            : <ToggleLeft  size={16} />
                          }
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && tenants.length > 0 && (
          <div className="px-4 pb-4">
            <Pagination current={page} total={totalPages} onChange={setPage} />
          </div>
        )}
      </div>

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Tenant"
        message={`Permanently delete "${deleteTarget?.name}"? This will remove all associated users and data. This cannot be undone.`}
        confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        danger
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
