/**
 * Student learning flow helpers — My subjects → Classroom → AI tutor → Assessment → Results.
 * Routes keep their state in the query string so Back / refresh / Dashboard links land on
 * the same screen:
 *   /student/subjects                                  subject list
 *   /student/subjects?subject=<key>&chapter=<job>      classroom
 *   /student/subjects?subject=<key>&chapter=<job>&tab=tutor
 *   /student/assessment?job=<job>&title=…&subject=<key>[&view=review&filter=incorrect]
 */

export const SUBJECTS_PATH = '/student/subjects';

export function formatDuration(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time.toUpperCase()}`;
}

/**
 * A chapter's subject: the academic-structure Subject when the chapter is
 * tagged to one (SOW §6.4.1 Programme > Semester > Subject > Chapter),
 * otherwise the department as a catch-all for untagged lectures.
 */
export function subjectKey(job) {
  if (job?.subject_id) return `subject:${job.subject_id}`;
  return String(job?.department_id || job?.department_name || 'my-lectures');
}

export function subjectMeta(job, fallbackName) {
  if (job?.subject_id) {
    return {
      name: job.subject_name,
      code: job.subject_code || subjectCode(job.subject_name),
      semester: job.semester_name || null,
      semesterNumber: Number(job.semester_number) || 0,
      program: job.program_name || null,
      linked: true,
    };
  }
  const name = job?.department_name || fallbackName || 'Video lectures';
  return { name, code: subjectCode(name), semester: null, semesterNumber: 999, program: null, linked: false };
}

export function subjectCode(name) {
  return (name || 'VID').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'VID';
}

const toTime = (iso) => Date.parse(iso || '') || 0;

/** Order chapters: the subject's chapter order when tagged, else newest first. */
function chapterOrder(a, b) {
  const pa = Number(a.chapter_position) || 0;
  const pb = Number(b.chapter_position) || 0;
  if (pa && pb && pa !== pb) return pa - pb;
  if (pa && !pb) return -1;
  if (pb && !pa) return 1;
  return toTime(b.published_at) - toTime(a.published_at);
}

/**
 * Group published chapters into subjects, ordered by semester then name;
 * untagged lectures (no academic-structure chapter) come last.
 */
export function buildSubjects(videos, fallbackName) {
  const map = new Map();
  (videos || []).forEach((job) => {
    if (!job?.job_id) return;
    const key = subjectKey(job);
    if (!map.has(key)) map.set(key, { key, ...subjectMeta(job, fallbackName), chapters: [] });
    map.get(key).chapters.push(job);
  });
  return Array.from(map.values())
    .map((s) => ({ ...s, chapters: [...s.chapters].sort(chapterOrder) }))
    .sort((a, b) => (a.semesterNumber - b.semesterNumber) || String(a.name).localeCompare(String(b.name)));
}

export function classroomHref(subject, jobId, tab) {
  const qs = new URLSearchParams();
  if (subject) qs.set('subject', subject);
  if (jobId) qs.set('chapter', jobId);
  if (tab && tab !== 'classroom') qs.set('tab', tab);
  const s = qs.toString();
  return s ? `${SUBJECTS_PATH}?${s}` : SUBJECTS_PATH;
}

export function assessmentHref(job, subject, extra = {}) {
  const qs = new URLSearchParams({ job: job.job_id, title: job.chapter_title || 'Chapter quiz' });
  if (subject) qs.set('subject', subject);
  Object.entries(extra).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `/student/assessment?${qs.toString()}`;
}

export function scoreTone(score) {
  if (score == null || score === '') return 'none';
  const n = Number(score);
  if (!Number.isFinite(n)) return 'none';
  if (n >= 75) return 'good';
  if (n >= 50) return 'mid';
  return 'low';
}

export function pct(n, digits = 0) {
  if (n == null || n === '' || !Number.isFinite(Number(n))) return '—';
  return `${Number(n).toFixed(digits)}%`;
}

export const clampPct = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
