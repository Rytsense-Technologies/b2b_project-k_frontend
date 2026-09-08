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

function getInitials(name, email, fallback = 'U') {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
    return ((a || '') + (b || a || '')).toUpperCase().slice(0, 2) || fallback;
  }
  return (email?.slice(0, 2) ?? fallback).toUpperCase();
}

/**
 * Shared dark-shell sidebar for HOD/Faculty and Student portals
 * (new_updated_design_four visual system).
 */
export default function RolePortalSidebar({
  nav = [],
  ariaLabel = 'Portal',
  tenantTitle = 'Institution',
  tenantSubtitle = '',
  fallbackInitials = 'U',
  loginPath = '/auth/login',
}) {
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
  const displayName = u?.name?.trim() || u?.first_name || ariaLabel;
  const displayEmail = u?.email || '';
  const initials = getInitials(u?.name, u?.email, fallbackInitials);
  const tenantName = u?.college_name || u?.tenant_name || tenantTitle;
  const tenantSub = u?.department || tenantSubtitle;
  const tenantInitials = getInitials(tenantName, displayEmail, fallbackInitials);

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
    router.push(loginPath);
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
          ? tipHandlers(tenantSub ? `${tenantName} · ${tenantSub}` : tenantName, 'right')
          : {})}
      >
        <div className="mark" aria-hidden="true">{tenantInitials}</div>
        <div className="txt">
          <div className="nm">{tenantName}</div>
          {tenantSub ? <div className="sc">{tenantSub}</div> : null}
        </div>
      </div>

      <nav className="nav" aria-label={ariaLabel}>
        {nav.map((item) => {
          if (item.group) {
            return (
              <div key={item.group} className="nav-label" aria-hidden={!sidebarOpen}>
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
              <span className="nav-ico" aria-hidden="true">{item.icon}</span>
              <span className="nav-label-text">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="side-foot">
        <div
          className="who"
          {...(!sidebarOpen
            ? tipHandlers(`${displayName} · ${displayEmail || ariaLabel}`, 'right')
            : {})}
        >
          <div className="av">{initials}</div>
          <div className="who-meta">
            <div className="n">{displayName}</div>
            <div className="r">{displayEmail || ariaLabel}</div>
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
