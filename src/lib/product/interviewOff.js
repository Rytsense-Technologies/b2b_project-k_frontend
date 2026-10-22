/**
 * INTERVIEWS_ENABLED=false (default, 20 Oct 2026): interview routers are not
 * mounted and return 404. Portal interview screens were removed. If a payload
 * still names interviews, hide it — feature off, not an error.
 * Do not match "livekit" alone: the AI tutor still uses LiveKit for voice QnA.
 */
const INTERVIEW_LABEL = /ai[\s_-]?interview|\binterviews?\b|\bmock\b/i;

export function isInterviewOff(value) {
  return INTERVIEW_LABEL.test(String(value || ''));
}

export function withoutInterview(list, pick) {
  const items = Array.isArray(list) ? list : [];
  if (!pick) return items.filter((item) => !isInterviewOff(item));
  return items.filter((item) => !isInterviewOff(pick(item)));
}
