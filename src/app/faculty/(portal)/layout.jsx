'use client';

import { usePathname } from 'next/navigation';
// Pages read the URL (useSearchParams); Next needs a Suspense boundary for the production build.
import { Suspense, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setRoleDataOnly } from '@/store/slices/authSlice';
import { selectSidebarOpen } from '@/store/slices/uiSlice';
import { getRoleCookie, getTenantCookie, clearRoleCookie, clearTenantCookie } from '@/lib/tokens';
import { PAGE_META, facultyPageMeta } from '@/lib/faculty/pageMeta';
import { useFacultyScope } from '@/hooks/useFacultyScope';
import FacultySidebar from '@/components/faculty/FacultySidebar';
import FacultyAccessGate from '@/components/faculty/FacultyAccessGate';
import { useHydrateProfile } from '@/hooks/useHydrateProfile';
import { MobileNavButton, MobileNavScrim, mobileNavShellClass, useMobileNav } from '@/components/shared/MobileNav';
import { usePortalDocumentTitle } from '@/hooks/usePortalDocumentTitle';
import SystemNotificationBell from '@/components/shared/SystemNotificationBell';

export default function FacultyLayout({ children }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  // Name / college in the sidebar come from /auth/me (a new tab has none).
  useHydrateProfile({ always: true });
  const { navOpen, openNav, closeNav } = useMobileNav();
  const { scope } = useFacultyScope();

  useEffect(() => {
    const role = getRoleCookie();
    const tenantId = getTenantCookie();
    const pkSession = document.cookie
      .split('; ')
      .find((c) => c.startsWith('pk_session='))
      ?.split('=')[1] ?? null;

    if (role) {
      if (pkSession) {
        dispatch(setRoleDataOnly({ role, tenantId }));
      } else {
        clearRoleCookie();
        clearTenantCookie();
      }
    }
  }, [dispatch]);

  const matchedRoute = Object.keys(PAGE_META)
    .filter((k) => pathname?.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  const meta = matchedRoute ? facultyPageMeta(matchedRoute, scope) : { title: 'Page not found', subtitle: 'This address does not match a page in your portal.' };
  // Omit the portal label until GET /faculty/me lands so Faculty never flashes "HOD".
  const portalLabel = !scope ? '' : (scope.is_hod ? 'HOD' : 'Faculty');
  usePortalDocumentTitle(meta.title, portalLabel);

  return (
    <div className={`app q-app-shell q-faculty ${mobileNavShellClass(navOpen)}`}>
      <FacultySidebar />
      <MobileNavScrim navOpen={navOpen} onClose={closeNav} />
      <div className={`main${sidebarOpen ? '' : ' is-collapsed'}`}>
        <div className="topbar">
          <MobileNavButton navOpen={navOpen} onOpen={openNav} />
          <div className="topbar-copy">
            <h1>{meta.title}</h1>
            {meta.subtitle ? <p>{meta.subtitle}</p> : null}
          </div>
          <div className="topbar-right">
            <div className="pm-topbar-slot" />
            <SystemNotificationBell portal="faculty" />
          </div>
        </div>
        <main className="content" id="main-content"><FacultyAccessGate><Suspense fallback={<div className="pm-route-loading" role="status" aria-live="polite">Loading…</div>}>{children}</Suspense></FacultyAccessGate></main>
      </div>
    </div>
  );
}
