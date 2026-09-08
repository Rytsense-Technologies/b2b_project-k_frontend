'use client';

import RolePortalSidebar from '@/components/shared/RolePortalSidebar';

const NAV = [
  {
    href: '/student/home',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    href: '/student/subjects',
    label: 'My Subjects',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M15 3v5h5" />
      </svg>
    ),
  },
  {
    href: '/student/leaderboard',
    label: 'Leaderboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M8 21h8M12 17v4" />
        <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
        <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
      </svg>
    ),
  },
  {
    href: '/student/interviews',
    label: 'Interviews',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4z" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    ),
  },
  {
    href: '/student/progress',
    label: 'My Progress',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
];

export default function StudentSidebar() {
  return (
    <RolePortalSidebar
      nav={NAV}
      ariaLabel="Student"
      tenantTitle="Your college"
      tenantSubtitle="Student"
      fallbackInitials="ST"
      loginPath="/student/login"
    />
  );
}
