/** HOD / Faculty page titles — aligned with new_updated_design_four/HodFaculty.dc.html */
export const PAGE_META = {
  '/faculty/dashboard': {
    title: 'Dashboard',
    subtitle: 'Review queues in your scope.',
  },
  '/faculty/videos': {
    title: 'Video review',
    subtitle: 'Approve lectures before students watch them.',
  },
  '/faculty/mcq': {
    title: 'MCQ review',
    subtitle: 'Approve chapter quiz questions.',
  },
  '/faculty/subjects': {
    title: 'Subjects',
    subtitle: 'Subjects in your scope and their review stage.',
  },
  '/faculty/students': {
    title: 'Students',
    subtitle: 'People in your scope.',
  },
  '/faculty/staff': {
    title: 'Department staff',
    subtitle: 'Faculty and the subjects they teach.',
  },
  '/faculty/reports': {
    title: 'Reports',
    subtitle: 'Student and cohort exports.',
  },
  '/faculty/notifications': {
    title: 'Notifications',
    subtitle: 'Review alerts and messages.',
  },
  '/faculty/settings': {
    title: 'Settings',
    subtitle: 'Profile, sign-in and email.',
  },
  '/faculty/analytics': {
    title: 'Department analytics',
    subtitle: 'Completion, quizzes and tutor questions.',
  },
};

const GATED = 'Available to your head of department.';

/** Role-neutral wording while GET /faculty/me is loading (no HOD-only phrasing flashes for Faculty). */
const NEUTRAL = {
  '/faculty/dashboard': { title: 'Dashboard', subtitle: 'Review queues in your scope.' },
  '/faculty/staff': { title: 'Department staff', subtitle: '' },
  '/faculty/reports': { title: 'Reports', subtitle: '' },
  '/faculty/analytics': { title: 'Analytics', subtitle: 'Completion, quizzes and tutor questions.' },
};

/**
 * Role-aware header: PAGE_META is written for the HOD; Faculty (and screens a Faculty
 * member can't use) get their own wording. `scope` is GET /faculty/me (null while loading).
 */
export function facultyPageMeta(route, scope) {
  const base = PAGE_META[route] || { title: 'HOD / Faculty', subtitle: '' };
  if (!scope) return NEUTRAL[route] || base;
  if (scope.is_hod) return base;
  const limited = Boolean(scope.subject_limited);
  switch (route) {
    case '/faculty/dashboard':
      return { ...base, subtitle: limited ? 'Review queues for the subjects you teach.' : base.subtitle };
    case '/faculty/analytics':
      return {
        title: 'Analytics',
        subtitle: limited
          ? 'Completion, quizzes and tutor questions for your subjects.'
          : 'Completion, quizzes and tutor questions (view only).',
      };
    case '/faculty/staff':
      return scope.can_see_staff ? base : { ...base, subtitle: GATED };
    case '/faculty/reports':
      return scope.can_export_reports ? base : { ...base, subtitle: GATED };
    default:
      return base;
  }
}
