/** College Admin page titles/subtitles — aligned with Client Demo college-admin.html */
export const PAGE_META = {
  '/admin/dashboard': {
    title: 'Dashboard',
    subtitle: 'Last 30 days across your college.',
  },
  '/admin/structure': {
    title: 'Academic structure',
    subtitle: 'Departments, programmes, semesters and subjects.',
  },
  '/admin/structure/departments': {
    title: 'Departments',
    subtitle: 'HODs and the departments they review.',
    crumbs: [{ label: 'Academic structure' }],
  },
  '/admin/structure/programmes': {
    title: 'Programmes & subjects',
    subtitle: 'Programmes, semesters, subjects and chapters.',
    crumbs: [{ label: 'Academic structure' }],
  },
  '/admin/mcq': {
    title: 'MCQ review',
    subtitle: 'Approve questions before students sit the quiz.',
  },
  '/admin/notifications': {
    title: 'Notifications',
    subtitle: 'Your alerts, college rules and deliveries.',
  },
  '/admin/content': {
    title: 'Upload & content',
    subtitle: 'Chapter uploads and lecture status.',
  },
  '/admin/students': {
    title: 'Students',
    subtitle: 'People in every department.',
  },
  '/admin/staff': {
    title: 'Staff & HOD',
    subtitle: 'Faculty and heads of department.',
  },
  '/admin/analytics': {
    title: 'Analytics',
    subtitle: 'Completion, quizzes and tutor questions.',
  },
  '/admin/reports': {
    title: 'Reports',
    subtitle: 'Student and cohort exports.',
  },
  '/admin/settings': {
    title: 'Settings',
    subtitle: 'Profile, sign-in and email.',
  },
};
