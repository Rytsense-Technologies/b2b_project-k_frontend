/** Mock data matching quirri_super_admin_Final.html — replace with API when backend is ready */

export const DASHBOARD_METRICS = [
  { title: 'Total Colleges', value: '24', trend: '18 active · 6 onboarding' },
  { title: 'Total Departments', value: '126', trend: 'Across all colleges' },
  { title: 'Active Students', value: '18,420', trend: '+12% this month' },
  { title: 'Self Learning Read Duration', value: '42,860 hrs', trend: 'Total duration of courses read' },
  { title: 'Interviews Completed', value: '6,840', trend: 'Final year students' },
];

export const LEARNING_ACTIVITY = [
  { college: 'ABC Engineering', duration: '4,820 hrs', courses: '18,240', questions: '12,402', quality: '91%', status: 'High Learning', statusType: 'learning' },
  { college: 'City Arts & Science', duration: '3,210 hrs', courses: '11,876', questions: '9,310', quality: '87%', status: 'High Q&A', statusType: 'qa' },
  { college: 'National Polytechnic', duration: '2,940 hrs', courses: '9,540', questions: '7,224', quality: '82%', status: 'Balanced', statusType: 'mix' },
  { college: 'Vetri Institute', duration: '2,110 hrs', courses: '7,120', questions: '4,778', quality: '79%', status: 'Needs Push', statusType: 'off' },
];

export const TOP_COLLEGES = [
  { college: 'ABC Engineering', students: '2,340', usage: '35,462' },
  { college: 'City Arts & Science', students: '1,120', usage: '24,396' },
  { college: 'National Polytechnic', students: '980', usage: '19,820' },
  { college: 'Vetri Institute', students: '740', usage: '13,460' },
];

export const DEPT_SNAPSHOT = [
  { college: 'ABC Engineering', department: 'CSE', students: '620', finalYear: '156', hours: '1,420 hrs', qa: '4,280' },
  { college: 'ABC Engineering', department: 'ECE', students: '480', finalYear: '120', hours: '1,105 hrs', qa: '3,760' },
  { college: 'City Arts & Science', department: 'B.Com', students: '410', finalYear: '96', hours: '880 hrs', qa: '2,910' },
];

export const COLLEGES = [
  {
    id: '1',
    name: 'ABC Engineering College',
    code: 'COL-0001',
    city: 'Chennai',
    admins: 3,
    departments: 8,
    students: '2,340',
    plan: 'Premium',
    status: 'Active',
    statusType: 'ok',
  },
  {
    id: '2',
    name: 'City Arts & Science',
    code: 'COL-0002',
    city: 'Salem',
    admins: 2,
    departments: 5,
    students: '1,120',
    plan: 'Standard',
    status: 'Onboarding',
    statusType: 'warn',
  },
];

export const DEPARTMENTS = [
  { college: 'ABC Engineering', department: 'CSE', hod: 'Dr. Karthik', students: '620', finalYear: '156', subjects: '18', hours: '1,420 hrs', questions: '4,280', interviews: '810' },
  { college: 'ABC Engineering', department: 'ECE', hod: 'Prof. Meena', students: '480', finalYear: '120', subjects: '16', hours: '1,105 hrs', questions: '3,760', interviews: '640' },
  { college: 'ABC Engineering', department: 'Mechanical', hod: 'Dr. Suresh', students: '390', finalYear: '94', subjects: '14', hours: '820 hrs', questions: '2,140', interviews: '410' },
  { college: 'City Arts & Science', department: 'B.Com', hod: 'Prof. Revathi', students: '410', finalYear: '96', subjects: '12', hours: '880 hrs', questions: '2,910', interviews: '230' },
  { college: 'City Arts & Science', department: 'B.Sc CS', hod: 'Dr. Naveen', students: '365', finalYear: '88', subjects: '15', hours: '760 hrs', questions: '2,340', interviews: '312' },
];

export const SKILL_METRICS = [
  { title: 'Published Courses', value: '12' },
  { title: 'AI Generated', value: '8' },
  { title: 'Video Courses', value: '4' },
  { title: 'Enrollments', value: '7,830' },
  { title: 'Completion', value: '68%' },
];

export const SKILL_COURSES = [
  { course: 'Interview Readiness Booster', type: 'AI Generated', typeStyle: 'qa', category: 'Career', audience: 'Final Year', colleges: 'All Colleges', usage: '3,204', status: 'Published', statusType: 'ok' },
  { course: 'Communication Confidence', type: 'Video Upload', typeStyle: 'learning', category: 'Soft Skill', audience: 'All Years', colleges: '18 Colleges', usage: '2,119', status: 'Published', statusType: 'ok' },
];

export const AI_USAGE = [
  { module: 'Q&A', college: 'ABC Engineering', requests: '12,402', tokens: '4.8M', cost: '₹18,240', limit: 'Normal', limitType: 'ok' },
  { module: 'Interview', college: 'ABC Engineering', requests: '810', tokens: '2.6M', cost: '₹11,520', limit: 'Watch', limitType: 'warn' },
  { module: 'AI Skill Course', college: 'All Colleges', requests: '3,204', tokens: '1.9M', cost: '₹7,850', limit: 'Normal', limitType: 'ok' },
];

export const EMAILS = [
  { email: 'support@quirri.ai', purpose: 'Support notifications', status: 'Verified', addedBy: 'Super Admin', created: '12 Jun 2026' },
  { email: 'reports@quirri.ai', purpose: 'Report delivery', status: 'Verified', addedBy: 'Super Admin', created: '10 Jun 2026' },
];

export const REPORT_PREVIEW = [
  { college: 'ABC Engineering', department: 'CSE', students: '620', duration: '1,420 hrs', questions: '4,280', interviews: '810', score: '76%' },
  { college: 'ABC Engineering', department: 'ECE', students: '480', duration: '1,105 hrs', questions: '3,760', interviews: '640', score: '72%' },
  { college: 'City Arts & Science', department: 'B.Com', students: '410', duration: '880 hrs', questions: '2,910', interviews: '230', score: '68%' },
];

export const AUDIT_LOGS = [
  { datetime: '19 Jun 2026, 04:12 PM', user: 'Super Admin', role: 'Quirri Team', module: 'College', action: 'Added new admin to ABC Engineering', ip: '103.21.XX.18' },
  { datetime: '19 Jun 2026, 03:48 PM', user: 'Super Admin', role: 'Quirri Team', module: 'Email', action: 'Deleted old notification email', ip: '103.21.XX.18' },
];

export const COLLEGE_VIEW_DEPTS = [
  { department: 'CSE', students: '620', finalYear: '156', hod: 'Dr. Karthik', hours: '1,420 hrs', questions: '4,280' },
  { department: 'ECE', students: '480', finalYear: '120', hod: 'Prof. Meena', hours: '1,105 hrs', questions: '3,760' },
];

export const PAGE_META = {
  '/superadmin/dashboard': {
    title: 'Dashboard',
    subtitle: 'Monitor colleges, departments, self learning, Q&A, interviews, and platform health.',
  },
  '/superadmin/colleges': {
    title: 'College Management',
    subtitle: 'Create colleges and assign one or more college admins.',
  },
  '/superadmin/departments': {
    title: 'Departments',
    subtitle: 'View department-wise student count and performance. Departments are created by college admin, Super Admin can view/report.',
  },
  '/superadmin/skills': {
    title: 'AI Skill Courses',
    subtitle: 'Generate AI skill courses or upload video-based courses.',
  },
  '/superadmin/ai-usage': {
    title: 'AI Usage',
    subtitle: 'Track AI usage per module and college.',
  },
  '/superadmin/emails': {
    title: 'Email Management',
    subtitle: 'Add, verify, and delete platform emails.',
  },
  '/superadmin/reports': {
    title: 'Reports',
    subtitle: 'Search, preview, and download report data.',
  },
  '/superadmin/audit': {
    title: 'Audit Logs',
    subtitle: 'View admin actions and system activity.',
  },
  '/superadmin/settings': {
    title: 'Settings',
    subtitle: 'Manage account, security, permissions, and notifications.',
  },
};
