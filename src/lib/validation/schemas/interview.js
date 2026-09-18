import { z } from 'zod';
import { academicLabelField } from '../fields';

export const INTERVIEW_MODE_VALUES = ['mock', 'full'];
export const INTERVIEW_DIFFICULTY_VALUES = ['beginner', 'intermediate', 'advanced', 'adaptive'];
export const INTERVIEW_EXPERIENCE_VALUES = ['0-1', '1-2', '2-4', '4-7', '7+'];

export const interviewSetupSchema = z.object({
  mode: z.enum(INTERVIEW_MODE_VALUES, {
    required_error: 'Choose mock or full interview',
    invalid_type_error: 'Choose mock or full interview',
  }),
  position: academicLabelField('Target role'),
  difficulty: z.enum(INTERVIEW_DIFFICULTY_VALUES, {
    required_error: 'Select a difficulty',
    invalid_type_error: 'Select a difficulty',
  }),
  experience: z.enum(INTERVIEW_EXPERIENCE_VALUES, {
    required_error: 'Select your experience level',
    invalid_type_error: 'Select your experience level',
  }),
});
