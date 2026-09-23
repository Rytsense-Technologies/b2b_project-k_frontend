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
};

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
