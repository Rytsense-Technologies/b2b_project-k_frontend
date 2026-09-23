'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import McqQuestionBlock from '@/components/shared/McqQuestionBlock';
import { QuirriBtn } from '@/components/superadmin/quirri-ui';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import { mcqApi, mcqErrorMessage } from '@/lib/api/mcq';

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
    return <div className="card-p">Loading MCQs…</div>;
  }

  if (error === 'not_generated') {
    return (
      <div className="notice info">
        <div>
          <b>No MCQs for this chapter yet</b>
          Generate a quiz from the same uploaded material used for the video lecture.
          Generation can take up to about a minute.
        </div>
        {canGenerate ? (
          <div style={{ marginTop: 12 }}>
            <QuirriBtn type="button" variant="primary" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating…' : 'Generate MCQs'}
            </QuirriBtn>
          </div>
        ) : null}
      </div>
    );
  }

  if (error) {
    return (
      <div className="notice err">
        <div>
          <b>Could not load MCQs</b>
          {error}
        </div>
        <div style={{ marginTop: 12 }}>
          <QuirriBtn type="button" variant="ghost" onClick={load}>Try again</QuirriBtn>
        </div>
      </div>
    );
  }

  const questions = Array.isArray(doc?.questions)
    ? [...doc.questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    : [];

  return (
    <div className="mcq-review animate-fade-in" style={{ textAlign: 'left' }}>
      <div className="section-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="t">{doc?.title || chapterTitle || 'Chapter MCQs'}</div>
          <div className="d">
            {questions.length} question{questions.length === 1 ? '' : 's'}
            {doc?.status ? ` · status ${doc.status}` : null}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <QuirriBadge variant={doc?.status === 'ready' ? 'green' : 'amber'}>
            {doc?.status || 'unknown'}
          </QuirriBadge>
          {canGenerate ? (
            <QuirriBtn type="button" variant="ghost" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Regenerating…' : 'Regenerate'}
            </QuirriBtn>
          ) : null}
        </div>
      </div>

      <div className="notice info" style={{ marginBottom: 16 }}>
        <div>
          <b>Review with answer key</b>
          Correct options are highlighted. Per-question approve/reject is not available from the API yet —
          students can take the quiz once this chapter video is published and MCQs are ready.
        </div>
      </div>

      {!questions.length ? (
        <div className="notice warn">
          <div>
            <b>No questions in this document</b>
            Try regenerating, or check generation errors on the backend.
          </div>
        </div>
      ) : (
        questions.map((q, i) => (
          <McqQuestionBlock
            key={q.id || i}
            question={q}
            index={i}
            total={questions.length}
            mode="review"
          />
        ))
      )}
    </div>
  );
}
