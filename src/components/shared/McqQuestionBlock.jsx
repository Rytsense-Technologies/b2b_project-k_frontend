'use client';

import { optionEntries, isMultiSelect } from '@/lib/api/mcq';

/**
 * One MCQ question with selectable options (student) or answer-key highlight (review).
 */
export default function McqQuestionBlock({
  question,
  index,
  total,
  selected = [],
  onToggle,
  mode = 'attempt', // attempt | review | result
  resultRow = null,
  disabled = false,
}) {
  const options = optionEntries(question);
  const multi = isMultiSelect(question);
  const selectedSet = new Set((selected || []).map((s) => String(s).toUpperCase()));
  const correctSet = new Set((resultRow?.correct_options || question?.correct_options || []).map((s) => String(s).toUpperCase()));
  const pickedSet = new Set((resultRow?.selected_options || []).map((s) => String(s).toUpperCase()));

  const statusLabel = (() => {
    if (mode !== 'result' || !resultRow) return null;
    return resultRow.is_correct ? 'Correct' : 'Incorrect';
  })();

  return (
    <div className="card mcq-q-block" style={{ marginBottom: 14, padding: 18, textAlign: 'left' }}>
      <div style={{ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-3)', fontWeight: 700, marginBottom: 10 }}>
        Question {index + 1}
        {total ? ` of ${total}` : ''}
        {statusLabel ? (
          <span style={{ marginLeft: 10, color: resultRow?.is_correct ? 'var(--success)' : 'var(--error)' }}>
            · {statusLabel}
          </span>
        ) : null}
        {question?.question_type ? (
          <span style={{ marginLeft: 8, fontWeight: 600, color: 'var(--muted-2)', textTransform: 'none', letterSpacing: 0 }}>
            {' '}({String(question.question_type).replace(/_/g, ' ')})
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.5, marginBottom: multi && mode === 'attempt' ? 8 : 16 }}>
        {question?.question_text || '—'}
      </div>
      {multi && mode === 'attempt' ? (
        <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--muted)', textAlign: 'left' }}>
          Select all options that apply.
        </p>
      ) : null}
      <div style={{ display: 'grid', gap: 9 }}>
        {options.map((opt) => {
          const isSelected = mode === 'attempt'
            ? selectedSet.has(opt.key)
            : pickedSet.has(opt.key);
          const isCorrect = mode === 'review' || mode === 'result'
            ? correctSet.has(opt.key)
            : false;

          let border = 'var(--line)';
          let bg = '#fff';
          let keyBg = '#EEF0F0';
          let keyFg = 'var(--ink-2)';

          if (mode === 'attempt' && isSelected) {
            border = 'var(--teal)';
            bg = 'var(--teal-50)';
            keyBg = 'var(--teal)';
            keyFg = '#fff';
          }
          if ((mode === 'review' || mode === 'result') && isCorrect) {
            border = '#BFE0D2';
            bg = 'var(--success-soft)';
            keyBg = 'var(--success)';
            keyFg = '#fff';
          }
          if (mode === 'result' && isSelected && !isCorrect) {
            border = '#E9C8C4';
            bg = 'var(--error-soft)';
            keyBg = 'var(--error)';
            keyFg = '#fff';
          }

          const interactive = mode === 'attempt' && typeof onToggle === 'function' && !disabled;

          return (
            <button
              key={opt.key}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onToggle(opt.key, multi)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '11px 14px',
                border: `1.5px solid ${border}`,
                borderRadius: 8,
                background: bg,
                width: '100%',
                textAlign: 'left',
                fontSize: 13,
                color: 'var(--ink-2)',
                cursor: interactive ? 'pointer' : 'default',
                fontFamily: 'inherit',
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: keyBg,
                  color: keyFg,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 10.5,
                  fontWeight: 700,
                  flex: 'none',
                }}
              >
                {opt.key}
              </span>
              <span style={{ flex: 1 }}>{opt.label}</span>
              {mode === 'review' && isCorrect ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)' }}>Answer</span>
              ) : null}
              {mode === 'result' && isSelected && !isCorrect ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--error)' }}>Your answer</span>
              ) : null}
              {mode === 'result' && isCorrect ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)' }}>Correct</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {(mode === 'review' || mode === 'result') && (question?.explanation || resultRow?.explanation) ? (
        <div className="notice info" style={{ marginTop: 14, marginBottom: 0 }}>
          <div>
            <b>Explanation</b>
            {resultRow?.explanation || question?.explanation}
          </div>
        </div>
      ) : null}
    </div>
  );
}
