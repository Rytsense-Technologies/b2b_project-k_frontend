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

/** Discrete experience values for POST /livekit-interview/start (guide §3.1) */
export const EXPERIENCE_OPTIONS = [
  { value: '0-1', label: 'Fresher (0–1 years)' },
  { value: '1-2', label: 'Junior (1–2 years)' },
  { value: '2-4', label: 'Mid-level (2–4 years)' },
  { value: '4-7', label: 'Senior (4–7 years)' },
  { value: '7+', label: 'Expert (7+ years)' },
];

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
