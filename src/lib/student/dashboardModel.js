/**
 * Student Home / My Progress view-model — live student APIs only (SOW §6.4):
 *   GET /auth/me
 *   GET /edu_video/student/videos          (+ watch_percent / watch_complete)
 *   GET /mcq/jobs/{job_id}                (done | open | watch_required)
 *   GET /leaderboard                      (cohort rank)
 * Missing sources leave their section empty — never mocked.
 */
import { mcqApi } from '@/lib/api/mcq';
import { asList } from '@/lib/api/superadmin/http';
import {
  assessmentHref as chapterAssessmentHref,
  classroomHref,
  subjectKey,
  subjectMeta,
  subjectName,
  titleCase,
} from '@/lib/student/learning';



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

export function buildHomeModel({
  me,
  chapters,
  quizByJob,
  leaderboard,
  videosAvailable,
  leaderboardAvailable,
}) {
  const deptName = me?.department_name || me?.department || null;
  const collegeName = me?.tenant_name || me?.college_name || null;

  /* ---------- subjects ---------- */
  const subjectMap = new Map();
  chapters.forEach((job) => {
    const key = subjectKey(job);
    if (!subjectMap.has(key)) {
      const meta = subjectMeta(job);
      subjectMap.set(key, { key, name: meta.name, semester: meta.semester, chapters: [] });
    }
    subjectMap.get(key).chapters.push(job);
  });
  const subjects = Array.from(subjectMap.values()).map((s) => {
    const quizzes = s.chapters.map((c) => quizByJob.get(c.job_id)).filter(Boolean);
    const available = quizzes.filter((q) => q.state === 'done' || q.state === 'open');
    const done = quizzes.filter((q) => q.state === 'done');
    const watched = s.chapters.filter((c) => Boolean(c.watch_complete)).length;
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
      quizCompletion: s.chapters.length
        ? Math.round((done.length / s.chapters.length) * 100)
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
      subject: subjectName(x.job),
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
    subject: subjectName(x.job),
    kind: 'assessment',
  }));

  const assessmentsReady = open.slice(0, 5).map((x) => ({
    jobId: x.job.job_id,
    title: x.job.chapter_title || 'Chapter quiz',
    subject: subjectName(x.job),
    cta: 'Take assessment',
    href: chapterAssessmentHref(x.job, subjectKey(x.job)),
  }));

  /* ---------- watch / continue learning ---------- */
  const chapterWatch = chapters.map((c) => {
    const watchPercent = clampPct(c.watch_percent);
    const watchComplete = Boolean(c.watch_complete);
    return {
      jobId: c.job_id,
      title: c.chapter_title || 'Untitled chapter',
      subject: subjectName(c),
      subjectKey: subjectKey(c),
      href: classroomHref(subjectKey(c), c.job_id),
      tutorHref: classroomHref(subjectKey(c), c.job_id, 'tutor'),
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
    chapterWatch.find((c) => c.watchPercent > 0 && !c.watchComplete)
    || chapterWatch.find((c) => !c.watchComplete)
    || null;

  /* ---------- lectures ---------- */
  const recentLectures = chapters.slice(0, 3).map((c) => {
    const q = quizByJob.get(c.job_id);
    const watchPercent = clampPct(c.watch_percent);
    const key = subjectKey(c);
    return {
      jobId: c.job_id,
      title: c.chapter_title || 'Lecture',
      subject: subjectName(c),
      subjectKey: key,
      classroomHref: classroomHref(key, c.job_id),
      tutorHref: classroomHref(key, c.job_id, 'tutor'),
      assessmentHref: chapterAssessmentHref(c, key),
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
      subject: subjectName(c),
      subjectKey: subjectKey(c),
      duration: formatDuration(c.video_duration_seconds),
      published: longDate(c.published_at),
      publishedAt: c.published_at || null,
      submittedAt: q?.state === 'done' ? q.submittedAt || null : null,
      watchPercent,
      watchComplete: Boolean(c.watch_complete),
      quiz: q?.state || 'unchecked',
      score: q?.state === 'done' && Number.isFinite(q.percentage) ? Math.round(q.percentage) : null,
      correct: q?.state === 'done' && q.total ? `${q.correct}/${q.total}` : null,
      submitted: q?.state === 'done' ? longDate(q.submittedAt) : null,
    };
  });

  /* ---------- leaderboard ---------- */
  const lbItems = asList(leaderboard, []).map((row) => ({
    rank: row.rank,
    name: titleCase(row.name),
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
      href: continueLearning.href,
    });
  }
  if (open[0]) {
    focusItems.push({
      id: `quiz-${open[0].job.job_id}`,
      tone: 'amber',
      title: `Take assessment · ${open[0].job.chapter_title || 'Chapter'}`,
      detail: 'Lecture finished — this quiz is unlocked for you.',
      href: chapterAssessmentHref(open[0].job, subjectKey(open[0].job)),
    });
  } else if (locked[0]) {
    const wp = clampPct(locked[0].job.watch_percent);
    focusItems.push({
      id: `lock-${locked[0].job.job_id}`,
      tone: 'amber',
      title: `Unlock quiz · ${locked[0].job.chapter_title || 'Chapter'}`,
      detail: `Watch to 100% (now ${wp}%) to open the assessment.`,
      href: classroomHref(subjectKey(locked[0].job), locked[0].job.job_id),
    });
  }
  if (!focusItems.length && chaptersTotal) {
    focusItems.push({
      id: 'tutor',
      tone: 'teal',
      title: 'Ask your AI Tutor',
      detail: 'Clarify a concept from your published lectures in English or Tamil.',
      href: chapters[0] ? classroomHref(subjectKey(chapters[0]), chapters[0].job_id, 'tutor') : '/student/subjects',
    });
  }

  const aDone = done.length;
  const aAvailable = done.length + open.length;
  // One definition everywhere (subjects page, dashboard, progress): assessments done ÷ published chapters.
  const quizSemesterPct = chaptersTotal ? Math.round((aDone / chaptersTotal) * 100) : 0;

  return {
    chapterRows,
    name: titleCase(me?.first_name || me?.name?.trim()?.split(/\s+/)[0] || ''),
    fullName: titleCase(me?.name || [me?.first_name, me?.last_name].filter(Boolean).join(' ') || ''),
    deptName,
    collegeName,
    videosAvailable,
    leaderboardAvailable,
    subjects,
    recentLectures,
    upNext,
    assessmentsReady,
    continueLearning,
    focusItems,
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
      total: chaptersTotal,
      locked: locked.length,
      avg: avg(done.map((x) => x.quiz.percentage)),
      best: done.length ? Math.max(...done.map((x) => Math.round(x.quiz.percentage || 0))) : null,
      semesterPct: quizSemesterPct,
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
