import { z } from 'zod';
import { academicLabelField, codeField } from '../fields';

const count = (label, min, max) => z.coerce
  .number({ invalid_type_error: `Select ${label.toLowerCase()}` })
  .int()
  .min(min, `Select ${label.toLowerCase()}`)
  .max(max, `${label} can be at most ${max}`);

/** Total semesters a programme may have (backend MAX_SEMESTERS). */
export const MAX_PROGRAMME_SEMESTERS = 18;

const programmeFields = {
  name: academicLabelField('Programme name'),
  code: codeField('Programme code', { required: false }),
  duration_years: count('Duration', 1, 6),
  semesters_per_year: count('Semesters per year', 1, 3),
};

/** POST /api/v1/academics/programs */
export const programmeCreateSchema = z.object({
  college_id: z.string().min(1, 'Select a college'),
  department_id: z.string().min(1, 'Select a department'),
  ...programmeFields,
}).refine((v) => v.duration_years * v.semesters_per_year <= MAX_PROGRAMME_SEMESTERS, {
  message: `A programme can have at most ${MAX_PROGRAMME_SEMESTERS} semesters`,
  path: ['semesters_per_year'],
});

/** PATCH /api/v1/academics/programs/{id} — college and department are fixed */
export const programmeUpdateSchema = z.object(programmeFields).refine(
  (v) => v.duration_years * v.semesters_per_year <= MAX_PROGRAMME_SEMESTERS,
  { message: `A programme can have at most ${MAX_PROGRAMME_SEMESTERS} semesters`, path: ['semesters_per_year'] },
);

/** PATCH /api/v1/academics/semesters/{id} and POST .../programs/{id}/semesters */
export const semesterSchema = z.object({
  name: academicLabelField('Semester name'),
});

/** POST /api/v1/academics/semesters/{id}/subjects · PATCH /academics/subjects/{id} */
export const subjectSchema = z.object({
  name: academicLabelField('Subject name'),
  code: codeField('Subject code', { required: false }),
});

/** POST /api/v1/academics/subjects/{id}/chapters · PATCH /academics/chapters/{id} */
export const chapterSchema = z.object({
  title: academicLabelField('Chapter title'),
});
