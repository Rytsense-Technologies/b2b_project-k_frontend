/**
 * Stable subject colour for the student portal (redesign spec X2, design-system §0c).
 * A subject keeps the same hue on Home, Subjects, Progress and Assessment:
 * `dataColor(subject_id)` hashes the id; "Other lectures" (no subject_id) is neutral grey.
 *
 * Accepts a chapter/job object (`subject_id`), a subject key from `subjectKey()`
 * (`subject:<id>` or a department fallback) or a raw subject id.
 */
import { dataColor } from '@/components/shared/data-viz';

const GREY = 'var(--neutral-300)';
const GREY_SOFT = 'var(--neutral-100)';

function subjectIdOf(input) {
  if (input == null || input === '') return null;
  if (typeof input === 'object') return input.subject_id ? String(input.subject_id) : null;
  const s = String(input);
  if (s.startsWith('subject:')) return s.slice(8) || null;
  return null;
}

/** Hue for a subject (CSS var), or grey for unlinked "Other lectures". */
export function subjectColor(input) {
  const id = subjectIdOf(input);
  return id ? dataColor(id) : GREY;
}

/** Soft disc / tile background in the same hue. */
export function subjectSoft(input) {
  const id = subjectIdOf(input);
  if (!id) return GREY_SOFT;
  return dataColor(id).replace(/\)$/, '-soft)');
}

/** Inline style for a tile: soft background + hue icon. */
export function subjectTileStyle(input) {
  const id = subjectIdOf(input);
  return id
    ? { background: subjectSoft(input), color: subjectColor(input) }
    : { background: GREY_SOFT, color: 'var(--ink-2)' };
}

export function isLinkedSubject(input) {
  return Boolean(subjectIdOf(input));
}
