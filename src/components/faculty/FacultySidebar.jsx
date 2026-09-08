'use client';

import RolePortalSidebar from '@/components/shared/RolePortalSidebar';

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
    label: 'Video Review',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M10 9l5 3-5 3V9z" />
      </svg>
    ),
  },
  {
    href: '/faculty/mcq',
    label: 'MCQ Review',
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
    label: 'Interview Assignments',
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
    label: 'Department Analytics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
];

export default function FacultySidebar() {
  return (
    <RolePortalSidebar
      nav={NAV}
      ariaLabel="HOD / Faculty"
      tenantTitle="Your department"
      tenantSubtitle="HOD / Faculty"
      fallbackInitials="HF"
      loginPath="/faculty/login"
    />
  );
}
