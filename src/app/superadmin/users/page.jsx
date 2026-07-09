'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Search, Download, Upload,
  ToggleLeft, ToggleRight, Users,
  ChevronDown, Check,
} from 'lucide-react';
import { usersApi } from '@/lib/api/superadmin/users';
import { tenantsApi } from '@/lib/api/superadmin/tenants';
import BulkUploadModal from '@/components/superadmin/BulkUploadModal';
import Pagination from '@/components/shared/Pagination';

// ── Badge maps ────────────────────────────────────────────────────────────────

const ROLE_STYLE = {
  superadmin:    { label: 'Super Admin',   bg: '#f5f3ff', color: '#6d28d9' },
  college_admin: { label: 'College Admin', bg: '#eff6ff', color: '#1d4ed8' },
  faculty:       { label: 'Faculty',       bg: '#f0fdf4', color: '#15803d' },
  student:       { label: 'Student',       bg: '#f8fafc', color: '#475569' },
};

const STATUS_STYLE = {
  active:    { label: 'Active',    bg: '#f0fdf4', color: '#15803d' },
  suspended: { label: 'Suspended', bg: '#fef2f2', color: '#b91c1c' },
  inactive:  { label: 'Inactive',  bg: '#f8fafc', color: '#94a3b8' },
};

const ROLE_OPTIONS = [
  { value: 'superadmin',    label: 'Super Admin'   },
  { value: 'college_admin', label: 'College Admin' },
  { value: 'faculty',       label: 'Faculty'       },
  { value: 'student',       label: 'Student'       },
];

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
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Inline role dropdown ───────────────────────────────────────────────────────

function RolePicker({ userId, currentRole, onChanged }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const qc  = useQueryClient();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const mutation = useMutation({
    mutationFn: (role) => usersApi.updateUserRole(userId, role),
    onSuccess: () => {
      toast.success('Role updated');
      qc.invalidateQueries({ queryKey: ['superadmin', 'users'] });
      setOpen(false);
      onChanged?.();
    },
    onError: () => toast.error('Failed to update role'),
  });

  const s = ROLE_STYLE[currentRole?.toLowerCase()] ?? ROLE_STYLE.student;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-opacity hover:opacity-75"
        style={{ backgroundColor: s.bg, color: s.color }}
      >
        {s.label}
        <ChevronDown size={10} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-40 bg-white rounded-xl border border-slate-200 shadow-lg py-1 overflow-hidden">
          {ROLE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => mutation.mutate(value)}
              disabled={mutation.isPending}
              className="flex items-center justify-between w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <span>{label}</span>
              {value === currentRole && <Check size={12} className="text-[#2563eb]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Table skeleton ─────────────────────────────────────────────────────────────

function TableSkeleton() {
  return Array.from({ length: 8 }).map((_, i) => (
    <tr key={i}>
      {[140, 180, 90, 120, 80, 90, 60].map((w, j) => (
        <td key={j} className="px-4 py-3.5">
          <div className="h-3.5 rounded bg-slate-100 animate-pulse" style={{ width: w }} />
        </td>
      ))}
    </tr>
  ));
}

// ── Page ──────────────────────────────────────────────────────────────────────

const LIMIT = 10;

export default function UsersPage() {
  const qc = useQueryClient();

  const [search,      setSearch]      = useState('');
  const [debSearch,   setDebSearch]   = useState('');
  const [roleFilter,  setRoleFilter]  = useState('');
  const [tenantFilter,setTenantFilter]= useState('');
  const [statusFilter,setStatusFilter]= useState('');
  const [page,        setPage]        = useState(1);
  const [bulkOpen,    setBulkOpen]    = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [roleFilter, tenantFilter, statusFilter]);

  // Users query
  const { data, isLoading } = useQuery({
    queryKey: ['superadmin', 'users', { page, search: debSearch, role: roleFilter, tenantId: tenantFilter, status: statusFilter }],
    queryFn:  async () => {
      const res = await usersApi.getUsers({
        page, limit: LIMIT,
        search:   debSearch,
        role:     roleFilter,
        tenantId: tenantFilter,
        status:   statusFilter,
      });
      return res.data;
    },
    staleTime: 30_000,
  });

  // Tenants list for filter dropdown
  const { data: tenantsData } = useQuery({
    queryKey: ['superadmin', 'tenants', 'all'],
    queryFn:  async () => {
      const res = await tenantsApi.getTenants({ limit: 200 });
      return res.data;
    },
    staleTime: 120_000,
  });

  const users      = data?.users ?? data?.items ?? data?.data ?? [];
  const totalPages = Math.ceil((data?.total ?? users.length) / LIMIT) || 1;
  const tenants    = tenantsData?.tenants ?? tenantsData?.items ?? tenantsData?.data ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, current }) =>
      usersApi.toggleUserStatus(id, current === 'active' ? 'suspended' : 'active'),
    onSuccess: () => {
      toast.success('User status updated');
      qc.invalidateQueries({ queryKey: ['superadmin', 'users'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try { await usersApi.downloadCSVTemplate(); }
    catch { toast.error('Failed to download template'); }
    finally { setDownloading(false); }
  };

  return (
    <div className="animate-fade-in space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Users</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage all users across every tenant</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadTemplate}
            disabled={downloading}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Download size={15} />
            {downloading ? 'Downloading…' : 'Template'}
          </button>
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-colors"
            style={{ backgroundColor: '#2563eb' }}
          >
            <Upload size={15} />
            Bulk Upload
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        {/* Search */}
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

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input-base py-2 text-sm w-40"
        >
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {/* Tenant filter */}
        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          className="input-base py-2 text-sm w-44"
        >
          <option value="">All Tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-base py-2 text-sm w-36"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['Name', 'Email', 'Role', 'Tenant', 'Status', 'Last Active', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <TableSkeleton />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <Users size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isActive = u.status === 'active';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">

                      {/* Name + avatar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: ROLE_STYLE[u.role?.toLowerCase()]?.color ?? '#94a3b8' }}
                          >
                            {(u.first_name?.[0] ?? u.name?.[0] ?? '?').toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800 whitespace-nowrap">
                            {(u.name ?? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()) || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{u.email}</td>

                      {/* Role — inline picker */}
                      <td className="px-4 py-3.5">
                        <RolePicker userId={u.id} currentRole={u.role} />
                      </td>

                      {/* Tenant */}
                      <td className="px-4 py-3.5 text-slate-500 text-xs max-w-[140px] truncate">
                        {u.tenant_name ?? u.tenant?.name ?? '—'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <Badge value={u.status} map={STATUS_STYLE} />
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-3.5 text-slate-500 text-xs">
                        {formatDate(u.last_active_at ?? u.last_login_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => toggleMutation.mutate({ id: u.id, current: u.status })}
                          disabled={toggleMutation.isPending}
                          title={isActive ? 'Suspend user' : 'Activate user'}
                          className="p-1.5 rounded-lg text-slate-400 transition-colors disabled:opacity-50"
                          style={{ '--hover-color': isActive ? '#ef4444' : '#10b981' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = isActive ? '#ef4444' : '#10b981';
                            e.currentTarget.style.backgroundColor = isActive ? '#fef2f2' : '#f0fdf4';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '';
                            e.currentTarget.style.backgroundColor = '';
                          }}
                        >
                          {isActive
                            ? <ToggleRight size={17} style={{ color: '#10b981' }} />
                            : <ToggleLeft  size={17} />
                          }
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && users.length > 0 && (
          <div className="px-4 pb-4">
            <Pagination current={page} total={totalPages} onChange={setPage} />
          </div>
        )}
      </div>

      {/* ── Bulk Upload Modal ── */}
      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['superadmin', 'users'] })}
      />
    </div>
  );
}
