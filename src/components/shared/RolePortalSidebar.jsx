'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import QuirriLogo from '@/components/superadmin/QuirriLogo';
import { useQuirriTip } from '@/components/superadmin/QuirriTooltip';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearCredentials } from '@/store/slices/authSlice';
import { selectSidebarOpen, toggleSidebar } from '@/store/slices/uiSlice';
import { queryClient } from '@/lib/queryClient';
import { authApi } from '@/lib/api/auth';
import { clearTokens } from '@/lib/tokens';
import { clearFacultyScopeCache } from '@/hooks/useFacultyScope';
import { useAuth } from '@/hooks/useAuth';
import { titleCase } from '@/lib/student/learning';
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
  /** Account menu items on the user row (quirri-b2c-student-ui: avatar row opens a menu). */
  menuLinks = [],
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const { user } = useAuth();

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);
  const { show: showTip, hide: hideTip, TipLayer } = useQuirriTip();

  const [sessionUIReady, setSessionUIReady] = useState(false);
  useEffect(() => {
    setSessionUIReady(true);
  }, []);

  useEffect(() => {
    hideTip();
  }, [sidebarOpen, hideTip]);

  const u = sessionUIReady ? user : null;
  // Until the profile arrives, show neutral placeholders - never "Your college / Student Student".
  const pending = !u;
  // Names are stored as typed ("siva prakasham m"); show them title-cased.
  const displayName = titleCase(u?.name?.trim() || u?.first_name || '') || ariaLabel;
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
    clearFacultyScopeCache();
    dispatch(clearCredentials());
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
          <QuirriLogo className="logo-full" size="sm" priority />
          <QuirriLogo className="logo-mark" compact aria-hidden={!sidebarOpen} />
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
        <div className={`mark${pending ? ' rps-sk' : ''}`} aria-hidden="true">{pending ? '' : tenantInitials}</div>
        <div className="txt">
          {pending ? (
            <>
              <div className="nm"><span className="rps-sk rps-sk--line" aria-hidden="true" /></div>
              <div className="sc"><span className="rps-sk rps-sk--line rps-sk--short" aria-hidden="true" /></div>
            </>
          ) : (
            <>
              <div className="nm">{tenantName}</div>
              {tenantSub ? <div className="sc">{tenantSub}</div> : null}
            </>
          )}
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
          ref={menuRef}
          {...(!sidebarOpen
            ? tipHandlers(`${displayName} · ${displayEmail || ariaLabel}`, 'right')
            : {})}
        >
          {menuLinks.length ? (
            <button
              type="button"
              className="who-trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              onClick={() => setMenuOpen((v) => !v)}
            />
          ) : null}
          {menuOpen ? (
            <div className="who-menu" role="menu">
              {menuLinks.map((it) => (
                <Link key={it.href} href={it.href} role="menuitem" onClick={() => setMenuOpen(false)}>{it.label}</Link>
              ))}
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); handleLogout(); }}>Sign out</button>
            </div>
          ) : null}
          <div className={`av${pending ? ' rps-sk' : ''}`}>{pending ? '' : initials}</div>
          <div className="who-meta">
            {pending ? (
              <>
                <div className="n"><span className="rps-sk rps-sk--line" aria-hidden="true" /></div>
                <div className="r"><span className="rps-sk rps-sk--line rps-sk--short" aria-hidden="true" /></div>
              </>
            ) : (
              <>
                <div className="n">{displayName}</div>
                <div className="r">{displayEmail || ariaLabel}</div>
              </>
            )}
          </div>
          {/* One sign-out control: with an account menu, Sign out lives in the menu. */}
          {menuLinks.length ? null : (
            <button
              type="button"
              className="logout"
              onClick={handleLogout}
              aria-label="Sign out"
              {...tipHandlers('Sign out', sidebarOpen ? 'top' : 'right')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <TipLayer />
    </aside>
  );
}
