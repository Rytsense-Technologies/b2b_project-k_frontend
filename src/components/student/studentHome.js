/**
 * Home / My progress loader — same sources as lib/student/dashboardModel.loadStudentHome,
 * but quiz states come from one GET /mcq/my-attempts (+ availability only for watched,
 * unattempted chapters) instead of a capped GET per chapter. The view-model is the shared
 * buildHomeModel, so both pages read the same numbers.
 */
import { eduVideoApi } from '@/lib/api/admin/eduVideo';
import { leaderboardApi } from '@/lib/api/leaderboard';
import { settingsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList } from '@/lib/api/superadmin/http';
import { buildHomeModel } from '@/lib/student/dashboardModel';
import { loadQuizStates } from '@/components/student/quizStates';
import { subjectKey } from '@/lib/student/learning';

const toTime = (iso) => Date.parse(iso || '') || 0;

export async function loadStudentHomeData() {
  const [meRes, videosRes, lbRes] = await Promise.allSettled([
    fetchData(() => settingsApi.get()),
    eduVideoApi.listStudentVideos({ pageSize: 100 }),
    leaderboardApi.get({ limit: 8 }),
  ]);

  // Retry the classroom list once — common race when the access token refreshes mid-flight.
  let videosSettled = videosRes;
  if (videosSettled.status === 'rejected') {
    try {
      videosSettled = { status: 'fulfilled', value: await eduVideoApi.listStudentVideos({ pageSize: 100 }) };
    } catch (err) {
      videosSettled = { status: 'rejected', reason: err };
    }
  }
  // The lecture list is the core source; without it the page would only show empty sections.
  if (videosSettled.status === 'rejected') throw videosSettled.reason;

  const me = meRes.status === 'fulfilled' ? (meRes.value?.user || meRes.value) : null;
  const videos = videosSettled.status === 'fulfilled' ? asList(videosSettled.value, []) : null;
  const leaderboard = lbRes.status === 'fulfilled' ? lbRes.value : null;
  const chapters = (videos || [])
    .filter((j) => j?.job_id)
    .sort((a, b) => toTime(b.published_at) - toTime(a.published_at));

  const quizByJob = await loadQuizStates(chapters);
  // A submitted assessment means the lecture was watched to 100% (the quiz only opens then),
  // so watch counts and chapter status agree with the score (S7).
  const chaptersSeen = chapters.map((j) => (quizByJob.get(String(j.job_id))?.state === 'done'
    ? { ...j, watch_percent: 100, watch_complete: true }
    : j));

  const model = buildHomeModel({
    me,
    chapters: chaptersSeen,
    quizByJob,
    leaderboard,
    videosAvailable: videos !== null,
    leaderboardAvailable: leaderboard !== null,
  });
  // Same subject order as My subjects (semester, then name; "Other lectures" last), so the
  // default subject and the colours line up across Home, Subjects and Progress (S17).
  const semNo = new Map(chapters.map((j) => [subjectKey(j), j.subject_id ? (Number(j.semester_number) || 0) : 999]));
  model.subjects = [...(model.subjects || [])].sort((a, b) => ((semNo.get(a.key) ?? 999) - (semNo.get(b.key) ?? 999))
    || String(a.name).localeCompare(String(b.name)));
  return model;
}
