/** localStorage: user explicitly opted out of the pre-interview do's & don'ts dialog */
export const HIDE_DOS_DONTS_STORAGE_KEY = 'pk_hide_interview_dos_donts_v2';

export function shouldSkipDosDontsDialog() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(HIDE_DOS_DONTS_STORAGE_KEY) === '1';
}

export function setSkipDosDontsDialog(skip) {
  if (typeof window === 'undefined') return;
  if (skip) localStorage.setItem(HIDE_DOS_DONTS_STORAGE_KEY, '1');
  else localStorage.removeItem(HIDE_DOS_DONTS_STORAGE_KEY);
}

/** Discrete experience values for POST /livekit-interview/start (guide §3.1).
 *  B2B students are freshers, so the setup control offers only the first band.
 *  The rest stay here so older reports can still show their saved level. */
export const EXPERIENCE_OPTIONS = [
  { value: '0-1', label: 'Fresher' },
  { value: '1-2', label: '1–2 years (Junior)' },
  { value: '2-4', label: '2–4 years (Mid-level)' },
  { value: '4-7', label: '4–7 years (Senior)' },
  { value: '7+', label: '7+ years (Expert)' },
];

export const STUDENT_EXPERIENCE_OPTIONS = EXPERIENCE_OPTIONS.filter((option) => option.value === '0-1');
export const STUDENT_EXPERIENCE = '0-1';

export const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'adaptive', label: 'Adaptive' },
];

export const INTERVIEW_MODES = [
  {
    id: 'mock',
    title: 'Mock interview',
    description: 'Three focused questions with instant feedback. Good for daily practice.',
    duration: '3–5 min · uses 1 mock',
  },
  {
    id: 'full',
    title: 'Full interview',
    description: 'More questions, follow-ups, and a detailed post-interview report.',
    duration: '10–15 min · uses 1 full',
  },
];

export function experienceLabel(value) {
  return EXPERIENCE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/**
 * Build request body for POST /livekit-interview/start
 * @param {{ resumeId: string, role: string, experience: string, mode: 'mock'|'full', difficulty: string, jobDescription?: string, acknowledgedRoleMismatch?: boolean }} opts
 */
export function buildLivekitStartPayload({
  resumeId,
  role,
  experience,
  mode,
  difficulty,
  jobDescription,
  acknowledgedRoleMismatch = false,
}) {
  return {
    resume_id: resumeId,
    position: String(role || '').trim(),
    experience: String(experience),
    mode: mode === 'full' ? 'full' : 'mock',
    difficulty,
    job_description: jobDescription?.trim() || undefined,
    acknowledged_role_mismatch: Boolean(acknowledgedRoleMismatch),
  };
}

/* ---------------- Start Interview wizard (owner mock-ups, Oct 2026) ---------------- */

export const INTERVIEW_LANGUAGE = 'English';
export const JOB_DESCRIPTION_MAX = 8000;

/** Shown in the summary card and on the mode cards. */
export const MODE_META = {
  mock: {
    label: 'Mock interview',
    time: '5 mins',
    questions: '3',
    duration: '3 to 5 minutes',
    blurb: 'Best for daily use. Get 3 focused questions with instant feedback. Mock interview scores are not calculated — this is only for your training.',
  },
  full: {
    label: 'Full interview',
    time: '15 mins',
    questions: 'With follow-ups',
    duration: '10 to 15 minutes',
    blurb: 'Includes more questions, follow-ups, deeper evaluation, and a detailed post-interview analysis.',
  },
};

export const DIFFICULTY_HINT = {
  beginner: 'Foundational questions to build confidence',
  intermediate: 'Recommended for most users',
  advanced: 'Deeper technical and scenario questions',
  adaptive: 'Adjusts to how you answer',
};

export const INTERVIEW_DOS = [
  'Quiet space, stable internet, and good lighting.',
  'Test microphone and camera before you begin.',
  'Answer clearly with short, structured examples.',
  'Listen to the full question before responding.',
  'Stay honest about what you know and have done.',
];

export const INTERVIEW_DONTS = [
  'Don’t read answers from your resume or notes.',
  'Don’t interrupt while a question is being asked.',
  'Don’t rush — take a moment to think when needed.',
  'Don’t overuse filler words (um, like, you know).',
  'Don’t leave long silences without acknowledging the question.',
];

/** Tips rotated in the waiting room. */
export const WAITING_TIPS = [
  { title: 'Settle in', body: 'Find a quiet spot with stable internet. Sit comfortably so you can speak clearly.' },
  { title: 'Frame your answers', body: 'Use Situation, Task, Action, Result to keep examples short and clear.' },
  { title: 'Take a breath', body: 'It is fine to pause and think before you answer. Say so if you need a moment.' },
];

/** Guidelines show only before a student's first interview (owner rule). */
export function guidelinesAcknowledged() {
  return shouldSkipDosDontsDialog();
}
