'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import McqQuestionBlock from '@/components/shared/McqQuestionBlock';
import { Icon } from '@/components/student/ui';
import { mcqApi, mcqErrorMessage } from '@/lib/api/mcq';

/** "ready" → "Ready", "in_progress" → "In progress" */
function statusText(status) {
  const t = String(status || 'unknown').replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Admin / faculty / HOD review of generated MCQs (answer key visible).
 * No per-question approve API yet — review + generate/regenerate only.
 */
export default function McqDocumentReview({
  jobId,
  chapterTitle = '',
  canGenerate = true,
}) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState(null);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError('');
    try {
      const data = await mcqApi.get(jobId);
      setDoc(data);
    } catch (err) {
      setDoc(null);
      const status = err?.response?.status;
      if (status === 404) {
        setError('not_generated');
      } else {
        setError(mcqErrorMessage(err, 'Could not load MCQs for this chapter.'));
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    if (!jobId) return;
    setGenerating(true);
    try {
      const data = await mcqApi.generate(jobId);
      setDoc(data);
      setError('');
      toast.success(
        data?.generated_count
          ? `${data.generated_count} questions ready for review.`
          : 'MCQs generated.',
      );
    } catch (err) {
      toast.error(mcqErrorMessage(err, 'Could not generate MCQs.'));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="fa-loading" role="status">
        <Icon name="clock" size={18} /> Loading MCQs…
      </div>
    );
  }

  if (error === 'not_generated') {
    return (
      <div className="fa-mcq">
        <div className="fa-note">
          <Icon name="info" size={18} />
          <div>
            <b>No MCQs for this chapter yet</b>
            Generate a quiz from the same uploaded material used for the video lecture.
            Generation can take up to about a minute.
            {canGenerate ? (
              <div className="fa-note-action">
                <button type="button" className="sd-btn sd-btn--amber sd-btn--sm" onClick={handleGenerate} disabled={generating}>
                  <Icon name="spark" size={16} />
                  {generating ? 'Generating…' : 'Generate MCQs'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fa-mcq">
        <div className="fa-note is-err" role="alert">
          <Icon name="alert" size={18} />
          <div>
            <b>Could not load MCQs</b>
            {error}
            <div className="fa-note-action">
              <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={load}>
                <Icon name="refresh" size={16} /> Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const questions = Array.isArray(doc?.questions)
    ? [...doc.questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    : [];

  return (
    <div className="fa-mcq mcq-review animate-fade-in">
      <div className="fa-mcq-head">
        <div>
          <h3>Question set</h3>
          <p>
            {questions.length} question{questions.length === 1 ? '' : 's'} with answer key
            {doc?.title && doc.title !== chapterTitle ? ` · ${doc.title}` : null}
            {!doc?.title && !chapterTitle ? ' · Chapter MCQs' : null}
          </p>
        </div>
        <div className="fa-mcq-head-side">
          <span className={`sp-pill ${doc?.status === 'ready' ? 'sp-pill--good' : 'sp-pill--low'}`}>
            <i className="un-dot" aria-hidden="true" />
            {statusText(doc?.status)}
          </span>
          {canGenerate ? (
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={handleGenerate} disabled={generating}>
              <Icon name="refresh" size={16} />
              {generating ? 'Regenerating…' : 'Regenerate'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="fa-note">
        <Icon name="info" size={18} />
        <div>
          <b>Review with answer key</b>
          Correct options are highlighted. Per-question approval is not available yet.
          Students can take the quiz once this chapter video is published and the MCQs are ready.
        </div>
      </div>

      {!questions.length ? (
        <div className="fa-note is-warn">
          <Icon name="alert" size={18} />
          <div>
            <b>No questions in this document</b>
            Try regenerating. If it stays empty, the source material may not have enough text.
          </div>
        </div>
      ) : (
        <div className="fa-mcq-list">
          {questions.map((q, i) => (
            <McqQuestionBlock
              key={q.id || i}
              question={q}
              index={i}
              total={questions.length}
              mode="review"
            />
          ))}
        </div>
      )}
    </div>
  );
}
