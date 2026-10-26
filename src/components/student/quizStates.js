/**
 * Quiz state per chapter for the student pages, without one GET per chapter (redesign X8).
 *
 *   GET /mcq/my-attempts      → every submitted quiz (score + attempted state) in one call
 *   GET /mcq/jobs/{job_id}    → only for a fully watched chapter with no attempt, where the page
 *                               needs to know if its assessment is open or not published yet.
 *                               Not capped: each one is a chapter the student can act on.
 *
 * Unwatched chapters with no attempt are left out of the map (state unknown — the pages show
 * "watch to unlock" from the watch percentage, never a guess about the quiz).
 * Returns Map<job_id, { state: 'done'|'open'|'watch_required'|'unavailable', percentage?, correct?, total?, submittedAt? }>.
 */
import { mcqApi } from '@/lib/api/mcq';
import { quizStatus } from '@/lib/student/dashboardModel';

const watched = (job) => Boolean(job?.watch_complete) || Number(job?.watch_percent) >= 100;

export async function loadQuizStates(chapters) {
  const list = (chapters || []).filter((j) => j?.job_id);
  const map = new Map();
  let attempts = null;
  try {
    attempts = await mcqApi.myAttempts();
  } catch {
    attempts = null;
  }

  if (attempts) {
    // Newest first from the API — keep the first (latest) attempt per chapter.
    attempts.forEach((a) => {
      const id = String(a.job_id);
      if (map.has(id)) return;
      map.set(id, {
        state: 'done',
        percentage: Number(a.percentage),
        correct: a.correct_count,
        total: a.total_questions,
        submittedAt: a.submitted_at,
      });
    });
  }

  // Availability lookups: attempts unavailable → every chapter; otherwise watched chapters without an attempt.
  const pending = list.filter((j) => !map.has(String(j.job_id)) && (attempts === null || watched(j)));
  const states = await Promise.all(pending.map((j) => quizStatus(j.job_id)));
  pending.forEach((j, i) => map.set(String(j.job_id), states[i]));
  return map;
}
