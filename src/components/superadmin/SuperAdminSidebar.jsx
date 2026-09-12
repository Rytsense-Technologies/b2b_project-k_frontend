'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import QuirriLogo from '@/components/superadmin/QuirriLogo';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCredentials } from '@/store/slices/authSlice';
import { resetSession } from '@/store/slices/interviewSlice';
import { selectSidebarOpen, toggleSidebar } from '@/store/slices/uiSlice';
import { queryClient } from '@/lib/queryClient';
import { authApi } from '@/lib/api/auth';
import { clearTokens } from '@/lib/tokens';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const NAV = [
  {
    href: '/superadmin/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  { group: 'Institutions' },
  {
    href: '/superadmin/universities',
    label: 'Universities',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 3L2 8l10 5 10-5-10-5z" />
        <path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" />
      </svg>
    ),
  },
  {
    href: '/superadmin/colleges',
    label: 'Colleges',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 21h18M5 21V8l7-4 7 4v13" />
        <path d="M10 21v-6h4v6" />
      </svg>
    ),
  },
  {
    href: '/superadmin/departments',
    label: 'Departments',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 6h16M4 12h10M4 18h14" />
        <circle cx="18" cy="12" r="2" />
      </svg>
    ),
  },
  {
    href: '/superadmin/users',
    label: 'Platform Users',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
        <path d="M17 8.5h4M19 6.5v4" />
      </svg>
    ),
  },
  { group: 'Content' },
  {
    href: '/superadmin/reports',
    label: 'Reports',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M15 3v5h5M9 13h6M9 17h4" />
      </svg>
    ),
  },
  { group: 'Operations' },
  {
    href: '/superadmin/health',
    label: 'Platform Health',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    href: '/superadmin/audit',
    label: 'Audit Logs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M9 11l3 3 8-8" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: '/superadmin/notifications',
    label: 'Notifications',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
    ),
  },
  {
    href: '/superadmin/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V1a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 2.6a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H23a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.7z" />
      </svg>
    ),
  },
];

function getInitials(name, email) {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
    return ((a || '') + (b || a || '')).toUpperCase().slice(0, 2) || 'SA';
  }
  return (email?.slice(0, 2) ?? 'SA').toUpperCase();
}

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const { user } = useAuth();
  const { show: showTip, hide: hideTip, TipLayer } = useQuirriTip();

  const [sessionUIReady, setSessionUIReady] = useState(false);
  useEffect(() => {
    setSessionUIReady(true);
  }, []);

  useEffect(() => {
    hideTip();
  }, [sidebarOpen, hideTip]);

  const u = sessionUIReady ? user : null;
  const displayName = u?.name?.trim() || u?.first_name || 'Super Admin';
  const displayEmail = u?.email || 'admin@quirri.ai';
  const initials = getInitials(u?.name, u?.email);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearTokens();
    dispatch(clearCredentials());
    dispatch(resetSession());
    queryClient.clear();
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  const tipHandlers = (label, placement = 'right') => ({
    onMouseEnter: (e) => showTip(e, label, placement),
    onMouseLeave: hideTip,
    onFocus: (e) => showTip(e, label, placement),
    onBlur: hideTip,
  });

  return (
    <aside className={`sidebar${sidebarOpen ? '' : ' is-collapsed'}`}>
      <div className="brand">
        <div className="brand-mark">
          <QuirriLogo className="logo-full" size="sm" onDark priority />
          <QuirriLogo className="logo-mark" compact onDark aria-hidden={!sidebarOpen} />
        </div>
      </div>

      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => dispatch(toggleSidebar())}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        {...tipHandlers(sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar', 'right')}
      >
        {sidebarOpen ? '‹' : '›'}
      </button>

      <div
        className="tenant-box platform"
        {...(!sidebarOpen ? tipHandlers('Quirri Platform · Super Admin · all tenants', 'right') : {})}
      >
        <div className="mark" aria-hidden="true">QR</div>
        <div className="txt">
          <div className="nm">Quirri Platform</div>
          <div className="sc">Super Admin · all tenants</div>
        </div>
      </div>

      <nav className="nav" aria-label="Super Admin">
        {NAV.map((item) => {
          if (item.group) {
            return (
              <div
                key={item.group}
                className="nav-label"
                aria-hidden={!sidebarOpen}
              >
                {item.group}
              </div>
            );
          }
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? 'active' : ''}
              aria-label={item.label}
              {...(!sidebarOpen ? tipHandlers(item.label, 'right') : { onMouseLeave: hideTip })}
            >
              <span className="nav-ico" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nav-label-text">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="side-foot">
        <div
          className="who"
          {...(!sidebarOpen
            ? tipHandlers(`${displayName} · ${displayEmail}`, 'right')
            : {})}
        >
          <div className="av">{initials}</div>
          <div className="who-meta">
            <div className="n">{displayName}</div>
            <div className="r">{displayEmail}</div>
          </div>
          <button
            type="button"
            className="logout"
            onClick={handleLogout}
            aria-label="Log out"
            {...tipHandlers('Log out', sidebarOpen ? 'top' : 'right')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>

      <TipLayer />
    </aside>
  );
}
