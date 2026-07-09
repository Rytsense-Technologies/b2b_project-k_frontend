'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSidebarOpen } from '@/store/slices/uiSlice';
import {
  CONTENT_PADDING_CLASS,
  CONTENT_INNER_CLASS,
  getMainContentOffset,
} from '@/lib/constants/layout';
import { setRoleDataOnly } from '@/store/slices/authSlice';
import { getRoleCookie, getTenantCookie, clearRoleCookie, clearTenantCookie } from '@/lib/tokens';
import { Bell } from 'lucide-react';
import SuperAdminSidebar from '@/components/superadmin/SuperAdminSidebar';

const PAGE_TITLES = {
  '/superadmin/dashboard': 'Dashboard',
  '/superadmin/tenants':   'Tenant Management',
  '/superadmin/users':     'User Management',
  '/superadmin/analytics': 'Analytics',
  '/superadmin/settings':  'Settings',
};

const PAGE_SUBTITLES = {
  '/superadmin/dashboard':
    "Monitor tenant activity, interview sessions, and platform health from one place.",
  '/superadmin/settings':
    'Manage your account, security, and notification preferences.',
};

export default function SuperAdminLayout({ children }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const mainOffset = getMainContentOffset(sidebarOpen);

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

  const matchedRoute = Object.keys(PAGE_TITLES).find((k) => pathname?.startsWith(k));
  const title = matchedRoute ? PAGE_TITLES[matchedRoute] : 'Super Admin';
  const subtitle = matchedRoute ? PAGE_SUBTITLES[matchedRoute] : undefined;

  return (
    <div className="min-h-screen bg-app">
      <SuperAdminSidebar />

      <div
        className="relative z-0 min-w-0 transition-all duration-300 bg-app"
        style={{ marginLeft: mainOffset }}
      >
        <div className={CONTENT_PADDING_CLASS}>
          <div className={CONTENT_INNER_CLASS}>
            <header
              className="sticky top-0 z-30 flex items-center gap-4 border-b border-[#e3e7ee]/60 bg-app"
              style={{ height: subtitle ? 80 : 64 }}
            >
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-slate-800 leading-tight">{title}</h1>
                {subtitle ? (
                  <p className="text-sm text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="relative p-2 rounded-lg text-slate-500 hover:bg-black/[0.04] transition-colors flex-shrink-0"
                aria-label="Notifications"
              >
                <Bell size={18} />
              </button>
            </header>

            <main className="min-h-screen bg-app">
              <div className="pt-1 pb-6 w-full">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
