'use client';

import { usePathname } from 'next/navigation';
// Pages read the URL (useSearchParams); Next needs a Suspense boundary for the production build.
import { Suspense, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setRoleDataOnly } from '@/store/slices/authSlice';
import { selectSidebarOpen } from '@/store/slices/uiSlice';
import { getRoleCookie, getTenantCookie, clearRoleCookie, clearTenantCookie } from '@/lib/tokens';
import { useHydrateProfile } from '@/hooks/useHydrateProfile';
import { MobileNavButton, MobileNavScrim, mobileNavShellClass, useMobileNav } from '@/components/shared/MobileNav';
import { PAGE_META } from '@/lib/student/pageMeta';
import StudentSidebar from '@/components/student/StudentSidebar';
import '@/styles/student-portal.css';

/**
 * Redesign (14 Oct 2026): every student page keeps the shell top bar (spec X5). Interviews is now a
 * tabbed module (Start · Assigned · History), so its title must hold for a locked student too.
 * TODO(main session): move into lib/student/pageMeta.js.
 */
export default function StudentLayout({ children }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  useHydrateProfile();
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

  const matchedRoute = Object.keys(PAGE_META)
    .filter((k) => pathname?.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  const meta = matchedRoute ? PAGE_META[matchedRoute] : { title: 'Student', subtitle: '' };

  return (
    <div className={`app q-app-shell q-student ${mobileNavShellClass(navOpen)}`}>
      <StudentSidebar />
      <MobileNavScrim navOpen={navOpen} onClose={closeNav} />
      <div className={`main${sidebarOpen ? '' : ' is-collapsed'}`}>
        <div className="topbar">
          <MobileNavButton navOpen={navOpen} onOpen={openNav} />
          <div>
            <h1>{meta.title}</h1>
            {meta.subtitle ? <p>{meta.subtitle}</p> : null}
          </div>
        </div>
        <main className="content" id="main-content"><Suspense fallback={<div className="pm-route-loading" role="status" aria-live="polite">Loading…</div>}>{children}</Suspense></main>
      </div>
    </div>
  );
}
