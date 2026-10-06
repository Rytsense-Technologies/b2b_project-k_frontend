'use client';

import { Icon } from '@/components/student/ui';
import { optionEntries, isMultiSelect } from '@/lib/api/mcq';

/**
 * One MCQ question with selectable options (student) or answer-key highlight (review).
 * Markup: .sp-qcard / .sp-opt (student-portal.css) + .fa-qcard (portal-faculty.css).
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

  const typeLabel = question?.question_type
    ? String(question.question_type).replace(/_/g, ' ')
    : '';

  return (
    <div className="sp-qcard fa-qcard mcq-q-block">
      <div className="sp-qcard-label">
        <span>
          Question {index + 1}
          {total ? ` of ${total}` : ''}
        </span>
        {statusLabel ? (
          <span className={`sp-mark ${resultRow?.is_correct ? 'sp-mark--good' : 'sp-mark--bad'}`}>
            · {statusLabel}
          </span>
        ) : null}
        {typeLabel ? (
          <span className="sp-pill sp-pill--teal">
            {typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}
          </span>
        ) : null}
      </div>
      <div className="sp-qcard-text">
        {question?.question_text || '—'}
      </div>
      {multi && mode === 'attempt' ? (
        <p className="sp-qcard-hint">Select all options that apply.</p>
      ) : null}
      <div className="sp-opts">
        {options.map((opt) => {
          const isSelected = mode === 'attempt'
            ? selectedSet.has(opt.key)
            : pickedSet.has(opt.key);
          const isCorrect = mode === 'review' || mode === 'result'
            ? correctSet.has(opt.key)
            : false;

          let tone = '';
          if (mode === 'attempt' && isSelected) tone = ' is-selected';
          if ((mode === 'review' || mode === 'result') && isCorrect) tone = ' is-correct';
          if (mode === 'result' && isSelected && !isCorrect) tone = ' is-wrong';

          const interactive = mode === 'attempt' && typeof onToggle === 'function' && !disabled;

          return (
            <button
              key={opt.key}
              type="button"
              className={`sp-opt${tone}`}
              disabled={!interactive}
              onClick={() => interactive && onToggle(opt.key, multi)}
            >
              <span className="sp-opt-key">{opt.key}</span>
              <span className="sp-opt-label">{opt.label}</span>
              {mode === 'review' && isCorrect ? (
                <span className="sp-opt-tag"><Icon name="tick" size={14} /> Answer</span>
              ) : null}
              {mode === 'result' && isSelected && !isCorrect ? (
                <span className="sp-opt-tag">Your answer</span>
              ) : null}
              {mode === 'result' && isCorrect ? (
                <span className="sp-opt-tag">Correct</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {(mode === 'review' || mode === 'result') && (question?.explanation || resultRow?.explanation) ? (
        <div className="sp-explain">
          <Icon name="info" size={16} />
          <div>
            <b>Explanation</b>
            {resultRow?.explanation || question?.explanation}
          </div>
        </div>
      ) : null}
    </div>
  );
}
