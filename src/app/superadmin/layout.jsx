'use client';

import { usePathname } from 'next/navigation';
// Pages read the URL (useSearchParams); Next needs a Suspense boundary for the production build.
import { Suspense, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setRoleDataOnly } from '@/store/slices/authSlice';
import { selectSidebarOpen } from '@/store/slices/uiSlice';
import { getRoleCookie, getTenantCookie, clearRoleCookie, clearTenantCookie } from '@/lib/tokens';
import { PAGE_META } from '@/lib/superadmin/pageMeta';
import SuperAdminSidebar from '@/components/superadmin/SuperAdminSidebar';
import { useHydrateProfile } from '@/hooks/useHydrateProfile';
import { MobileNavButton, MobileNavScrim, mobileNavShellClass, useMobileNav } from '@/components/shared/MobileNav';

export default function SuperAdminLayout({ children }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  useHydrateProfile();
  // Phones: the sidebar is off-canvas; this opens it as a drawer.
  const { navOpen, openNav, closeNav } = useMobileNav();

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

  const matchedRoute = Object.keys(PAGE_META).find((k) => pathname?.startsWith(k));
  const meta = matchedRoute ? PAGE_META[matchedRoute] : { title: 'Super Admin', subtitle: '' };

  return (
    <div className={`app q-app-shell sa-shell ${mobileNavShellClass(navOpen)}`}>
      <SuperAdminSidebar />
      <MobileNavScrim navOpen={navOpen} onClose={closeNav} />

      <div className={`main${sidebarOpen ? '' : ' is-collapsed'}`}>
        <div className="topbar">
          <MobileNavButton navOpen={navOpen} onOpen={openNav} />
          <div>
            <h1>{meta.title}</h1>
            {meta.subtitle ? <p>{meta.subtitle}</p> : null}
          </div>
        </div>

        <main className="content"><Suspense fallback={<div className="pm-route-loading" role="status" aria-live="polite">Loading…</div>}>{children}</Suspense></main>
      </div>
    </div>
  );
}
