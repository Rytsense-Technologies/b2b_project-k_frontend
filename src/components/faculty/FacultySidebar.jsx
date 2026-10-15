'use client';

import RolePortalSidebar from '@/components/shared/RolePortalSidebar';
import { useFacultyScope } from '@/hooks/useFacultyScope';
import { useAuth } from '@/hooks/useAuth';

const NAV = [
  {
    href: '/faculty/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  { group: 'Review' },
  {
    href: '/faculty/videos',
    label: 'Video review',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M10 9l5 3-5 3V9z" />
      </svg>
    ),
  },
  {
    href: '/faculty/mcq',
    label: 'MCQ review',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M9 11l3 3 8-8" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  { group: 'Teaching' },
  {
    href: '/faculty/subjects',
    label: 'Subjects',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M15 3v5h5" />
      </svg>
    ),
  },
  {
    href: '/faculty/students',
    label: 'Students',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
      </svg>
    ),
  },
  {
    href: '/faculty/interviews',
    label: 'Interview assignments',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4z" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    ),
  },
  { group: 'Insights' },
  {
    href: '/faculty/analytics',
    label: 'Analytics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
];

const ICON = {
  staff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3.2 2.7-5 6-5s6 1.8 6 5" />
      <path d="M17 7l2 2 3-3.2" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M15 3v5h5M9 13h6M9 17h4" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V1a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 2.6a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H23a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.7z" />
    </svg>
  ),
};

/** HOD gets Staff + Reports; everyone gets Notifications + Settings. */
function buildNav(isHod) {
  const out = [];
  const interviews = NAV.find((item) => item.href === '/faculty/interviews');
  NAV.forEach((item) => {
    // Faculty only read interview assignments: they sit under Insights as "Interviews".
    if (!isHod && item === interviews) return;
    // HOD sees the whole department; Faculty see their own subjects.
    out.push(isHod && item.href === '/faculty/analytics' ? { ...item, label: 'Department analytics' } : item);
    if (isHod && item.href === '/faculty/students') {
      out.push({ href: '/faculty/staff', label: 'Department staff', icon: ICON.staff });
    }
    if (isHod && item.href === '/faculty/analytics') {
      out.push({ href: '/faculty/reports', label: 'Reports', icon: ICON.reports });
    }
    if (!isHod && item.href === '/faculty/analytics') {
      out.push({ ...interviews, label: 'Interviews' });
    }
  });
  out.push({ group: 'Account' });
  out.push({ href: '/faculty/notifications', label: 'Notifications', icon: ICON.bell });
  out.push({ href: '/faculty/settings', label: 'Settings', icon: ICON.settings });
  return out;
}

export default function FacultySidebar() {
  const { scope } = useFacultyScope();
  const { role } = useAuth();
  // Only /faculty/me knows HOD vs Faculty: an HOD's session role can still read "faculty".
  // Until scope loads, show no links rather than the wrong menu (a definite 'hod' role is safe).
  const known = Boolean(scope) || role === 'hod';
  const isHod = scope ? Boolean(scope.is_hod) : role === 'hod';
  const roleLabel = known ? (isHod ? 'Head of department' : 'Faculty') : 'HOD / Faculty';
  return (
    <RolePortalSidebar
      nav={known ? buildNav(isHod) : []}
      ariaLabel="HOD / Faculty"
      tenantTitle="Your department"
      tenantSubtitle={roleLabel}
      fallbackInitials="HF"
      loginPath="/auth/login"
    />
  );
}
