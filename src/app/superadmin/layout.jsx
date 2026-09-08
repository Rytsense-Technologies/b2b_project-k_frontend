'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setRoleDataOnly } from '@/store/slices/authSlice';
import { selectSidebarOpen } from '@/store/slices/uiSlice';
import { getRoleCookie, getTenantCookie, clearRoleCookie, clearTenantCookie } from '@/lib/tokens';
import { PAGE_META } from '@/lib/superadmin/pageMeta';
import SuperAdminSidebar from '@/components/superadmin/SuperAdminSidebar';

export default function SuperAdminLayout({ children }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector(selectSidebarOpen);

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
    <div className="app q-app-shell">
      <SuperAdminSidebar />

      <div className={`main${sidebarOpen ? '' : ' is-collapsed'}`}>
        <div className="topbar">
          <div>
            <h1>{meta.title}</h1>
            {meta.subtitle ? <p>{meta.subtitle}</p> : null}
          </div>
        </div>

        <div className="content">{children}</div>
      </div>
    </div>
  );
}
