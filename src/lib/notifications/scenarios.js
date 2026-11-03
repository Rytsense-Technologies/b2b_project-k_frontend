/**
 * Catalogue events (docs/agent/redesign/notifications-plan.md) + in-app bell.
 * Email still covers all 15. The bell only lists the seven pipeline / assessment
 * events the backend writes to GET /notifications/inbox.
 * Interview events are never listed (INTERVIEWS_ENABLED=false).
 */

export const ALERTS_REFRESH = 'quirri:alerts-refresh';

/** Events that appear under the bell (backend user_notifications). */
export const IN_APP_EVENTS = [
  'pipeline_completed',
  'content_ready_for_review',
  'changes_requested',
  'content_published',
  'mcq_ready_for_review',
  'assessment_available',
  'assessment_result',
];

export function requestAlertsRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ALERTS_REFRESH));
}

export const PORTAL_INBOX = {
  superadmin: '/superadmin/notifications?tab=alerts',
  admin: '/admin/notifications?tab=alerts',
  faculty: '/faculty/notifications?tab=messages',
  student: '/student/notifications',
};

/** Event id → where that person should go when they open the alert. */
const HREF = {
  account_activation: {
    superadmin: '/superadmin/users',
    admin: '/admin/students',
    faculty: '/faculty/settings',
    student: '/student/settings',
  },
  password_reset: {
    superadmin: '/superadmin/settings?tab=security',
    admin: '/admin/settings?tab=security',
    faculty: '/faculty/settings?tab=security',
    student: '/student/settings?tab=security',
  },
  verification_code: {
    superadmin: '/superadmin/settings?tab=security',
    admin: '/admin/settings?tab=security',
    faculty: '/faculty/settings?tab=security',
    student: '/student/settings?tab=security',
  },
  password_changed: {
    superadmin: '/superadmin/settings?tab=security',
    admin: '/admin/settings?tab=security',
    faculty: '/faculty/settings?tab=security',
    student: '/student/settings?tab=security',
  },
  account_status_changed: {
    superadmin: '/superadmin/users',
    admin: '/admin/students',
    faculty: '/faculty/settings',
    student: '/student/settings',
  },
  hod_assigned: {
    superadmin: '/superadmin/departments',
    admin: '/admin/staff',
    faculty: '/faculty/dashboard',
  },
  subjects_assigned: {
    superadmin: '/superadmin/departments',
    admin: '/admin/staff',
    faculty: '/faculty/subjects',
  },
  student_placement_changed: {
    superadmin: '/superadmin/colleges',
    admin: '/admin/students',
    faculty: '/faculty/students',
    student: '/student/home',
  },
  pipeline_completed: {
    superadmin: '/superadmin/health',
    admin: '/admin/content',
    faculty: '/faculty/videos',
  },
  content_ready_for_review: {
    admin: '/admin/content',
    faculty: '/faculty/videos?tab=review',
  },
  changes_requested: {
    admin: '/admin/content',
    faculty: '/faculty/videos',
  },
  content_published: {
    admin: '/admin/content',
    faculty: '/faculty/subjects',
    student: '/student/subjects',
  },
  mcq_ready_for_review: {
    admin: '/admin/mcq',
    faculty: '/faculty/mcq',
  },
  assessment_available: {
    admin: '/admin/mcq',
    faculty: '/faculty/mcq',
    student: '/student/subjects',
  },
  assessment_result: {
    admin: '/admin/analytics',
    faculty: '/faculty/students',
    student: '/student/progress',
  },
};

export const CATALOGUE_EVENTS = [
  { id: 'account_activation', group: 'account_security', label: 'Account activation invite' },
  { id: 'password_reset', group: 'account_security', label: 'Password reset link' },
  { id: 'verification_code', group: 'account_security', label: 'Verification code' },
  { id: 'password_changed', group: 'account_security', label: 'Password changed' },
  { id: 'account_status_changed', group: 'account_security', label: 'Account status changed' },
  { id: 'hod_assigned', group: 'people_roles', label: 'HOD assigned' },
  { id: 'subjects_assigned', group: 'people_roles', label: 'Subjects assigned' },
  { id: 'student_placement_changed', group: 'people_roles', label: 'Student placement changed' },
  { id: 'pipeline_completed', group: 'content_pipeline', label: 'Video pipeline finished' },
  { id: 'content_ready_for_review', group: 'content_pipeline', label: 'Content ready for review' },
  { id: 'changes_requested', group: 'content_pipeline', label: 'Changes requested' },
  { id: 'content_published', group: 'content_pipeline', label: 'Chapter published' },
  { id: 'mcq_ready_for_review', group: 'assessments', label: 'Assessment ready for review' },
  { id: 'assessment_available', group: 'assessments', label: 'Assessment available' },
  { id: 'assessment_result', group: 'assessments', label: 'Assessment result' },
];

export const CATALOGUE_EVENT_IDS = CATALOGUE_EVENTS.map((e) => e.id);

export function eventLabel(event, fallback) {
  const row = CATALOGUE_EVENTS.find((e) => e.id === event);
  return row?.label || fallback || event || 'Message';
}

export function alertHref(event, portal) {
  const key = portal === 'college_admin' ? 'admin' : portal;
  return HREF[event]?.[key] || '';
}

export function inboxHref(portal) {
  const key = portal === 'college_admin' ? 'admin' : portal;
  return PORTAL_INBOX[key] || '';
}

function portalKey(portal) {
  return portal === 'college_admin' ? 'admin' : portal;
}

/** Relative product paths only — never an open redirect from `link`. */
export function safeInboxLink(link) {
  const path = String(link || '').trim();
  if (!path.startsWith('/') || path.startsWith('//')) return '';
  if (!/^\/(superadmin|admin|faculty|student)(\/|\?|$)/.test(path)) return '';
  return path;
}

/**
 * Where a bell row should open. Prefer resource_type + resource_id by role;
 * `link` is only the email-button hint (null for student events).
 */
export function inboxItemHref(row, portal) {
  const key = portalKey(portal);
  const event = row?.event;
  const jobId = row?.resource_id;
  if ((row?.resource_type === 'edu_video_job' || !row?.resource_type) && jobId) {
    const q = encodeURIComponent(jobId);
    if (key === 'student') {
      if (event === 'assessment_result') return `/student/assessment?job=${q}&view=review`;
      return `/student/subjects?chapter=${q}`;
    }
    if (key === 'faculty') {
      if (event === 'mcq_ready_for_review') return `/faculty/mcq?job=${q}`;
      return `/faculty/videos?job=${q}`;
    }
    if (key === 'admin') {
      if (event === 'mcq_ready_for_review') return `/admin/mcq?job=${q}`;
      return '/admin/content';
    }
    if (key === 'superadmin') return '/superadmin/content';
  }
  return safeInboxLink(row?.link) || alertHref(event, key) || inboxHref(key);
}

const TZ = 'Asia/Kolkata';

export function dayKey(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? 'unknown' : d.toLocaleDateString('en-CA', { timeZone: TZ });
}

export function dayHeading(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return 'Earlier';
  const key = dayKey(iso);
  const today = dayKey(new Date().toISOString());
  const yest = dayKey(new Date(Date.now() - 86400000).toISOString());
  if (key === today) return 'Today';
  if (key === yest) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
}

export function timeOf(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }).toLowerCase();
}

export function groupAlertsByDay(rows) {
  const out = [];
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    const k = dayKey(r.created_at);
    const last = out[out.length - 1];
    if (last && last.key === k) last.rows.push(r);
    else out.push({ key: k, label: dayHeading(r.created_at), rows: [r] });
  });
  return out;
}
