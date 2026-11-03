/**
 * MCQ module — `/api/v1/mcq` (cookie auth, withCredentials via shared axios).
 * Contract: docs/MCQ_API_FRONTEND_GUIDE.md
 */
import api from '@/lib/axios';
import { apiErrorMessage, rateLimitInfo } from '@/lib/api/superadmin/http';

function withUnapprove(path, unapprove) {
  return unapprove ? `${path}?unapprove=true` : path;
}

function detailFromError(err, fallback) {
  return apiErrorMessage(err, fallback);
}

export const mcqApi = {
  /**
   * POST /mcq/jobs/{job_id}/generate — sync LLM generate/regenerate.
   * Returns MCQDocumentDetail (includes answer key). JOB_ROLES only.
   */
  generate(jobId) {
    // Synchronous LLM call — backend can take ~60s with retries (guide §3.1).
    // No request body — omit data so axios does not send JSON `null`.
    return api
      .post(`/mcq/jobs/${encodeURIComponent(jobId)}/generate`, undefined, { timeout: 120000 })
      .then((res) => res?.data);
  },

  /**
   * GET /mcq/jobs/{job_id}
   * - Admin/faculty/hod/superadmin → MCQDocumentDetail (answer key)
   * - Student → MCQStudentView (not_attempted | already_attempted)
   */
  get(jobId) {
    return api
      .get(`/mcq/jobs/${encodeURIComponent(jobId)}`)
      .then((res) => res?.data);
  },

  /**
   * GET /mcq/my-attempts — every quiz the signed-in student submitted, with its chapter job_id.
   * One call instead of get(jobId) per chapter. Returns [{ job_id, percentage, correct_count, total_questions, submitted_at }].
   */
  myAttempts() {
    return api.get('/mcq/my-attempts').then((res) => res?.data?.items || []);
  },

  /**
   * Staff view that treats "no question set yet" (404) as `null` instead of an error.
   * Note: the browser still logs the 404 response in the network console; only the
   * backend can avoid that (e.g. by returning the set state on the jobs list).
   */
  getOrNull(jobId) {
    return api
      .get(`/mcq/jobs/${encodeURIComponent(jobId)}`, {
        validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
      })
      .then((res) => (res?.status === 404 ? null : res?.data));
  },

  /**
   * POST /mcq/jobs/{job_id}/submit — student only, one attempt.
   * Body: { answers: [{ question_id, selected_options: ['A'|…] }] }
   */
  submit(jobId, body) {
    return api
      .post(`/mcq/jobs/${encodeURIComponent(jobId)}/submit`, body)
      .then((res) => res?.data);
  },

  /** POST /mcq/jobs/{job_id}/approve — HOD / Faculty (or admin) releases the set to students. */
  approve(jobId, { setVersion } = {}) {
    const body = setVersion != null && setVersion !== '' ? { set_version: Number(setVersion) } : {};
    return api
      .post(`/mcq/jobs/${encodeURIComponent(jobId)}/approve`, Object.keys(body).length ? body : undefined)
      .then((res) => res?.data);
  },

  /**
   * PATCH /mcq/jobs/{job_id}/questions/{question_id}[?unapprove=true]
   * Body: only the fields to change. Live (approved) sets need unapprove=true.
   */
  patchQuestion(jobId, questionId, body, { unapprove = false } = {}) {
    const path = withUnapprove(
      `/mcq/jobs/${encodeURIComponent(jobId)}/questions/${encodeURIComponent(questionId)}`,
      unapprove,
    );
    return api.patch(path, body).then((res) => res?.data);
  },

  /** DELETE /mcq/jobs/{job_id}/questions/{question_id}[?unapprove=true] */
  deleteQuestion(jobId, questionId, { unapprove = false } = {}) {
    const path = withUnapprove(
      `/mcq/jobs/${encodeURIComponent(jobId)}/questions/${encodeURIComponent(questionId)}`,
      unapprove,
    );
    return api.delete(path).then((res) => res?.data);
  },

  /** POST /mcq/jobs/{job_id}/questions[?unapprove=true] */
  addQuestion(jobId, body, { unapprove = false } = {}) {
    const path = withUnapprove(`/mcq/jobs/${encodeURIComponent(jobId)}/questions`, unapprove);
    return api.post(path, body).then((res) => res?.data);
  },

  /**
   * POST /mcq/jobs/{job_id}/attempts/{student_user_id}/reset
   * Optional `{ reason }` (max 300). Deletes that student's one attempt.
   */
  resetAttempt(jobId, studentUserId, { reason } = {}) {
    const body = reason ? { reason } : {};
    return api
      .post(
        `/mcq/jobs/${encodeURIComponent(jobId)}/attempts/${encodeURIComponent(studentUserId)}/reset`,
        Object.keys(body).length ? body : undefined,
      )
      .then((res) => res?.data);
  },

  /**
   * GET /mcq/jobs/{job_id}/report.pdf — assessment PDF report (SOW §6.4.3).
   * Students get their own; staff pass the student's userId.
   */
  async downloadReport(jobId, userId) {
    const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    const res = await api.get(`/mcq/jobs/${encodeURIComponent(jobId)}/report.pdf${qs}`, { responseType: 'blob' });
    const disposition = res.headers?.['content-disposition'] || '';
    const name = disposition.match(/filename="?([^"]+)"?/i)?.[1] || 'quirri-assessment-report.pdf';
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

/**
 * Staff-side "Generate MCQs" errors (FRONTEND_CHANGES.md §7):
 * 404 not available · 409 already generating · 400 unreadable document (show detail).
 */
export function mcqGenerateErrorMessage(err) {
  const status = err?.response?.status;
  const detail = String(err?.response?.data?.detail || '').trim();
  if (status === 404) return 'Not available — this chapter could not be found.';
  if (status === 409) return 'MCQs are already being generated for this chapter. Please wait…';
  if (status === 400 && detail && !/\/mcq\/jobs|POST\s*\//i.test(detail)) return detail;
  if (status === 429) return rateLimitInfo(err)?.message || 'Please wait a moment and try again.';
  return mcqErrorMessage(err, 'Could not generate MCQs for this chapter.');
}

export function isQuizUpdatingError(err) {
  const status = err?.response?.status;
  const detail = String(err?.response?.data?.detail || '');
  return status === 409 && /isn't ready|not ready yet|try again shortly/i.test(detail);
}

export function isLiveSetConfirmError(err) {
  const status = err?.response?.status;
  const detail = String(err?.response?.data?.detail || '');
  return status === 409 && /unapprove=true|live for students/i.test(detail);
}

export function isApproveVersionConflict(err) {
  const status = err?.response?.status;
  const detail = String(err?.response?.data?.detail || '');
  return status === 409 && /set_version|changed since|reviewed/i.test(detail);
}

/**
 * After a 409 ("already generating"), wait for the running generation to
 * finish. Resolves with the document once it is ready/failed, or null on timeout.
 */
export async function waitForMcqGeneration(jobId, { intervalMs = 5000, timeoutMs = 180000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      // eslint-disable-next-line no-await-in-loop
      const doc = await mcqApi.get(jobId);
      if (doc && doc.status && doc.status !== 'generating' && doc.status !== 'pending') return doc;
    } catch (err) {
      if (err?.response?.status !== 404) return null; // 404 = document row not created yet
    }
  }
  return null;
}

export function mcqErrorMessage(err, fallback = 'Something went wrong with this quiz.') {
  const status = err?.response?.status;
  const raw = String(
    err?.response?.data?.detail
      || err?.response?.data?.message
      || err?.message
      || '',
  );

  if (status === 429) {
    return rateLimitInfo(err)?.message || 'Please wait a moment and try again.';
  }
  if (status === 404) {
    // Backend sometimes returns internal generate hints — never show those to students.
    if (/generate|POST\s*\/mcq|No MCQs generated/i.test(raw)) {
      return 'This chapter quiz is not ready yet. Your faculty still needs to generate the questions.';
    }
    return apiErrorMessage(
      err,
      'This quiz is not available to you, or MCQs have not been generated yet.',
    );
  }
  if (status === 409) {
    if (/isn't ready|not ready yet|try again shortly/i.test(raw)) {
      return 'This quiz is being updated — try again in a minute.';
    }
    if (/already being generated/i.test(raw)) {
      return 'This quiz is still being prepared. Please try again shortly.';
    }
    if (/already submitted|already attempted|one attempt/i.test(raw)) {
      return 'You have already submitted this assessment. Only one attempt is allowed.';
    }
    return apiErrorMessage(err, 'This quiz cannot be continued right now.');
  }
  if (status === 400 && /extractable text|LLM|generation failed/i.test(raw)) {
    return 'Questions could not be generated from this chapter material. Try another file, or ask support.';
  }
  // Strip accidental endpoint/path leaks from any other error detail.
  if (/\/mcq\/jobs|POST\s*\/|GET\s*\//i.test(raw)) {
    return fallback;
  }
  return detailFromError(err, fallback);
}

/** Option letters present on a question (true_false often only A/B). */
export function optionEntries(question) {
  if (!question || typeof question !== 'object') return [];
  const keys = ['A', 'B', 'C', 'D'];
  const map = {
    A: question.option_a,
    B: question.option_b,
    C: question.option_c,
    D: question.option_d,
  };
  return keys
    .filter((k) => map[k] != null && String(map[k]).trim() !== '')
    .map((k) => ({ key: k, label: String(map[k]) }));
}

/**
 * Question-set state for a chapter, from a staff MCQ document (or null when none exists).
 * 'none' | 'generating' | 'failed' | 'awaiting' | 'approved'
 */
export function mcqSetState(doc) {
  if (!doc) return 'none';
  const s = String(doc.status || '').toLowerCase();
  if (s === 'generating' || s === 'pending') return 'generating';
  if (s === 'failed') return 'failed';
  if (doc.approved_at) return 'approved';
  return 'awaiting';
}

/** Human label for a question type: "true_false" → "True / False". */
export function questionTypeLabel(type) {
  const t = String(type || '').toLowerCase();
  if (!t) return '';
  if (t === 'true_false' || t === 'truefalse' || t === 'boolean') return 'True / False';
  if (t === 'single' || t === 'single_choice' || t === 'mcq') return 'Single answer';
  if (t === 'multiple' || t === 'multiple_choice' || t === 'multi') return 'Multiple answers';
  const text = t.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function isMultiSelect(question) {
  return String(question?.question_type || '').toLowerCase() === 'multiple';
}
