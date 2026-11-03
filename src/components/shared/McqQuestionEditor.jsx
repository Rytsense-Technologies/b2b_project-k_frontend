'use client';

import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriControlledField, QuirriField, QuirriRHFField, QuirriSelect } from '@/components/superadmin/quirri-ui';
import { mcqQuestionCreateSchema, mcqQuestionEditSchema } from '@/lib/validation';

const TYPE_OPTIONS = [
  { value: 'single', label: 'Single answer' },
  { value: 'multiple', label: 'Multiple answers' },
  { value: 'true_false', label: 'True / false' },
];

const EMPTY = {
  question_type: 'single',
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_options: [],
  explanation: '',
};

function defaultsFrom(question, mode) {
  if (mode !== 'edit' || !question) return { ...EMPTY };
  const type = String(question.question_type || 'single').toLowerCase().replace('truefalse', 'true_false');
  const tf = type === 'true_false';
  return {
    question_type: tf ? 'true_false' : (type === 'multiple' ? 'multiple' : 'single'),
    question_text: question.question_text || '',
    option_a: tf ? 'True' : (question.option_a || ''),
    option_b: tf ? 'False' : (question.option_b || ''),
    option_c: tf ? '' : (question.option_c || ''),
    option_d: tf ? '' : (question.option_d || ''),
    correct_options: (question.correct_options || []).map((s) => String(s).toUpperCase()),
    explanation: question.explanation || '',
  };
}

export function questionPayload(values, { includeType = false } = {}) {
  const type = String(values.question_type || '').toLowerCase();
  const body = {
    question_text: String(values.question_text || '').trim(),
    option_a: type === 'true_false' ? 'True' : String(values.option_a || '').trim(),
    option_b: type === 'true_false' ? 'False' : String(values.option_b || '').trim(),
    correct_options: [...new Set((values.correct_options || []).map((s) => String(s).toUpperCase()))],
    explanation: String(values.explanation || '').trim(),
  };
  if (includeType) body.question_type = type;
  if (type !== 'true_false') {
    body.option_c = String(values.option_c || '').trim();
    body.option_d = String(values.option_d || '').trim();
  }
  return body;
}

/**
 * Add / edit one MCQ question (HOD / faculty). Type cannot change on edit.
 */
export default function McqQuestionEditor({
  open,
  mode = 'add',
  question = null,
  saving = false,
  onClose,
  onSave,
}) {
  const isEdit = mode === 'edit';
  const schema = isEdit ? mcqQuestionEditSchema : mcqQuestionCreateSchema;
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultsFrom(question, mode),
    mode: 'onBlur',
  });
  const type = useWatch({ control, name: 'question_type' }) || 'single';
  const correct = useWatch({ control, name: 'correct_options' }) || [];
  const tf = type === 'true_false';
  const letters = tf ? ['A', 'B'] : ['A', 'B', 'C', 'D'];

  useEffect(() => {
    if (open) reset(defaultsFrom(question, mode));
  }, [open, question, mode, reset]);

  const toggleCorrect = (letter) => {
    if (saving) return;
    if (type === 'multiple') {
      const cur = new Set(getValues('correct_options') || []);
      if (cur.has(letter)) cur.delete(letter);
      else cur.add(letter);
      setValue('correct_options', Array.from(cur), { shouldValidate: true, shouldDirty: true });
      return;
    }
    setValue('correct_options', [letter], { shouldValidate: true, shouldDirty: true });
  };

  const onTypeChange = (next) => {
    setValue('question_type', next, { shouldValidate: true, shouldDirty: true });
    if (next === 'true_false') {
      setValue('option_a', 'True');
      setValue('option_b', 'False');
      setValue('option_c', '');
      setValue('option_d', '');
      setValue('correct_options', ['A'], { shouldValidate: true });
    }
  };

  if (!open) return null;

  return (
    <QuirriModal
      open={open}
      onClose={() => { if (!saving) onClose?.(); }}
      title={isEdit ? 'Edit question' : 'Add a question'}
      crumb={isEdit ? 'Question set' : 'New question'}
      wide
      busy={saving}
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <div className="right">
            <button type="button" className="sd-btn sd-btn--amber" onClick={handleSubmit((values) => onSave(questionPayload(values, { includeType: !isEdit })))} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save question' : 'Add question'}
            </button>
          </div>
        </>
      )}
    >
      <form className="fa-qform" onSubmit={handleSubmit((values) => onSave(questionPayload(values, { includeType: !isEdit })))}>
        {isEdit ? (
          <QuirriField label="Question type" hint="The question type cannot change after it is created.">
            <QuirriSelect
              ariaLabel="Question type"
              value={type}
              onChange={() => {}}
              options={TYPE_OPTIONS}
              disabled
            />
          </QuirriField>
        ) : (
          <Controller
            control={control}
            name="question_type"
            render={({ field, fieldState }) => (
              <QuirriField label="Question type" error={fieldState.error?.message} htmlFor="mcq-q-type">
                <QuirriSelect
                  id="mcq-q-type"
                  name={field.name}
                  value={field.value}
                  onChange={(e) => onTypeChange(e.target.value)}
                  onBlur={field.onBlur}
                  options={TYPE_OPTIONS}
                  placeholder="Select a question type"
                />
              </QuirriField>
            )}
          />
        )}

        <QuirriRHFField
          control={control}
          name="question_text"
          fieldType="mcqQuestion"
          label="Question"
          full
          multiline
          rows={3}
        />

        {tf ? (
          <>
            <QuirriControlledField fieldType="mcqOption" name="option_a_locked" label="Option A" value="True" disabled />
            <QuirriControlledField fieldType="mcqOption" name="option_b_locked" label="Option B" value="False" disabled />
          </>
        ) : (
          <>
            <QuirriRHFField control={control} name="option_a" fieldType="mcqOption" label="Option A" />
            <QuirriRHFField control={control} name="option_b" fieldType="mcqOption" label="Option B" />
            <QuirriRHFField control={control} name="option_c" fieldType="mcqOption" label="Option C" />
            <QuirriRHFField control={control} name="option_d" fieldType="mcqOption" label="Option D" />
          </>
        )}

        <QuirriField
          label={type === 'multiple' ? 'Correct answers' : 'Correct answer'}
          hint={type === 'multiple' ? 'Mark two or three options. Not every option can be correct.' : 'Mark one correct option.'}
          error={errors.correct_options?.message}
        >
          <div className="fa-correct" role="group" aria-label="Correct options">
            {letters.map((letter) => {
              const on = correct.includes(letter);
              return (
                <button
                  key={letter}
                  type="button"
                  className={on ? 'is-on' : undefined}
                  aria-pressed={on}
                  disabled={saving}
                  onClick={() => toggleCorrect(letter)}
                >
                  {letter}{tf ? (letter === 'A' ? ' · True' : ' · False') : ''}
                </button>
              );
            })}
          </div>
        </QuirriField>

        <QuirriRHFField
          control={control}
          name="explanation"
          fieldType="mcqExplanation"
          label="Explanation"
          hint="Shown to the student after they submit."
          full
          multiline
          rows={3}
        />
      </form>
    </QuirriModal>
  );
}
