'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Icon } from '@/components/student/ui';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { ConfirmNote } from '@/components/shared/module-ui';
import {
  mcqApi, mcqErrorMessage, mcqGenerateErrorMessage, mcqSetState, optionEntries,
  questionTypeLabel, waitForMcqGeneration,
} from '@/lib/api/mcq';

/** "ready" → "Ready", "in_progress" → "In progress" */
function statusText(status) {
  const t = String(status || 'unknown').replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Read-only question card for reviewers: options are a plain list, the answer is marked with text + icon. */
function ReviewQuestion({ question, index, total }) {
  const options = optionEntries(question);
  const correct = new Set((question?.correct_options || []).map((s) => String(s).toUpperCase()));
  const type = questionTypeLabel(question?.question_type);
  return (
    <article className="sp-qcard fa-qcard mcq-q-block" aria-label={`Question ${index + 1}`}>
      <div className="sp-qcard-label">
        <span>Question {index + 1}{total ? ` of ${total}` : ''}</span>
        {type ? <span className="sp-pill sp-pill--teal">{type}</span> : null}
      </div>
      <div className="sp-qcard-text">{question?.question_text || '—'}</div>
      <ul className="sp-opts fa-opts-list">
        {options.map((opt) => {
          const isCorrect = correct.has(opt.key);
          return (
            <li key={opt.key} className={`sp-opt${isCorrect ? ' is-correct' : ''}`}>
              <span className="sp-opt-key" aria-hidden="true">{opt.key}</span>
              <span className="sp-opt-label">
                <span className="sr-only">Option {opt.key}: </span>
                {opt.label}
              </span>
              {isCorrect ? (
                <span className="sp-opt-tag"><Icon name="tick" size={14} /> Correct answer</span>
              ) : null}
            </li>
          );
        })}
      </ul>
      {question?.explanation ? (
        <div className="sp-explain">
          <Icon name="info" size={16} />
          <div>
            <b>Explanation</b>
            {question.explanation}
          </div>
        </div>
      ) : null}
    </article>
  );
}

/**
 * Admin / faculty / HOD review of generated MCQs (answer key visible).
 * SOW §6.1.4: a set reaches students only after it is approved here;
 * regenerating clears the approval.
 */
export default function McqDocumentReview({
  jobId,
  chapterTitle = '',
  canGenerate = true,
  canApprove = true,
  onStateChange,
  // The list already knows this chapter has no question set: skip the first lookup (it would 404).
  knownEmpty = false,
}) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState(null);
  const [approving, setApproving] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const stateCb = useRef(onStateChange);
  stateCb.current = onStateChange;
  const knownEmptyRef = useRef(knownEmpty);
  knownEmptyRef.current = knownEmpty;

  const applyDoc = useCallback((next) => {
    setDoc(next);
    stateCb.current?.(jobId, mcqSetState(next));
  }, [jobId]);

  const handleApprove = async () => {
    if (!jobId || approving) return;
    setApproving(true);
    try {
      const data = await mcqApi.approve(jobId);
      applyDoc(data);
      toast.success('Approved. Students can take this assessment once they finish the lecture.');
    } catch (err) {
      toast.error(mcqErrorMessage(err, 'Could not approve this question set.'));
    } finally {
      setApproving(false);
    }
  };

  const load = useCallback(async () => {
    if (!jobId) return;
    if (knownEmptyRef.current) {
      setDoc(null);
      setError('not_generated');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await mcqApi.getOrNull(jobId);
      if (data == null) {
        setDoc(null);
        stateCb.current?.(jobId, 'none');
        setError('not_generated');
      } else {
        applyDoc(data);
      }
    } catch (err) {
      setDoc(null);
      setError(mcqErrorMessage(err, 'Could not load MCQs for this chapter.'));
    } finally {
      setLoading(false);
    }
  }, [applyDoc, jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    if (!jobId || generating) return;
    setConfirmRegen(false);
    setGenerating(true);
    try {
      const data = await mcqApi.generate(jobId);
      applyDoc(data);
      setError('');
      toast.success(
        data?.generated_count
          ? `${data.generated_count} questions ready for review. Approve them to open the assessment.`
          : 'MCQs generated. Approve them to open the assessment.',
      );
    } catch (err) {
      if (err?.response?.status === 409) {
        // Another request is already generating - wait for it instead of failing.
        const waitId = toast.loading(mcqGenerateErrorMessage(err));
        const ready = await waitForMcqGeneration(jobId);
        toast.dismiss(waitId);
        if (ready?.status === 'ready') {
          applyDoc(ready);
          setError('');
          toast.success('MCQs are ready for review.');
        } else if (ready?.status === 'failed') {
          toast.error(ready.error || 'MCQ generation failed.');
        } else {
          toast('Still generating — refresh this page in a few minutes.');
        }
      } else {
        toast.error(mcqGenerateErrorMessage(err));
      }
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
  const approved = Boolean(doc?.approved_at);

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
          {doc?.status === 'ready' ? (
            <span className={`sp-pill ${approved ? 'sp-pill--good' : 'sp-pill--low'}`}>
              <i className="un-dot" aria-hidden="true" />
              {approved ? 'Approved' : 'Awaiting approval'}
            </span>
          ) : (
            <span className="sp-pill sp-pill--low">
              <i className="un-dot" aria-hidden="true" />
              {statusText(doc?.status)}
            </span>
          )}
          {canApprove && doc?.status === 'ready' && !approved && questions.length ? (
            <button type="button" className="sd-btn sd-btn--amber sd-btn--sm" onClick={handleApprove} disabled={approving || generating}>
              <Icon name="tick" size={16} />
              {approving ? 'Approving…' : 'Approve for students'}
            </button>
          ) : null}
          {canGenerate ? (
            <button
              type="button"
              className="sd-btn sd-btn--ghost sd-btn--sm"
              onClick={() => (approved ? setConfirmRegen(true) : handleGenerate())}
              disabled={generating}
            >
              <Icon name="refresh" size={16} />
              {generating ? 'Regenerating…' : 'Regenerate'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="fa-note">
        <Icon name="info" size={18} />
        <div>
          <b>{approved ? 'Approved for students' : 'Review, then approve'}</b>
          {approved
            ? 'Students take this assessment after watching the full lecture of a published chapter. Regenerating the questions needs a fresh approval.'
            : 'Correct answers are marked. Check every question, regenerate if needed, then approve — students cannot see the assessment until you do.'}
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
            <ReviewQuestion key={q.id || i} question={q} index={i} total={questions.length} />
          ))}
        </div>
      )}

      <QuirriModal
        open={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        title="Regenerate approved questions?"
        initialFocus=".modal-f .sd-btn--ghost"
        crumb={chapterTitle || undefined}
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setConfirmRegen(false)}>Keep current questions</button>
            <div className="right">
              <button type="button" className="sd-btn sd-btn--teal" onClick={handleGenerate}>
                <Icon name="refresh" size={16} /> Regenerate
              </button>
            </div>
          </>
        )}
      >
        <ConfirmNote danger icon="alert" title="This replaces the approved question set">
          The current questions are replaced and the approval is cleared. Students cannot take this
          quiz until the new set is approved again.
        </ConfirmNote>
      </QuirriModal>
    </div>
  );
}
