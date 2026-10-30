import { z } from 'zod';
import {
  mcqExplanationField,
  mcqOptionField,
  mcqQuestionField,
  resetReasonField,
} from '../fields';

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

const LETTERS = ['A', 'B', 'C', 'D'];

function refineCorrectOptions(data, ctx, { typeKey = 'question_type', requireType = false } = {}) {
  const type = String(data[typeKey] || data.question_type || '').toLowerCase();
  const correct = [...new Set((data.correct_options || []).map((s) => String(s).toUpperCase()))];
  const options = LETTERS
    .map((k) => ({ key: k, value: String(data[`option_${k.toLowerCase()}`] || '').trim() }))
    .filter((o) => o.value);
  if (requireType && !type) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Choose a question type.', path: ['question_type'] });
    return;
  }
  if (type === 'true_false') {
    if (correct.length !== 1 || !['A', 'B'].includes(correct[0])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'True / false needs exactly one correct answer.', path: ['correct_options'] });
    }
    return;
  }
  // Backend check_question: single and multiple always need Option C and Option D.
  if (!String(data.option_c || '').trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Option C is required', path: ['option_c'] });
  }
  if (!String(data.option_d || '').trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Option D is required', path: ['option_d'] });
  }
  if (type === 'single' && correct.length !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A single-answer question needs exactly one correct option.', path: ['correct_options'] });
  }
  if (type === 'multiple') {
    if (correct.length < 2 || correct.length > 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A multiple-answer question needs two or three correct options.', path: ['correct_options'] });
    }
    if (options.length && correct.length >= options.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Not every option can be correct.', path: ['correct_options'] });
    }
  }
  const values = options.map((o) => o.value.toLowerCase());
  if (new Set(values).size !== values.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Each option must be different.', path: ['option_a'] });
  }
}

/** PATCH one existing question — type cannot change. */
export const mcqQuestionEditSchema = z.object({
  question_text: mcqQuestionField(),
  option_a: mcqOptionField('Option A'),
  option_b: mcqOptionField('Option B'),
  option_c: mcqOptionField('Option C', { required: false }),
  option_d: mcqOptionField('Option D', { required: false }),
  correct_options: z.array(optionLetter).min(1, 'Mark the correct answer.'),
  explanation: mcqExplanationField(),
  question_type: z.enum(['single', 'multiple', 'true_false']).optional(),
}).superRefine((data, ctx) => refineCorrectOptions(data, ctx));

/** POST a new question. */
export const mcqQuestionCreateSchema = z.object({
  question_type: z.enum(['single', 'multiple', 'true_false'], {
    required_error: 'Choose a question type.',
  }),
  question_text: mcqQuestionField(),
  option_a: mcqOptionField('Option A'),
  option_b: mcqOptionField('Option B'),
  option_c: mcqOptionField('Option C', { required: false }),
  option_d: mcqOptionField('Option D', { required: false }),
  correct_options: z.array(optionLetter).min(1, 'Mark the correct answer.'),
  explanation: mcqExplanationField(),
}).superRefine((data, ctx) => refineCorrectOptions(data, ctx, { requireType: true }));

export const mcqResetReasonSchema = z.object({
  reason: resetReasonField(),
});
