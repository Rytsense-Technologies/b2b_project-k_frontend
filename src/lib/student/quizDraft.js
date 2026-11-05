/**
 * In-progress assessment answers, per chapter, for this tab only.
 * sessionStorage: survives a reload, ends with the tab, and sign-out clears it.
 * The server stays the only grader; a draft is just what the student had ticked.
 */
const PREFIX = 'pk_quiz_draft:';

function storage() {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Option letters this question offers (the API sends option_a to option_d). */
function optionIds(question) {
  return ['A', 'B', 'C', 'D'].filter((k) => question?.[`option_${k.toLowerCase()}`] != null);
}

export function saveQuizDraft(jobId, { answers, index }) {
  try {
    storage()?.setItem(`${PREFIX}${jobId}`, JSON.stringify({ answers, index }));
  } catch { /* quota or private mode: the quiz still works */ }
}

/** Only answers that still fit the current question set come back. */
export function loadQuizDraft(jobId, questions) {
  const empty = { answers: {}, index: 0 };
  let saved;
  try {
    saved = JSON.parse(storage()?.getItem(`${PREFIX}${jobId}`) || 'null');
  } catch {
    return empty;
  }
  if (!saved || typeof saved !== 'object') return empty;
  const answers = {};
  (questions || []).forEach((q) => {
    const allowed = new Set(optionIds(q));
    const kept = (Array.isArray(saved.answers?.[q.id]) ? saved.answers[q.id] : []).filter((o) => allowed.has(o));
    if (kept.length) answers[q.id] = kept;
  });
  const last = Math.max(0, (questions || []).length - 1);
  const index = Math.min(last, Math.max(0, Number(saved.index) || 0));
  return { answers, index };
}

export function clearQuizDraft(jobId) {
  try {
    storage()?.removeItem(`${PREFIX}${jobId}`);
  } catch { /* private mode */ }
}

export function clearQuizDrafts() {
  try {
    const s = storage();
    if (!s) return;
    const keys = [];
    for (let i = 0; i < s.length; i += 1) keys.push(s.key(i));
    keys.filter((k) => k?.startsWith(PREFIX)).forEach((k) => s.removeItem(k));
  } catch { /* private mode */ }
}
