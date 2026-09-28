/**
 * Student Home view-model — built only from live student APIs:
 *   GET /auth/me                          → name, department
 *   GET /edu_video/student/videos          → published lectures (grouped into subjects)
 *   GET /mcq/jobs/{job_id}                 → per-chapter assessment status / result
 *   GET /reports/livekit                   → completed mock / full interviews
 * Nothing is mocked. Missing sources leave their section in an empty state.
 */
import { eduVideoApi } from '@/lib/api/admin/eduVideo';
import { mcqApi } from '@/lib/api/mcq';
import { reportsApi } from '@/lib/api/reports';
import { settingsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList } from '@/lib/api/superadmin/http';

/** Cap per-chapter quiz lookups so Home stays fast. */
const MAX_QUIZ_LOOKUPS = 24;

function subjectKey(job) {
  return String(job?.department_id || job?.department_name || 'my-lectures');
}

function toTime(iso) {
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? t : 0;
}

export function shortDate(iso) {
  const t = toTime(iso);
  if (!t) return '';
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function longDate(iso) {
  const t = toTime(iso);
  if (!t) return '';
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDuration(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function scoreBand(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return { key: 'none', label: 'Not scored' };
  if (n >= 75) return { key: 'good', label: 'Strong' };
  if (n >= 50) return { key: 'mid', label: 'On track' };
  return { key: 'low', label: 'Needs revision' };
}

function avg(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

/** Quiz status for one chapter: 'done' | 'open' | 'unavailable'. */
async function quizStatus(jobId) {
  try {
    const view = await mcqApi.get(jobId);
    if (view?.status === 'already_attempted') {
      const r = view.result || {};
      return {
        state: 'done',
        percentage: Number(r.percentage),
        correct: r.correct_count,
        total: r.total_questions,
        submittedAt: r.submitted_at,
      };
    }
    if (view?.status === 'not_attempted') return { state: 'open' };
    return { state: 'unavailable' };
  } catch {
    // 404 / 409 → quiz not generated or not ready for this student yet.
    return { state: 'unavailable' };
  }
}

export async function loadStudentHome() {
  const [meRes, videosRes, reportsRes] = await Promise.allSettled([
    fetchData(() => settingsApi.get()),
    eduVideoApi.listStudentVideos({ pageSize: 100 }),
    reportsApi.getLivekit({ page: 1, page_size: 20 }),
  ]);

  if (videosRes.status === 'rejected' && reportsRes.status === 'rejected') {
    throw videosRes.reason;
  }

  const me = meRes.status === 'fulfilled' ? (meRes.value?.user || meRes.value) : null;
  const videos = videosRes.status === 'fulfilled' ? asList(videosRes.value, []) : null;
  const reports = reportsRes.status === 'fulfilled' ? reportsRes.value : null;

  const chapters = (videos || [])
    .filter((j) => j?.job_id)
    .sort((a, b) => toTime(b.published_at) - toTime(a.published_at));

  const lookups = chapters.slice(0, MAX_QUIZ_LOOKUPS);
  const statuses = await Promise.all(lookups.map((j) => quizStatus(j.job_id)));
  const quizByJob = new Map(lookups.map((j, i) => [j.job_id, statuses[i]]));

  return buildHomeModel({
    me,
    chapters,
    quizByJob,
    reports,
    videosAvailable: videos !== null,
    reportsAvailable: reports !== null,
  });
}

export function buildHomeModel({ me, chapters, quizByJob, reports, videosAvailable, reportsAvailable }) {
  const deptName = me?.department_name || me?.department || null;

  /* ---------- subjects ---------- */
  const subjectMap = new Map();
  chapters.forEach((job) => {
    const key = subjectKey(job);
    if (!subjectMap.has(key)) {
      subjectMap.set(key, { key, name: job.department_name || deptName || 'Video lectures', chapters: [] });
    }
    subjectMap.get(key).chapters.push(job);
  });
  const subjects = Array.from(subjectMap.values()).map((s) => {
    const quizzes = s.chapters.map((c) => quizByJob.get(c.job_id)).filter(Boolean);
    const available = quizzes.filter((q) => q.state !== 'unavailable');
    const done = quizzes.filter((q) => q.state === 'done');
    return {
      key: s.key,
      name: s.name,
      chapterCount: s.chapters.length,
      quizAvailable: available.length,
      quizDone: done.length,
      avgScore: avg(done.map((q) => q.percentage)),
      completion: available.length ? Math.round((done.length / available.length) * 100) : null,
    };
  });

  /* ---------- assessments ---------- */
  const withQuiz = chapters
    .map((c) => ({ job: c, quiz: quizByJob.get(c.job_id) }))
    .filter((x) => x.quiz);
  const done = withQuiz.filter((x) => x.quiz.state === 'done');
  const open = withQuiz.filter((x) => x.quiz.state === 'open');

  const trend = [...done]
    .filter((x) => Number.isFinite(x.quiz.percentage))
    .sort((a, b) => toTime(a.quiz.submittedAt) - toTime(b.quiz.submittedAt))
    .slice(-7)
    .map((x) => ({
      label: shortDate(x.quiz.submittedAt),
      score: Math.round(x.quiz.percentage),
      title: x.job.chapter_title || 'Chapter quiz',
      date: longDate(x.quiz.submittedAt),
      detail: x.quiz.total ? `${x.quiz.correct}/${x.quiz.total} correct` : '',
    }));

  const upNext = open.slice(0, 4).map((x) => ({
    jobId: x.job.job_id,
    title: x.job.chapter_title || 'Chapter quiz',
    subject: x.job.department_name || deptName || '',
  }));

  /* ---------- lectures ---------- */
  const recentLectures = chapters.slice(0, 3).map((c) => {
    const q = quizByJob.get(c.job_id);
    return {
      jobId: c.job_id,
      title: c.chapter_title || 'Lecture',
      subject: c.department_name || deptName || 'Video lecture',
      duration: formatDuration(c.video_duration_seconds),
      published: longDate(c.published_at),
      quiz: q?.state || 'unavailable',
      score: q?.state === 'done' && Number.isFinite(q.percentage) ? Math.round(q.percentage) : null,
    };
  });

  /* ---------- every chapter with its quiz state (My Progress table) ---------- */
  const chapterRows = chapters.map((c) => {
    const q = quizByJob.get(c.job_id);
    return {
      jobId: c.job_id,
      title: c.chapter_title || 'Untitled chapter',
      subject: c.department_name || deptName || 'Video lectures',
      published: longDate(c.published_at),
      quiz: q?.state || 'unchecked',
      score: q?.state === 'done' && Number.isFinite(q.percentage) ? Math.round(q.percentage) : null,
      correct: q?.state === 'done' && q.total ? `${q.correct}/${q.total}` : null,
      submitted: q?.state === 'done' ? longDate(q.submittedAt) : null,
    };
  });

  /* ---------- interviews ---------- */
  const reportItems = asList(reports, []);
  const kpi = reports?.kpi || {};
  const interviewScores = reportItems.map((r) => Number(r.score)).filter(Number.isFinite);
  const interviewAvg = kpi.avg_score != null ? Math.round(Number(kpi.avg_score) * 10) / 10 : avg(interviewScores);

  const interviewRows = reportItems.map((r) => ({
    id: r.session_id,
    title: r.title || r.position || 'Interview',
    mode: String(r.interview_type || '').toLowerCase() === 'full' ? 'full' : 'mock',
    score: Number.isFinite(Number(r.score)) ? Math.round(Number(r.score)) : null,
    date: longDate(r.completed_date || r.started_at),
  }));

  return {
    chapterRows,
    interviewRows,
    name: me?.first_name || me?.name?.trim()?.split(/\s+/)[0] || '',
    deptName,
    videosAvailable,
    reportsAvailable,
    subjects,
    recentLectures,
    upNext,
    trend,
    assessments: {
      done: done.length,
      available: done.length + open.length,
      avg: avg(done.map((x) => x.quiz.percentage)),
      best: done.length ? Math.max(...done.map((x) => Math.round(x.quiz.percentage || 0))) : null,
    },
    interviews: {
      total: reportsAvailable ? (kpi.total_reports ?? reportItems.length) : null,
      avg: interviewAvg,
    },
    counts: {
      subjects: videosAvailable ? subjects.length : null,
      lectures: videosAvailable ? chapters.length : null,
    },
    score: {
      current: trend.length ? trend[trend.length - 1].score : null,
      previous: trend.length > 1 ? trend[trend.length - 2].score : null,
    },
  };
}
