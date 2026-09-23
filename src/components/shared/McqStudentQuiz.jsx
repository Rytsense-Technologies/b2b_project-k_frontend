'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import McqQuestionBlock from '@/components/shared/McqQuestionBlock';
import { QuirriBtn } from '@/components/superadmin/quirri-ui';
import { mcqApi, mcqErrorMessage } from '@/lib/api/mcq';
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
    return <div className="card-p">Loading assessment…</div>;
  }

  if (loadError) {
    return (
      <div className="notice err">
        <div>
          <b>Assessment unavailable</b>
          {loadError}
        </div>
        {onLeave ? (
          <div style={{ marginTop: 12 }}>
            <QuirriBtn type="button" variant="ghost" onClick={onLeave}>Back</QuirriBtn>
          </div>
        ) : null}
      </div>
    );
  }

  if (result) {
    const pct = Number(result.percentage) || 0;
    const passed = pct >= 50;
    return (
      <div className="mcq-result animate-fade-in" style={{ maxWidth: 820, margin: '0 auto', textAlign: 'left' }}>
        {onLeave ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onLeave}
            style={{ marginBottom: 16 }}
          >
            Leave assessment
          </button>
        ) : null}
        <div className="section-head" style={{ marginBottom: 18 }}>
          <div>
            <div className="t">Assessment complete</div>
            <div className="d">
              {view?.title || chapterTitle || 'Chapter quiz'}
              {result.submitted_at
                ? ` · submitted ${new Date(result.submitted_at).toLocaleString()}`
                : null}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                flex: 'none',
                background: `conic-gradient(var(--success) 0 ${pct}%, #EAEFF1 ${pct}% 100%)`,
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: '50%',
                  background: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }} className="num">
                    {pct.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, marginTop: 2 }}>
                    Score
                  </div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-2)', fontWeight: 700 }}>
                    Correct
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 5 }} className="num">
                    {result.correct_count}
                    <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                      {' '}
                      / {result.total_questions}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-2)', fontWeight: 700 }}>
                    Result
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: passed ? 'var(--success-soft)' : 'var(--error-soft)',
                        color: passed ? 'var(--success)' : 'var(--error)',
                      }}
                    >
                      {passed ? 'Passed' : 'Needs improvement'}
                    </span>
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                One attempt only — your score is final for this chapter quiz.
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '17px 20px 20px' }}>
          <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: '0 0 4px', textAlign: 'left' }}>
            Question breakdown
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 11.5, margin: '0 0 14px', textAlign: 'left' }}>
            Review what you got right and where to look again.
          </p>
          {questions.length
            ? questions.map((q, i) => (
              <McqQuestionBlock
                key={q.id}
                question={q}
                index={i}
                total={questions.length}
                mode="result"
                resultRow={resultByQuestion.get(String(q.id))}
              />
            ))
            : (result.answers || []).map((row, i) => (
              <div key={row.question_id || i} className="card" style={{ marginBottom: 12, padding: 16, textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: 10.5,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    marginBottom: 8,
                    color: row.is_correct ? 'var(--success)' : 'var(--error)',
                  }}
                >
                  Question {i + 1} · {row.is_correct ? 'Correct' : 'Incorrect'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>
                  Your answer: {(row.selected_options || []).join(', ') || '—'}
                  {' · '}
                  Correct: {(row.correct_options || []).join(', ') || '—'}
                </div>
                {row.explanation ? (
                  <div className="notice info" style={{ margin: 0 }}>
                    <div>
                      <b>Explanation</b>
                      {row.explanation}
                    </div>
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
      <div className="mcq-attempt animate-fade-in" style={{ maxWidth: 740, margin: '0 auto', textAlign: 'left' }}>
        {onLeave ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onLeave}
            style={{ marginBottom: 16 }}
          >
            Leave assessment
          </button>
        ) : null}

        <div className="section-head" style={{ marginBottom: 14 }}>
          <div>
            <div className="t">{view.title || chapterTitle || 'Chapter quiz'}</div>
            <div className="d">
              {questions.length} question{questions.length === 1 ? '' : 's'}
              {' · '}
              one attempt only
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', flex: 'none' }}>
            Question {index + 1} of {questions.length}
          </span>
          <div style={{ flex: 1, height: 7, background: '#EAEFF1', borderRadius: 6, overflow: 'hidden' }}>
            <i
              style={{
                display: 'block',
                height: '100%',
                width: `${progressPct}%`,
                background: 'var(--teal)',
                borderRadius: 6,
              }}
            />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', flex: 'none' }}>
            {answeredCount} answered
          </span>
        </div>

        <McqQuestionBlock
          question={current}
          index={index}
          total={questions.length}
          selected={answers[current?.id] || []}
          onToggle={toggleOption}
          mode="attempt"
          disabled={submitting}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          <QuirriBtn
            type="button"
            variant="ghost"
            disabled={index <= 0 || submitting}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            Previous
          </QuirriBtn>
          <div style={{ display: 'flex', gap: 10 }}>
            {index < questions.length - 1 ? (
              <QuirriBtn
                type="button"
                variant="primary"
                disabled={submitting}
                onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              >
                Next question
              </QuirriBtn>
            ) : (
              <QuirriBtn
                type="button"
                variant="primary"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Submitting…' : 'Submit assessment'}
              </QuirriBtn>
            )}
          </div>
        </div>

        <div className="notice info" style={{ marginTop: 18 }}>
          <div>
            <b>Answer every question before you submit</b>
            You get one attempt. After submit, scores and explanations come from the server — not graded in the browser.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notice info">
      <div>
        <b>No questions to show</b>
        This quiz has no ready questions yet.
      </div>
    </div>
  );
}
