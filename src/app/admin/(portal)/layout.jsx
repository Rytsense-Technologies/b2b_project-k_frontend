'use client';

import { usePathname } from 'next/navigation';
// Pages read the URL (useSearchParams); Next needs a Suspense boundary for the production build.
import { Suspense, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setRoleDataOnly } from '@/store/slices/authSlice';
import { selectSidebarOpen } from '@/store/slices/uiSlice';
import { getRoleCookie, getTenantCookie, clearRoleCookie, clearTenantCookie } from '@/lib/tokens';
import { PAGE_META } from '@/lib/admin/pageMeta';
import CollegeAdminSidebar from '@/components/admin/CollegeAdminSidebar';
import { PageHeaderProvider, PortalTopbar, resolvePageMeta } from '@/components/shared/PageHeader';
import { useHydrateProfile } from '@/hooks/useHydrateProfile';
import { MobileNavButton, MobileNavScrim, mobileNavShellClass, useMobileNav } from '@/components/shared/MobileNav';
import { usePortalDocumentTitle } from '@/hooks/usePortalDocumentTitle';

export default function CollegeAdminLayout({ children }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  // Sidebar college / university / name come from /auth/me - refreshed on
  // every portal load so a new tab never shows placeholders.
  useHydrateProfile({ always: true });
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

  const meta = resolvePageMeta(PAGE_META, pathname, { title: 'College Admin', subtitle: '' });
  usePortalDocumentTitle(meta.title, 'College Admin');

  return (
    <div className={`app q-app-shell ${mobileNavShellClass(navOpen)}`}>
      <CollegeAdminSidebar />
      <MobileNavScrim navOpen={navOpen} onClose={closeNav} />

      <PageHeaderProvider>
        <div className={`main${sidebarOpen ? '' : ' is-collapsed'}`}>
          <PortalTopbar
            meta={meta}
            home={{ label: 'Home', href: '/admin/dashboard' }}
            leading={<MobileNavButton navOpen={navOpen} onOpen={openNav} />}
          />

          <main className="content"><Suspense fallback={<div className="pm-route-loading" role="status" aria-live="polite">Loading…</div>}>{children}</Suspense></main>
        </div>
      </PageHeaderProvider>
    </div>
  );
}
