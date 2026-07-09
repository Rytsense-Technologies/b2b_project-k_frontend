'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, Users,
  BarChart2, Settings, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Logo from '@/components/shared/Logo';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCredentials } from '@/store/slices/authSlice';
import { resetSession } from '@/store/slices/interviewSlice';
import { selectSidebarOpen, toggleSidebar } from '@/store/slices/uiSlice';
import { queryClient } from '@/lib/queryClient';
import { authApi } from '@/lib/api/auth';
import { clearTokens } from '@/lib/tokens';
import { useAuth } from '@/hooks/useAuth';
import { SIDEBAR_WIDTH_COLLAPSED, getSidebarWidth } from '@/lib/constants/layout';
import toast from 'react-hot-toast';

const TOOLTIP_GAP = 4;

const NAV_ITEMS = [
  { href: '/superadmin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/superadmin/tenants',   icon: Building2,       label: 'Tenants' },
  { href: '/superadmin/users',     icon: Users,           label: 'Users' },
  { href: '/superadmin/analytics', icon: BarChart2,       label: 'Analytics' },
  { href: '/superadmin/settings',  icon: Settings,        label: 'Settings' },
];

function getInitials(name, email) {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts[1]?.[0] ?? parts[0]?.[0] ?? '';
    return ((a || '') + (b || a || '')).toUpperCase().slice(0, 2) || '·';
  }
  const local = email?.split('@')[0] ?? '';
  return local.slice(0, 2).toUpperCase() || '·';
}

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const sidebarOpen = useAppSelector(selectSidebarOpen);

  const sidebarRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const displayName = user?.name?.trim() || user?.first_name || 'Admin';
  const displayEmail = user?.email || '';
  const initials = getInitials(user?.name, user?.email);
  const shortName = displayName.split(/\s+/)[0] || displayName;

  const sidebarWidth = getSidebarWidth(sidebarOpen);

  const showNavTooltip = (e, label) => {
    const itemRect = e.currentTarget.getBoundingClientRect();
    const sidebarRight = sidebarRef.current?.getBoundingClientRect().right ?? SIDEBAR_WIDTH_COLLAPSED;
    setTooltip({
      label,
      top: itemRect.top + itemRect.height / 2,
      left: sidebarRight + TOOLTIP_GAP,
    });
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearTokens();
    dispatch(clearCredentials());
    dispatch(resetSession());
    queryClient.clear();
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  return (
    <aside
      ref={sidebarRef}
      className="sidebar transition-all duration-300 bg-white border-r border-[#e3e7ee] flex-shrink-0 relative z-50"
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        maxWidth: sidebarWidth,
      }}
    >
      {/* Logo — matches B2C header block */}
      <div className={`flex items-center px-4 py-5 ${sidebarOpen ? 'justify-start' : 'justify-center'}`}>
        {sidebarOpen && (
          <div className="pl-1 min-w-0">
            <Logo size="sm" />
          </div>
        )}
      </div>

      {/* Collapse toggle — same position as B2C */}
      <button
        type="button"
        onClick={() => dispatch(toggleSidebar())}
        className="absolute right-0 top-[29px] translate-x-1/2 z-10 w-8 h-8 rounded-full bg-white border border-[#e3e7ee] shadow-sm text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
      </button>

      {/* Nav */}
      <nav
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden"
        style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center py-2.5 rounded-lg text-[15px] font-medium transition-colors whitespace-nowrap ${
                sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'
              } ${
                active ? 'text-[#0b66d6]' : 'text-[#7b7f8c] hover:text-[#2b3240]'
              }`}
              onMouseEnter={!sidebarOpen ? (e) => showNavTooltip(e, label) : undefined}
              onMouseLeave={!sidebarOpen ? () => setTooltip(null) : undefined}
            >
              <Icon size={19} className="flex-shrink-0" />
              {sidebarOpen && <span className="flex-1 truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {!sidebarOpen && tooltip && (
        <div
          className="fixed z-[200] pointer-events-none -translate-y-1/2"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          <span className="block whitespace-nowrap rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-md border border-slate-100">
            {tooltip.label}
          </span>
        </div>
      )}

      {/* User + logout */}
      <div className="px-3 py-3">
        <div
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 ${
            sidebarOpen ? '' : 'justify-center px-0'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-[#2f3f55] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[#1f2937] text-sm font-medium truncate leading-tight">{shortName}</p>
              <p className="text-slate-500 text-[11px] truncate leading-tight">{displayEmail}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${
            sidebarOpen ? 'px-3' : 'justify-center px-0'
          }`}
          title={!sidebarOpen ? 'Log out' : undefined}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {sidebarOpen && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
