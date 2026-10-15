/** HOD / Faculty page titles — aligned with new_updated_design_four/HodFaculty.dc.html */
export const PAGE_META = {
  '/faculty/dashboard': {
    title: 'Dashboard',
    subtitle: 'Review queues and department activity in your scope.',
  },
  '/faculty/videos': {
    title: 'Video review',
    subtitle: 'Approve generated lectures before students can watch them.',
  },
  '/faculty/mcq': {
    title: 'MCQ review',
    subtitle: 'Review generated questions for each chapter quiz.',
  },
  '/faculty/subjects': {
    title: 'Subjects',
    subtitle: 'Subjects in your scope and how far each is through review.',
  },
  '/faculty/students': {
    title: 'Students',
    subtitle: 'Students within your scope, with learning and assessment activity.',
  },
  '/faculty/interviews': {
    title: 'Interview assignments',
    subtitle: 'Assign AI mock interviews to cohorts in your department.',
  },
  '/faculty/staff': {
    title: 'Department staff',
    subtitle: 'Faculty in your department and the subjects each one teaches.',
  },
  '/faculty/reports': {
    title: 'Reports',
    subtitle: 'Student and cohort reports for your department.',
  },
  '/faculty/notifications': {
    title: 'Notifications',
    subtitle: 'Review alerts and other messages Quirri sent you.',
  },
  '/faculty/settings': {
    title: 'Settings',
    subtitle: 'Your profile and account security.',
  },
  '/faculty/analytics': {
    title: 'Department analytics',
    subtitle: 'Completion, assessment performance, and Q&A demand for your department.',
  },
};

const GATED = 'Available to your head of department.';

/** Role-neutral wording while GET /faculty/me is loading (no HOD-only phrasing flashes for Faculty). */
const NEUTRAL = {
  '/faculty/dashboard': { title: 'Dashboard', subtitle: 'Review queues and activity in your scope.' },
  '/faculty/interviews': { title: 'Interviews', subtitle: 'Mock interview assignments and results.' },
  '/faculty/staff': { title: 'Department staff', subtitle: '' },
  '/faculty/reports': { title: 'Reports', subtitle: '' },
  '/faculty/analytics': { title: 'Analytics', subtitle: 'Completion, quiz scores and tutor questions.' },
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
      return { ...base, subtitle: limited ? 'Review queues and activity for the subjects you teach.' : base.subtitle };
    case '/faculty/interviews':
      return scope.can_assign_interviews ? base : {
        ...base,
        subtitle: 'Mock interviews your HOD assigned, and how your students are doing.',
      };
    case '/faculty/analytics':
      return {
        title: 'Analytics',
        subtitle: limited
          ? 'Completion, quiz scores and tutor questions for the students and subjects you teach.'
          : 'Completion, quiz scores and tutor questions across your department (view only).',
      };
    case '/faculty/staff':
      return scope.can_see_staff ? base : { ...base, subtitle: GATED };
    case '/faculty/reports':
      return scope.can_export_reports ? base : { ...base, subtitle: GATED };
    default:
      return base;
  }
}
