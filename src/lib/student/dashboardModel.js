/**
 * Student Home / My Progress view-model — live student APIs only (SOW §6.4):
 *   GET /auth/me
 *   GET /edu_video/student/videos          (+ watch_percent / watch_complete)
 *   GET /mcq/jobs/{job_id}                (done | open | watch_required)
 *   GET /reports/livekit                  (interview reports + KPI)
 *   GET /leaderboard                      (cohort rank)
 *   GET /interview-assignments            (active cohort assignments)
 * Missing sources leave their section empty — never mocked.
 */
import { eduVideoApi } from '@/lib/api/admin/eduVideo';
import { interviewAssignmentsApi } from '@/lib/api/interviewAssignments';
import { leaderboardApi } from '@/lib/api/leaderboard';
import { mcqApi } from '@/lib/api/mcq';
import { reportsApi } from '@/lib/api/reports';
import { settingsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList } from '@/lib/api/superadmin/http';
import { subjectKey, subjectMeta } from '@/lib/student/learning';

/** Cap per-chapter quiz lookups so Home stays fast. */
const MAX_QUIZ_LOOKUPS = 24;


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

function clampPct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Quiz status for one chapter: 'done' | 'open' | 'watch_required' | 'unavailable'. */
export async function quizStatus(jobId) {
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
        watchPercent: clampPct(view.watch_percent),
      };
    }
    if (view?.status === 'not_attempted') {
      return { state: 'open', watchPercent: clampPct(view.watch_percent) };
    }
    if (view?.status === 'watch_required') {
      return {
        state: 'watch_required',
        watchPercent: clampPct(view.watch_percent),
      };
    }
    return { state: 'unavailable' };
  } catch {
    return { state: 'unavailable' };
  }
}

export async function loadStudentHome() {
  const [meRes, videosRes, reportsRes, lbRes, assignRes] = await Promise.allSettled([
    fetchData(() => settingsApi.get()),
    eduVideoApi.listStudentVideos({ pageSize: 100 }),
    reportsApi.getLivekit({ page: 1, page_size: 20 }),
    leaderboardApi.get({ limit: 8 }),
    interviewAssignmentsApi.list({}),
  ]);

  // Retry classroom list once — common race when access_token refreshes mid-flight.
  let videosSettled = videosRes;
  if (videosSettled.status === 'rejected') {
    try {
      const retry = await eduVideoApi.listStudentVideos({ pageSize: 100 });
      videosSettled = { status: 'fulfilled', value: retry };
    } catch (err) {
      videosSettled = { status: 'rejected', reason: err };
    }
  }

  if (videosSettled.status === 'rejected' && reportsRes.status === 'rejected') {
    throw videosSettled.reason;
  }

  const me = meRes.status === 'fulfilled' ? (meRes.value?.user || meRes.value) : null;
  const videos = videosSettled.status === 'fulfilled' ? asList(videosSettled.value, []) : null;
  const reports = reportsRes.status === 'fulfilled' ? reportsRes.value : null;
  const leaderboard = lbRes.status === 'fulfilled' ? lbRes.value : null;
  const assignmentsPayload = assignRes.status === 'fulfilled' ? assignRes.value : null;
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
    leaderboard,
    assignmentsPayload,
    videosAvailable: videos !== null,
    reportsAvailable: reports !== null,
    leaderboardAvailable: leaderboard !== null,
    assignmentsAvailable: assignmentsPayload !== null,
  });
}

export function buildHomeModel({
  me,
  chapters,
  quizByJob,
  reports,
  leaderboard,
  assignmentsPayload,
  videosAvailable,
  reportsAvailable,
  leaderboardAvailable,
  assignmentsAvailable,
}) {
  const deptName = me?.department_name || me?.department || null;
  const collegeName = me?.tenant_name || me?.college_name || null;

  /* ---------- subjects ---------- */
  const subjectMap = new Map();
  chapters.forEach((job) => {
    const key = subjectKey(job);
    if (!subjectMap.has(key)) {
      const meta = subjectMeta(job, deptName);
      subjectMap.set(key, { key, name: meta.name, semester: meta.semester, chapters: [] });
    }
    subjectMap.get(key).chapters.push(job);
  });
  const subjects = Array.from(subjectMap.values()).map((s) => {
    const quizzes = s.chapters.map((c) => quizByJob.get(c.job_id)).filter(Boolean);
    const available = quizzes.filter((q) => q.state === 'done' || q.state === 'open');
    const done = quizzes.filter((q) => q.state === 'done');
    const watched = s.chapters.filter((c) => clampPct(c.watch_percent) >= 100).length;
    return {
      key: s.key,
      name: s.name,
      chapterCount: s.chapters.length,
      watchedCount: watched,
      quizAvailable: available.length,
      quizDone: done.length,
      avgScore: avg(done.map((q) => q.percentage)),
      completion: s.chapters.length
        ? Math.round((watched / s.chapters.length) * 100)
        : null,
      quizCompletion: available.length
        ? Math.round((done.length / available.length) * 100)
        : null,
    };
  });

  /* ---------- assessments ---------- */
  const withQuiz = chapters
    .map((c) => ({ job: c, quiz: quizByJob.get(c.job_id) }))
    .filter((x) => x.quiz);
  const done = withQuiz.filter((x) => x.quiz.state === 'done');
  const open = withQuiz.filter((x) => x.quiz.state === 'open');
  const locked = withQuiz.filter((x) => x.quiz.state === 'watch_required');

  const trend = [...done]
    .filter((x) => Number.isFinite(x.quiz.percentage))
    .sort((a, b) => toTime(a.quiz.submittedAt) - toTime(b.quiz.submittedAt))
    .slice(-7)
    .map((x) => ({
      jobId: x.job.job_id,
      subject: x.job.department_name || deptName || 'Video lectures',
      subjectKey: subjectKey(x.job),
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
    kind: 'assessment',
  }));

  const assessmentsReady = open.slice(0, 5).map((x) => ({
    jobId: x.job.job_id,
    title: x.job.chapter_title || 'Chapter quiz',
    subject: x.job.department_name || deptName || 'Video lectures',
    cta: 'Take assessment',
    href: `/student/assessment?job=${encodeURIComponent(x.job.job_id)}&title=${encodeURIComponent(x.job.chapter_title || 'Chapter quiz')}`,
  }));

  /* ---------- watch / continue learning ---------- */
  const chapterWatch = chapters.map((c) => {
    const watchPercent = clampPct(c.watch_percent);
    const watchComplete = Boolean(c.watch_complete) || watchPercent >= 100;
    return {
      jobId: c.job_id,
      title: c.chapter_title || 'Untitled chapter',
      subject: c.department_name || deptName || 'Video lectures',
      duration: formatDuration(c.video_duration_seconds),
      published: longDate(c.published_at),
      watchPercent,
      watchComplete,
    };
  });

  const chaptersFinished = chapterWatch.filter((c) => c.watchComplete).length;
  const chaptersTotal = chapterWatch.length;
  const watchSemesterPct = chaptersTotal
    ? Math.round((chaptersFinished / chaptersTotal) * 100)
    : 0;

  const continueLearning =
    chapterWatch.find((c) => c.watchPercent > 0 && c.watchPercent < 100)
    || chapterWatch.find((c) => c.watchPercent === 0)
    || null;

  /* ---------- lectures ---------- */
  const recentLectures = chapters.slice(0, 3).map((c) => {
    const q = quizByJob.get(c.job_id);
    const watchPercent = clampPct(c.watch_percent);
    return {
      jobId: c.job_id,
      title: c.chapter_title || 'Lecture',
      subject: c.department_name || deptName || 'Video lecture',
      duration: formatDuration(c.video_duration_seconds),
      published: longDate(c.published_at),
      watchPercent,
      quiz: q?.state || 'unavailable',
      score: q?.state === 'done' && Number.isFinite(q.percentage) ? Math.round(q.percentage) : null,
    };
  });

  /* ---------- every chapter with quiz + watch (My Progress) ---------- */
  const chapterRows = chapters.map((c) => {
    const q = quizByJob.get(c.job_id);
    const watchPercent = clampPct(c.watch_percent);
    return {
      jobId: c.job_id,
      title: c.chapter_title || 'Untitled chapter',
      subject: c.department_name || deptName || 'Video lectures',
      subjectKey: subjectKey(c),
      duration: formatDuration(c.video_duration_seconds),
      published: longDate(c.published_at),
      publishedAt: c.published_at || null,
      submittedAt: q?.state === 'done' ? q.submittedAt || null : null,
      watchPercent,
      watchComplete: watchPercent >= 100,
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
  const interviewAvg =
    kpi.avg_score != null && Number(kpi.avg_score) > 0
      ? Math.round(Number(kpi.avg_score) * 10) / 10
      : avg(interviewScores);

  const interviewRows = reportItems.map((r) => ({
    id: r.session_id,
    title: r.title || r.position || 'Interview',
    mode: String(r.interview_type || '').toLowerCase() === 'full' ? 'full' : 'mock',
    score: Number.isFinite(Number(r.score)) ? Math.round(Number(r.score)) : null,
    date: longDate(r.completed_date || r.started_at),
  }));

  /* ---------- assignments ---------- */
  const assignmentItems = asList(assignmentsPayload, []);
  const assignments = assignmentItems.slice(0, 5).map((a) => ({
    id: a.id,
    title: a.title || 'Interview assignment',
    mode: String(a.mode || 'mock').toLowerCase() === 'full' ? 'Full' : 'Mock',
    due: a.due_at ? longDate(a.due_at) : null,
    dueShort: a.due_at ? shortDate(a.due_at) : null,
    department: a.department_name || deptName || 'College',
    status: a.status === 'closed' ? 'Closed' : 'Open',
    href: '/student/interviews',
  }));

  /* ---------- leaderboard ---------- */
  const lbItems = asList(leaderboard, []).map((row) => ({
    rank: row.rank,
    name: row.name,
    avgScore: row.avg_score,
    attemptCount: row.attempt_count,
    isMe: Boolean(row.is_me),
  }));
  const meRank = leaderboard?.me_rank ?? null;
  const meLb = lbItems.find((r) => r.isMe) || null;

  /* ---------- focus this week ---------- */
  const focusItems = [];
  if (continueLearning && continueLearning.watchPercent < 100) {
    focusItems.push({
      id: `watch-${continueLearning.jobId}`,
      tone: 'teal',
      title: continueLearning.watchPercent > 0
        ? `Finish ${continueLearning.title}`
        : `Start ${continueLearning.title}`,
      detail: continueLearning.watchPercent > 0
        ? `You are at ${continueLearning.watchPercent}% — finish the lecture to unlock the assessment.`
        : 'Watch the chapter video, then take the assessment.',
      href: '/student/subjects',
    });
  }
  if (open[0]) {
    focusItems.push({
      id: `quiz-${open[0].job.job_id}`,
      tone: 'amber',
      title: `Take assessment · ${open[0].job.chapter_title || 'Chapter'}`,
      detail: 'Lecture finished — this quiz is unlocked for you.',
      href: `/student/assessment?job=${encodeURIComponent(open[0].job.job_id)}&title=${encodeURIComponent(open[0].job.chapter_title || 'Chapter quiz')}`,
    });
  } else if (locked[0]) {
    const wp = clampPct(locked[0].job.watch_percent);
    focusItems.push({
      id: `lock-${locked[0].job.job_id}`,
      tone: 'amber',
      title: `Unlock quiz · ${locked[0].job.chapter_title || 'Chapter'}`,
      detail: `Watch to 100% (now ${wp}%) to open the assessment.`,
      href: '/student/subjects',
    });
  }
  if (assignments[0]) {
    focusItems.push({
      id: `iv-${assignments[0].id}`,
      tone: 'green',
      title: `Practice interview · ${assignments[0].title}`,
      detail: assignments[0].dueShort
        ? `${assignments[0].mode} · due ${assignments[0].dueShort}`
        : `${assignments[0].mode} · assigned by your department`,
      href: '/student/interviews',
    });
  }
  if (!focusItems.length && chaptersTotal) {
    focusItems.push({
      id: 'tutor',
      tone: 'teal',
      title: 'Ask your AI Tutor',
      detail: 'Clarify a concept from your published lectures in English or Tamil.',
      href: '/student/subjects',
    });
  }

  const aDone = done.length;
  const aAvailable = done.length + open.length;
  const quizSemesterPct = aAvailable ? Math.round((aDone / aAvailable) * 100) : 0;

  return {
    chapterRows,
    interviewRows,
    // Self-started AI interviews are for final-year students (SOW §5.3);
    // assigned ones are always allowed. Unknown -> don't hide anything.
    canSelfInterview: me?.is_final_year !== false,
    name: me?.first_name || me?.name?.trim()?.split(/\s+/)[0] || '',
    fullName: me?.name || [me?.first_name, me?.last_name].filter(Boolean).join(' ') || '',
    deptName,
    collegeName,
    videosAvailable,
    reportsAvailable,
    leaderboardAvailable,
    assignmentsAvailable,
    subjects,
    recentLectures,
    upNext,
    assessmentsReady,
    continueLearning,
    focusItems,
    assignments,
    trend,
    chapterWatch,
    watch: {
      finished: chaptersFinished,
      total: chaptersTotal,
      percent: watchSemesterPct,
    },
    assessments: {
      done: aDone,
      available: aAvailable,
      locked: locked.length,
      avg: avg(done.map((x) => x.quiz.percentage)),
      best: done.length ? Math.max(...done.map((x) => Math.round(x.quiz.percentage || 0))) : null,
      semesterPct: quizSemesterPct,
    },
    interviews: {
      total: reportsAvailable ? (kpi.total_reports ?? reportItems.length) : null,
      avg: interviewAvg && interviewAvg > 0 ? interviewAvg : null,
      highest: kpi.highest_score != null && Number(kpi.highest_score) > 0
        ? Math.round(Number(kpi.highest_score))
        : null,
    },
    leaderboard: {
      scope: leaderboard?.scope || null,
      meRank,
      meAvg: meLb?.avgScore ?? null,
      note: leaderboard?.note || null,
      items: lbItems,
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
