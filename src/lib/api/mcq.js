/**
 * MCQ module — `/api/v1/mcq` (cookie auth, withCredentials via shared axios).
 * Contract: docs/MCQ_API_FRONTEND_GUIDE.md
 */
import api from '@/lib/axios';
import { apiErrorMessage } from '@/lib/api/superadmin/http';

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
   * POST /mcq/jobs/{job_id}/submit — student only, one attempt.
   * Body: { answers: [{ question_id, selected_options: ['A'|…] }] }
   */
  submit(jobId, body) {
    return api
      .post(`/mcq/jobs/${encodeURIComponent(jobId)}/submit`, body)
      .then((res) => res?.data);
  },

  /** POST /mcq/jobs/{job_id}/approve — HOD / Faculty (or admin) releases the set to students. */
  approve(jobId) {
    return api
      .post(`/mcq/jobs/${encodeURIComponent(jobId)}/approve`)
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
  if (status === 429) return 'Please wait a moment and try again.';
  return mcqErrorMessage(err, 'Could not generate MCQs for this chapter.');
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
    return 'Please wait a moment and try again.';
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
    if (/already being generated|isn't ready|not ready/i.test(raw)) {
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

export function isMultiSelect(question) {
  return String(question?.question_type || '').toLowerCase() === 'multiple';
}
