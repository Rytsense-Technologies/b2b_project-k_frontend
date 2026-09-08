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
    href: '/admin/dashboard',
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
  { group: 'Academics' },
  {
    href: '/admin/structure',
    label: 'Academic Structure',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 6h18M3 12h18M3 18h18" />
        <circle cx="7" cy="6" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="9" cy="18" r="1" />
      </svg>
    ),
  },
  {
    href: '/admin/content',
    label: 'Upload & Content',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
        <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
      </svg>
    ),
  },
  { group: 'People' },
  {
    href: '/admin/students',
    label: 'Students',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
      </svg>
    ),
  },
  {
    href: '/admin/staff',
    label: 'Staff & HOD',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19c0-3.2 2.7-5 6-5s6 1.8 6 5" />
        <path d="M17 7l2 2 3-3.2" />
      </svg>
    ),
  },
  { group: 'Placement' },
  {
    href: '/admin/interviews',
    label: 'Interview Assignments',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4z" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    ),
  },
  { group: 'Insights' },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
  {
    href: '/admin/reports',
    label: 'Reports',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M15 3v5h5M9 13h6M9 17h4" />
      </svg>
    ),
  },
  { group: 'Account' },
  {
    href: '/admin/settings',
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
    return ((a || '') + (b || a || '')).toUpperCase().slice(0, 2) || 'CA';
  }
  return (email?.slice(0, 2) ?? 'CA').toUpperCase();
}

export default function CollegeAdminSidebar() {
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
  const displayName = u?.name?.trim() || u?.first_name || 'College Admin';
  const displayEmail = u?.email || '';
  const initials = getInitials(u?.name, u?.email);

  const collegeName = u?.college_name || u?.tenant_name || 'Your college';
  const universityName = u?.university_name || '';
  const tenantInitials = getInitials(collegeName, displayEmail);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clearTokens();
    dispatch(clearCredentials());
    dispatch(resetSession());
    queryClient.clear();
    toast.success('Logged out successfully');
    router.push('/admin/login');
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
        className="tenant-box"
        {...(!sidebarOpen
          ? tipHandlers(
              universityName ? `${collegeName} · ${universityName}` : collegeName,
              'right',
            )
          : {})}
      >
        <div className="mark" aria-hidden="true">{tenantInitials}</div>
        <div className="txt">
          <div className="nm">{collegeName}</div>
          {universityName ? <div className="sc">{universityName}</div> : null}
        </div>
      </div>

      <nav className="nav" aria-label="College Admin">
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
            ? tipHandlers(`${displayName} · ${displayEmail || 'College Admin'}`, 'right')
            : {})}
        >
          <div className="av">{initials}</div>
          <div className="who-meta">
            <div className="n">{displayName}</div>
            <div className="r">{displayEmail || 'College Admin'}</div>
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
