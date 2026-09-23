import { z } from 'zod';

const optionLetter = z.enum(['A', 'B', 'C', 'D']);

/** Student submit body — matches MCQSubmitRequest on the backend. */
export const mcqSubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        question_id: z.string().uuid('Each answer needs a valid question id.'),
        selected_options: z
          .array(optionLetter)
          .min(1, 'Select at least one option for each question.'),
      }),
    )
    .min(1, 'Answer every question before submitting.'),
}).superRefine((data, ctx) => {
  const seen = new Set();
  data.answers.forEach((a, i) => {
    if (seen.has(a.question_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each question can only appear once in your answers.',
        path: ['answers', i, 'question_id'],
      });
    }
    seen.add(a.question_id);
  });
});
