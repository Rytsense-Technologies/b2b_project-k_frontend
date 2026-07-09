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

/** Discrete experience values for POST /livekit-interview/start */
export const EXPERIENCE_OPTIONS = [
  { value: '0', label: 'Fresher (0 years)' },
  ...Array.from({ length: 14 }, (_, i) => {
    const years = i + 1;
    return {
      value: String(years),
      label: years === 1 ? '1 year' : `${years} years`,
    };
  }),
  { value: '15', label: '15+ years' },
];

export function experienceLabel(value) {
  return EXPERIENCE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Build request body for POST /livekit-interview/start */
export function buildLivekitStartPayload({
  resumeId,
  role,
  experience,
  mode,
  difficulty,
  jobDescription,
}) {
  return {
    resume_id: resumeId,
    position: role.trim(),
    experience: String(experience),
    mode,
    difficulty,
    job_description: jobDescription?.trim() || undefined,
  };
}
