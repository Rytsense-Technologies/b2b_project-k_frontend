import { z } from 'zod';
import { academicLabelField } from '../fields';

const YEAR_MSG = 'Enter a year of study (1–8).';

export const interviewAssignmentSchema = z.object({
  title: academicLabelField('Assignment title'),
  mode: z.enum(['mock', 'full'], {
    errorMap: () => ({ message: 'Choose mock or full interview mode.' }),
  }),
  department_id: z.string().optional().or(z.literal('')),
  final_year_only: z.boolean().default(true),
  // Empty input means "not set"; anything else must be a whole number from 1 to 8.
  year_of_study: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number({ invalid_type_error: YEAR_MSG })
      .int(YEAR_MSG)
      .min(1, YEAR_MSG)
      .max(8, YEAR_MSG)
      .nullable(),
  ),
  due_at: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000, 'Keep notes under 2,000 characters.').optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (!data.final_year_only && (data.year_of_study == null || Number.isNaN(Number(data.year_of_study)))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['year_of_study'],
      message: YEAR_MSG,
    });
  }
});
