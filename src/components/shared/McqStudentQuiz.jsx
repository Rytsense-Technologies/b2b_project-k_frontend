'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Icon, SectionState } from '@/components/student/ui';
import {
  mcqApi,
  mcqErrorMessage,
  optionEntries,
  isMultiSelect,
} from '@/lib/api/mcq';
import { mcqSubmitSchema } from '@/lib/validation';

/**
 * Student quiz attempt + result for one edu_video job_id.
 */
export default function McqStudentQuiz({
  jobId,
  chapterTitle = '',
  onLeave,
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState(null);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setLoadError('');
    setResult(null);
    try {
      const data = await mcqApi.get(jobId);
      setView(data);
      if (data?.status === 'already_attempted' && data?.result) {
        setResult(data.result);
      } else {
        setAnswers({});
        setIndex(0);
      }
    } catch (err) {
      setView(null);
      setLoadError(mcqErrorMessage(err, 'Could not load this assessment.'));
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const questions = useMemo(
    () => (Array.isArray(view?.questions)
      ? [...view.questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      : []),
    [view],
  );
  const current = questions[index] || null;
  const answeredCount = questions.filter((q) => (answers[q.id] || []).length > 0).length;
  const progressPct = questions.length
    ? Math.round(((index + 1) / questions.length) * 100)
    : 0;

  const resultByQuestion = useMemo(() => {
    const map = new Map();
    (result?.answers || []).forEach((row) => {
      map.set(String(row.question_id), row);
    });
    return map;
  }, [result]);

  const toggleOption = (letter, multi) => {
    if (!current?.id) return;
    setAnswers((prev) => {
      const id = current.id;
      const cur = new Set(prev[id] || []);
      if (multi) {
        if (cur.has(letter)) cur.delete(letter);
        else cur.add(letter);
      } else {
        cur.clear();
        cur.add(letter);
      }
      return { ...prev, [id]: Array.from(cur) };
    });
  };

  const handleSubmit = async () => {
    const payload = {
      answers: questions.map((q) => ({
        question_id: q.id,
        selected_options: answers[q.id] || [],
      })),
    };
    const parsed = mcqSubmitSchema.safeParse(payload);
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message
        || 'Answer every question before submitting.';
      toast.error(msg);
      const firstEmpty = questions.findIndex((q) => !(answers[q.id] || []).length);
      if (firstEmpty >= 0) setIndex(firstEmpty);
      return;
    }

    setSubmitting(true);
    try {
      const res = await mcqApi.submit(jobId, parsed.data);
      setResult(res);
      // Keep local questions so the result breakdown can show full stems.
      // Reloads use already_attempted (questions null) and fall back to result.answers.
      setView((prev) => (prev
        ? { ...prev, status: 'already_attempted', result: res }
        : prev));
      toast.success('Assessment submitted.');
    } catch (err) {
      toast.error(mcqErrorMessage(err, 'Could not submit your answers.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="sp-quiz">
        <SectionState title="Loading assessment…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="sp-quiz">
        <SectionState
          tone="err"
          title="Assessment unavailable"
          action={onLeave ? (
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={onLeave}>
              <Icon name="back" size={16} /> Back to subjects
            </button>
          ) : null}
        >
          {loadError}
        </SectionState>
      </div>
    );
  }

  if (result) {
    const pct = Number(result.percentage) || 0;
    const passed = pct >= 50;
    const r = 52;
    const c = 2 * Math.PI * r;
    return (
      <div className="sp-quiz animate-fade-in">
        {onLeave ? (
          <button type="button" className="sp-back" onClick={onLeave}>
            <Icon name="back" size={16} /> Leave assessment
          </button>
        ) : null}

        <section className="sp-result" aria-label="Assessment result">
          <div className="sp-result-ring" role="img" aria-label={`Score ${pct.toFixed(1)} percent`}>
            <svg viewBox="0 0 120 120">
              <circle className="trk" cx="60" cy="60" r={r} />
              {pct > 0 ? (
                <circle
                  className={`fil ${passed ? 'is-good' : 'is-low'}`}
                  cx="60"
                  cy="60"
                  r={r}
                  strokeDasharray={`${(Math.min(100, pct) / 100) * c} ${c}`}
                />
              ) : null}
            </svg>
            <span className="num">
              {pct.toFixed(1)}%
              <small>Score</small>
            </span>
          </div>
          <div className="sp-result-copy">
            <div className="sp-banner-eyebrow">Assessment complete</div>
            <h2>{view?.title || chapterTitle || 'Chapter quiz'}</h2>
            <p>
              {result.submitted_at
                ? `Submitted ${new Date(result.submitted_at).toLocaleString()} · `
                : ''}
              One attempt only — your score is final for this chapter quiz.
            </p>
            <div className="sp-result-stats">
              <div className="sp-result-stat">
                <small>Correct</small>
                <b>{result.correct_count} / {result.total_questions}</b>
              </div>
              <div className="sp-result-stat">
                <small>Result</small>
                <b>
                  <span className={`sp-pill ${passed ? 'sp-pill--good' : 'sp-pill--low'}`}>
                    {passed ? 'Passed' : 'Needs improvement'}
                  </span>
                </b>
              </div>
            </div>
          </div>
        </section>

        <div className="sp-section-h">
          <div>
            <h3>Question breakdown</h3>
            <p>Review what you got right and where to look again.</p>
          </div>
        </div>

        <div className="sp-breakdown">
          {questions.length
            ? questions.map((q, i) => (
              <StudentQuestionCard
                key={q.id}
                question={q}
                index={i}
                total={questions.length}
                mode="result"
                resultRow={resultByQuestion.get(String(q.id))}
              />
            ))
            : (result.answers || []).map((row, i) => (
              <div key={row.question_id || i} className="sp-qcard">
                <div className="sp-qcard-label">
                  Question {i + 1}
                  <span className={`sp-mark ${row.is_correct ? 'sp-mark--good' : 'sp-mark--bad'}`}>
                    <Icon name={row.is_correct ? 'tick' : 'x'} size={14} />
                    {row.is_correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <div className="sp-qcard-hint">
                  Your answer: <b>{(row.selected_options || []).join(', ') || '—'}</b>
                  {' · '}
                  Correct: <b>{(row.correct_options || []).join(', ') || '—'}</b>
                </div>
                {row.explanation ? (
                  <div className="sp-explain">
                    <Icon name="info" size={16} />
                    <div><b>Explanation</b>{row.explanation}</div>
                  </div>
                ) : null}
              </div>
            ))}
        </div>
      </div>
    );
  }

  if (view?.status === 'not_attempted' && questions.length) {
    return (
      <div className="sp-quiz animate-fade-in">
        {onLeave ? (
          <button type="button" className="sp-back" onClick={onLeave}>
            <Icon name="back" size={16} /> Leave assessment
          </button>
        ) : null}

        <section className="sp-quiz-h">
          <div className="sp-quiz-h-top">
            <div>
              <div className="sp-banner-eyebrow">Chapter assessment</div>
              <h2>{view.title || chapterTitle || 'Chapter quiz'}</h2>
              <p>
                {questions.length} question{questions.length === 1 ? '' : 's'}
                {' · '}
                one attempt only
              </p>
            </div>
            <span className="sp-pill sp-pill--glass">{answeredCount} of {questions.length} answered</span>
          </div>
          <div className="sp-quiz-progress">
            <span>Question {index + 1} of {questions.length}</span>
            <span className="sp-quiz-bar" aria-hidden="true"><i style={{ width: `${progressPct}%` }} /></span>
          </div>
          <nav className="sp-qnav" aria-label="Jump to question">
            {questions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                className={(answers[q.id] || []).length ? 'is-answered' : ''}
                aria-current={i === index}
                aria-label={`Question ${i + 1}${(answers[q.id] || []).length ? ', answered' : ''}`}
                disabled={submitting}
                onClick={() => setIndex(i)}
              >
                {i + 1}
              </button>
            ))}
          </nav>
        </section>

        <StudentQuestionCard
          question={current}
          index={index}
          total={questions.length}
          selected={answers[current?.id] || []}
          onToggle={toggleOption}
          mode="attempt"
          disabled={submitting}
        />

        <div className="sp-quiz-nav">
          <button
            type="button"
            className="sd-btn sd-btn--ghost"
            disabled={index <= 0 || submitting}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            <Icon name="back" size={16} /> Previous
          </button>
          {index < questions.length - 1 ? (
            <button
              type="button"
              className="sd-btn sd-btn--teal"
              disabled={submitting}
              onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            >
              Next question <Icon name="arrow" size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="sd-btn sd-btn--amber"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Submitting…' : 'Submit assessment'}
            </button>
          )}
        </div>

        <SectionState title="Answer every question before you submit">
          You get one attempt. After submit, scores and explanations come from the server — not graded in the browser.
        </SectionState>
      </div>
    );
  }

  return (
    <div className="sp-quiz">
      <SectionState
        title="No questions to show"
        action={onLeave ? (
          <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={onLeave}>
            <Icon name="back" size={16} /> Back to subjects
          </button>
        ) : null}
      >
        This quiz has no ready questions yet.
      </SectionState>
    </div>
  );
}

/**
 * Student-portal question card (attempt + result). The faculty review screen
 * keeps using McqQuestionBlock, so its look is unchanged.
 */
function StudentQuestionCard({
  question,
  index,
  total,
  selected = [],
  onToggle,
  mode = 'attempt',
  resultRow = null,
  disabled = false,
}) {
  const options = optionEntries(question);
  const multi = isMultiSelect(question);
  const selectedSet = new Set((selected || []).map((x) => String(x).toUpperCase()));
  const correctSet = new Set((resultRow?.correct_options || question?.correct_options || []).map((x) => String(x).toUpperCase()));
  const pickedSet = new Set((resultRow?.selected_options || []).map((x) => String(x).toUpperCase()));
  const interactive = mode === 'attempt' && typeof onToggle === 'function' && !disabled;
  const explanation = resultRow?.explanation || question?.explanation;

  return (
    <div className="sp-qcard">
      <div className="sp-qcard-label">
        Question {index + 1}{total ? ` of ${total}` : ''}
        {question?.question_type ? (
          <span className="sp-pill">{String(question.question_type).replace(/_/g, ' ')}</span>
        ) : null}
        {mode === 'result' && resultRow ? (
          <span className={`sp-mark ${resultRow.is_correct ? 'sp-mark--good' : 'sp-mark--bad'}`}>
            <Icon name={resultRow.is_correct ? 'tick' : 'x'} size={14} />
            {resultRow.is_correct ? 'Correct' : 'Incorrect'}
          </span>
        ) : null}
      </div>
      <div className="sp-qcard-text">{question?.question_text || '—'}</div>
      {multi && mode === 'attempt' ? <p className="sp-qcard-hint">Select all options that apply.</p> : null}

      <div className="sp-opts" role={mode === 'attempt' ? (multi ? 'group' : 'radiogroup') : undefined}>
        {options.map((opt) => {
          const isSelected = mode === 'attempt' ? selectedSet.has(opt.key) : pickedSet.has(opt.key);
          const isCorrect = mode === 'result' ? correctSet.has(opt.key) : false;
          const cls = mode === 'attempt'
            ? (isSelected ? ' is-selected' : '')
            : isCorrect ? ' is-correct' : isSelected ? ' is-wrong' : '';
          return (
            <button
              key={opt.key}
              type="button"
              className={`sp-opt${cls}`}
              disabled={!interactive}
              role={mode === 'attempt' ? (multi ? 'checkbox' : 'radio') : undefined}
              aria-checked={mode === 'attempt' ? isSelected : undefined}
              onClick={() => interactive && onToggle(opt.key, multi)}
            >
              <span className="sp-opt-key">{opt.key}</span>
              <span className="sp-opt-label">{opt.label}</span>
              {mode === 'result' && isSelected && !isCorrect ? <span className="sp-opt-tag">Your answer</span> : null}
              {mode === 'result' && isCorrect ? <span className="sp-opt-tag">{isSelected ? 'Your answer · Correct' : 'Correct'}</span> : null}
            </button>
          );
        })}
      </div>

      {mode === 'result' && explanation ? (
        <div className="sp-explain">
          <Icon name="info" size={16} />
          <div><b>Explanation</b>{explanation}</div>
        </div>
      ) : null}
    </div>
  );
}
