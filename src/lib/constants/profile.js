/** B2C profile field options */

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'Others', label: 'Others' },
];

export const YEARS_OF_EXPERIENCE_OPTIONS = [
  { value: 'less_than_one_year', label: 'Less than one year' },
  { value: '1', label: '1 year' },
  { value: '2', label: '2 years' },
  { value: '3', label: '3 years' },
  { value: '4', label: '4 years' },
  { value: '5', label: '5 years' },
  { value: '6', label: '6 years' },
  { value: '7', label: '7 years' },
  { value: '8', label: '8 years' },
  { value: '9', label: '9 years' },
  { value: '10', label: '10 years' },
  { value: '11', label: '11 years' },
  { value: '12', label: '12 years' },
  { value: '13', label: '13 years' },
  { value: '14', label: '14 years' },
  { value: '15', label: '15+ years' },
];

export const DEFAULT_YEARS_OF_EXPERIENCE = 'less_than_one_year';

export function yearsOfExperienceFromApi(value) {
  if (value == null || value === '' || Number(value) === 0) {
    return DEFAULT_YEARS_OF_EXPERIENCE;
  }
  const n = Number(value);
  if (n >= 15) return '15';
  return String(n);
}

export function yearsOfExperienceToApi(value) {
  if (!value || value === DEFAULT_YEARS_OF_EXPERIENCE) return null;
  if (value === '15') return 15;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export function normalizeGender(value) {
  if (!value) return '';
  const v = String(value).toLowerCase();
  if (GENDER_OPTIONS.some((o) => o.value === v)) return v;
  if (v === 'm') return 'male';
  if (v === 'f') return 'female';
  return '';
}
