'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setRoleDataOnly, setCredentials, setUser } from '@/store/slices/authSlice';
import { selectSidebarOpen } from '@/store/slices/uiSlice';
import { getRoleCookie, getTenantCookie, clearRoleCookie, clearTenantCookie } from '@/lib/tokens';
import { PAGE_META } from '@/lib/admin/pageMeta';
import CollegeAdminSidebar from '@/components/admin/CollegeAdminSidebar';
import { settingsApi, fetchData } from '@/lib/api/superadmin/modules';
import { getPermissions, ROLES } from '@/lib/permissions';

export default function CollegeAdminLayout({ children }) {
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchData(() => settingsApi.get());
        if (cancelled || !me) return;
        const first = me.first_name ?? '';
        const last = me.last_name ?? '';
        const name = [first, last].filter(Boolean).join(' ') || me.name || me.email;
        dispatch(setUser({
          id: me.id,
          email: me.email,
          first_name: first || null,
          last_name: last || null,
          name,
          college_name: me.college_name ?? me.tenant_name ?? null,
          university_name: me.university_name ?? null,
          tenant_name: me.tenant_name ?? me.college_name ?? null,
          department: me.department ?? null,
          phone: me.phone_number ?? me.phone ?? null,
        }));
        const role = me.role || getRoleCookie() || ROLES.COLLEGE_ADMIN;
        const tenantId = me.tenant_id ?? getTenantCookie();
        dispatch(setRoleDataOnly({ role, tenantId }));
        if (!getRoleCookie()) {
          dispatch(setCredentials({
            user: {
              id: me.id,
              email: me.email,
              first_name: first,
              last_name: last,
              name,
              college_name: me.college_name ?? me.tenant_name,
              university_name: me.university_name,
              tenant_name: me.tenant_name ?? me.college_name,
            },
            role,
            tenant_id: tenantId,
            permissions: me.permissions?.length ? me.permissions : getPermissions(ROLES.COLLEGE_ADMIN),
            plan: me.plan || 'standard',
            onboarding_complete: true,
            plan_selected: true,
          }));
        }
      } catch {
        /* keep cookie/sessionStorage user */
      }
    })();
    return () => { cancelled = true; };
  }, [dispatch]);

  const matchedRoute = Object.keys(PAGE_META).find((k) => pathname?.startsWith(k));
  const meta = matchedRoute ? PAGE_META[matchedRoute] : { title: 'College Admin', subtitle: '' };

  return (
    <div className="app q-app-shell">
      <CollegeAdminSidebar />

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
