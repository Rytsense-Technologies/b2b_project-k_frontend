import { z } from 'zod';
import { academicLabelField } from '../fields';

export const interviewAssignmentSchema = z.object({
  title: academicLabelField('Assignment title'),
  mode: z.enum(['mock', 'full'], {
    errorMap: () => ({ message: 'Choose mock or full interview mode.' }),
  }),
  department_id: z.string().optional().or(z.literal('')),
  final_year_only: z.boolean().default(true),
  year_of_study: z.coerce.number().int().min(1).max(8).optional().nullable(),
  due_at: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000, 'Keep notes under 2000 characters.').optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (!data.final_year_only && (data.year_of_study == null || Number.isNaN(Number(data.year_of_study)))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['year_of_study'],
      message: 'Enter the year of study, or keep final-year only on.',
    });
  }
});
