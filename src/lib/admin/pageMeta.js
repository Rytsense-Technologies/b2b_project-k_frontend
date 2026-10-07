/** College Admin page titles/subtitles — aligned with Client Demo college-admin.html */
export const PAGE_META = {
  '/admin/dashboard': {
    title: 'Dashboard',
    subtitle: 'Departments, content pipeline, and student activity across your college.',
  },
  '/admin/structure': {
    title: 'Academic structure',
    subtitle: 'Build and manage your Department → Program → Semester → Subject tree.',
  },
  '/admin/structure/departments': {
    title: 'Departments',
    subtitle: 'The first level under your college. Each department has an HOD who reviews chapters before students see them.',
    // Breadcrumb trail above the title (Home is added by the layout). No href = not a page yet.
    crumbs: [{ label: 'Academic structure' }],
  },
  '/admin/content': {
    title: 'Upload & content',
    subtitle: 'Upload chapter material to generate a video lecture and follow status here.',
  },
  '/admin/students': {
    title: 'Students',
    subtitle: 'Add, import, and manage students across every department.',
  },
  '/admin/staff': {
    title: 'Staff & HOD',
    subtitle: 'Add faculty and assign HODs who review and approve content.',
  },
  '/admin/interviews': {
    title: 'Interview assignments',
    subtitle: 'Assign AI mock interviews to final-year cohorts.',
  },
  '/admin/analytics': {
    title: 'Analytics',
    subtitle: 'Completion, assessment performance, Q&A demand, interview readiness.',
  },
  '/admin/reports': {
    title: 'Reports',
    subtitle: 'Student-level and cohort-level reports.',
  },
  '/admin/settings': {
    title: 'Settings',
    subtitle: 'Your profile and account security.',
  },
};
