'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import QuirriLogo from '@/components/superadmin/QuirriLogo';
import { useAppDispatch } from '@/store/hooks';
import { clearCredentials } from '@/store/slices/authSlice';
import { resetSession } from '@/store/slices/interviewSlice';
import { queryClient } from '@/lib/queryClient';
import { authApi } from '@/lib/api/auth';
import { clearTokens } from '@/lib/tokens';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { href: '/superadmin/dashboard', icon: '▦', label: 'Dashboard' },
  { href: '/superadmin/colleges', icon: '▣', label: 'Colleges' },
  { href: '/superadmin/departments', icon: '▧', label: 'Departments' },
  { href: '/superadmin/skills', icon: '✦', label: 'AI Skill Courses' },
  { href: '/superadmin/ai-usage', icon: '◇', label: 'AI Usage' },
  { href: '/superadmin/emails', icon: '✉', label: 'Email Management' },
  { href: '/superadmin/reports', icon: '▤', label: 'Reports' },
  { href: '/superadmin/audit', icon: '☰', label: 'Audit Logs' },
  { href: '/superadmin/settings', icon: '⚙', label: 'Settings' },
];

function getInitials(name, email) {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
    return ((a || '') + (b || a || '')).toUpperCase().slice(0, 2) || 'SA';
  }
  return (email?.slice(0, 2) ?? 'SA').toUpperCase();
}

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const displayName = user?.name?.trim() || user?.first_name || 'Super Admin';
  const displayEmail = user?.email || 'admin@quirri.ai';
  const initials = getInitials(user?.name, user?.email);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearTokens();
    dispatch(clearCredentials());
    dispatch(resetSession());
    queryClient.clear();
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  return (
    <aside className="quirri-sidebar">
      <QuirriLogo />

      <nav className="quirri-nav">
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const active = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className={active ? 'active' : ''}>
              <span aria-hidden="true">{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div>
        <div className="quirri-profile">
          <div className="quirri-avatar">{initials}</div>
          <div>
            <b>{displayName}</b>
            <br />
            <small>{displayEmail}</small>
          </div>
        </div>
        <button type="button" className="quirri-logout" onClick={handleLogout}>
          <span aria-hidden="true">↪</span>
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
