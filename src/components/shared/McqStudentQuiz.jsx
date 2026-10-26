'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { Icon, SectionState } from '@/components/student/ui';
import { mcqApi, mcqErrorMessage, optionEntries, isMultiSelect } from '@/lib/api/mcq';
import { mcqSubmitSchema } from '@/lib/validation';
import { formatDateTime } from '@/lib/student/learning';
import { BandPill, ModernDonut, bandFor } from '@/components/shared/data-viz';

/**
 * Student chapter assessment for one edu_video job (owner mock-ups, Oct 2026):
 *   attempt  → one question at a time, question navigator, confirm before the single submit
 *   results  → Overview (score + question summary + next steps) · Question review · Study next
 * Scores and correct answers always come from the server (never graded in the browser).
 *
 * Props
 *   jobId, chapterTitle
 *   context: { subjectName, sourceFilename, classroomHref, tutorHref, subjectsHref }
 *   nav:     { view: 'overview'|'review'|'study', filter: 'all'|'incorrect'|'correct' }
 *   onNav(patch)   — parent keeps nav in the URL
 */
export default function McqStudentQuiz({
  jobId,
  chapterTitle = '',
  context = {},
  nav = { view: 'overview', filter: 'all' },
  onNav = () => {},
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState(null);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
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

  useEffect(() => { load(); }, [load]);

  const questions = useMemo(
    () => (Array.isArray(view?.questions)
      ? [...view.questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      : []),
    [view],
  );
  // The chapter title (from the URL / chapter list) — the MCQ set's own title is often the source filename.
  const title = chapterTitle || view?.title || 'Chapter assessment';
  const classroomHref = context.classroomHref || '/student/subjects';
  const tutorHref = context.tutorHref || '/student/subjects';

  /* ------------------------------------------------------------ attempt */
  const current = questions[index] || null;
  const answeredCount = questions.filter((q) => (answers[q.id] || []).length > 0).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const toggleOption = useCallback((letter, multi) => {
    if (!current?.id || submitting) return;
    setAnswers((prev) => {
      const cur = new Set(prev[current.id] || []);
      if (multi) {
        if (cur.has(letter)) cur.delete(letter); else cur.add(letter);
      } else {
        cur.clear();
        cur.add(letter);
      }
      return { ...prev, [current.id]: Array.from(cur) };
    });
  }, [current, submitting]);

  /* Keyboard: A–D picks an option, ←/→ move between questions. */
  useEffect(() => {
    if (result || view?.status !== 'not_attempted' || !current || confirmOpen) return undefined;
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const letter = e.key.toUpperCase();
      const opts = optionEntries(current).map((o) => o.key);
      if (opts.includes(letter)) { e.preventDefault(); toggleOption(letter, isMultiSelect(current)); }
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(questions.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result, view, current, confirmOpen, questions.length, toggleOption]);

  const requestSubmit = () => {
    if (!allAnswered) {
      const firstEmpty = questions.findIndex((q) => !(answers[q.id] || []).length);
      if (firstEmpty >= 0) setIndex(firstEmpty);
      toast.error('Answer every question before submitting.');
      return;
    }
    setConfirmOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      answers: questions.map((q) => ({ question_id: q.id, selected_options: answers[q.id] || [] })),
    };
    const parsed = mcqSubmitSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues?.[0]?.message || 'Answer every question before submitting.');
      setConfirmOpen(false);
      return;
    }
    setSubmitting(true);
    try {
      const res = await mcqApi.submit(jobId, parsed.data);
      // Tell any open leaderboard / dashboard tab to refresh now (SOW §6.4.4 real-time ranking).
      try {
        const ch = new BroadcastChannel('quirri-learning');
        ch.postMessage({ type: 'assessment-submitted', jobId });
        ch.close();
      } catch { /* BroadcastChannel unsupported */ }
      setResult(res);
      setView((prev) => (prev ? { ...prev, status: 'already_attempted', result: res } : prev));
      setConfirmOpen(false);
      onNav({ view: 'overview', filter: 'all' });
      toast.success('Assessment submitted.');
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(mcqErrorMessage(err, 'Could not submit your answers.'));
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------- render */
  const crumbs = (last) => (
    <nav className="sl-crumbs" aria-label="Breadcrumb">
      <ol>
        <li><Link href="/student/subjects">My subjects</Link></li>
        {context.subjectName ? (
          <li>
            <Link href={context.subjectsHref || '/student/subjects'}>
              {context.subjectColor ? <i className="sl-crumb-dot" style={{ background: context.subjectColor }} aria-hidden="true" /> : null}
              {context.subjectName}
            </Link>
          </li>
        ) : null}
        <li><Link href={classroomHref}>{title}</Link></li>
        {last.map((c, i) => (
          <li key={c.label} aria-current={i === last.length - 1 ? 'page' : undefined}>
            {c.onClick ? <button type="button" className="sl-crumb-btn" onClick={c.onClick}>{c.label}</button> : c.label}
          </li>
        ))}
      </ol>
    </nav>
  );

  if (loading) {
    return <div className="sl"><SectionState title="Loading assessment…" /></div>;
  }

  if (loadError) {
    return (
      <div className="sl">
        {crumbs([{ label: 'Assessment' }])}
        <SectionState
          tone="err"
          title="Assessment unavailable"
          action={<Link className="sd-btn sd-btn--ghost sd-btn--sm" href={classroomHref}><Icon name="back" size={16} /> Back to classroom</Link>}
        >
          {loadError}
        </SectionState>
      </div>
    );
  }

  if (result) {
    return (
      <QuizResults
        title={title}
        result={result}
        questions={questions}
        context={context}
        nav={nav}
        onNav={onNav}
        crumbs={crumbs}
        classroomHref={classroomHref}
        tutorHref={tutorHref}
        jobId={jobId}
      />
    );
  }

  if (view?.status === 'not_available') {
    return (
      <div className="sl animate-fade-in">
        {crumbs([{ label: 'Assessment' }])}
        <header className="sl-page-h">
          <h2>{title}</h2>
          <p>Chapter assessment</p>
        </header>
        <section className="sl-card sl-gate">
          <span className="sl-gate-ic" aria-hidden="true"><Icon name="clock" size={28} /></span>
          <h2>Assessment not open yet</h2>
          <p>Your faculty is still reviewing the questions for this chapter. You will get an email when it opens — keep watching the lecture meanwhile.</p>
          <Link className="sd-btn sd-btn--amber" href={classroomHref}><Icon name="playFill" size={18} /> Back to classroom</Link>
        </section>
      </div>
    );
  }

  if (view?.status === 'watch_required') {
    const wp = Number.isFinite(Number(view?.watch_percent)) ? Math.round(Number(view.watch_percent)) : 0;
    return (
      <div className="sl animate-fade-in">
        {crumbs([{ label: 'Assessment' }])}
        <header className="sl-page-h">
          <h2>{title}</h2>
          <p>Chapter assessment</p>
        </header>
        <section className="sl-card sl-gate">
          <span className="sl-gate-ic" aria-hidden="true"><Icon name="lock" size={28} /></span>
          <h2>Finish the lecture first</h2>
          <p>This assessment unlocks after you watch 100% of the chapter video. You are at {wp}% so far.</p>
          <span className="sl-gate-bar" aria-hidden="true"><i style={{ width: `${wp}%` }} /></span>
          <Link className="sd-btn sd-btn--amber" href={classroomHref}><Icon name="playFill" size={18} /> Back to classroom</Link>
        </section>
      </div>
    );
  }

  if (view?.status === 'not_attempted' && questions.length) {
    const multi = isMultiSelect(current);
    const selected = new Set(answers[current?.id] || []);
    const isLast = index === questions.length - 1;
    return (
      <div className="sl animate-fade-in">
        {crumbs([{ label: 'Assessment' }])}
        <div className="sl-quiz-top">
          <header className="sl-page-h">
            <h2>{title}</h2>
            <p>Chapter assessment · {questions.length} question{questions.length === 1 ? '' : 's'} · scored by Quirri</p>
          </header>
          <div className="sl-strip" aria-label="Assessment status">
            <div><b>{answeredCount} of {questions.length}</b><span>Answered</span></div>
            <div><b>One attempt only</b><span>Assessment rule</span></div>
          </div>
        </div>

        <div className="sl-quiz">
          <section className="sl-card sl-question" aria-labelledby="sl-q-text">
            <div className="sl-question-h">
              <span className="sl-over">Question {index + 1} of {questions.length}</span>
              <span className="sl-pill">{multi ? 'Select all that apply' : String(current?.question_type || '').toLowerCase() === 'true_false' ? 'True or false' : 'Choose one answer'}</span>
            </div>
            <span
              className="sl-qbar"
              role="progressbar"
              aria-label="Questions answered"
              aria-valuemin={0}
              aria-valuemax={questions.length}
              aria-valuenow={answeredCount}
            >
              <i style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </span>
            <h2 id="sl-q-text" className="sl-question-text">{current?.question_text || '—'}</h2>

            <div className="sl-options" role={multi ? 'group' : 'radiogroup'} aria-labelledby="sl-q-text">
              {optionEntries(current).map((opt) => {
                const on = selected.has(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role={multi ? 'checkbox' : 'radio'}
                    aria-checked={on}
                    className={`sl-option${on ? ' is-on' : ''}`}
                    disabled={submitting}
                    onClick={() => toggleOption(opt.key, multi)}
                  >
                    <span className="sl-option-key">{opt.key}</span>
                    <span className="sl-option-label">{opt.label}</span>
                    <span className="sl-option-check" aria-hidden="true">{on ? <Icon name="tick" size={16} /> : null}</span>
                  </button>
                );
              })}
            </div>
            <p className="sl-keys">Tip: press A–D to choose, ← → to move between questions.</p>

            <div className="sl-question-f">
              <button type="button" className="sd-btn sd-btn--outline" disabled={index === 0 || submitting} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                <Icon name="back" size={18} /> Previous
              </button>
              {isLast ? (
                <button type="button" className="sd-btn sd-btn--amber" disabled={submitting} onClick={requestSubmit}>
                  Review &amp; submit <Icon name="send" size={16} />
                </button>
              ) : (
                <button type="button" className="sd-btn sd-btn--teal" disabled={submitting} onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>
                  Next question <Icon name="arrow" size={18} />
                </button>
              )}
            </div>
          </section>

          <aside className="sl-card sl-qnav" aria-labelledby="sl-qnav-h">
            <div className="sl-card-h">
              <h3 id="sl-qnav-h">Questions</h3>
              <span>{answeredCount}/{questions.length} answered</span>
            </div>
            <ol className="sl-qlist">
              {questions.map((q, i) => {
                const done = (answers[q.id] || []).length > 0;
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      className={`sl-qitem${i === index ? ' is-current' : ''}${done ? ' is-done' : ''}`}
                      aria-current={i === index ? 'step' : undefined}
                      onClick={() => setIndex(i)}
                    >
                      <span className="sl-qitem-n">{i + 1}</span>
                      <span className="sl-qitem-t"><b>Question {i + 1}</b><small>{done ? `Answered · ${(answers[q.id] || []).join(', ')}` : 'Not answered'}</small></span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <button type="button" className="sd-btn sd-btn--amber sd-btn--block" disabled={submitting} onClick={requestSubmit}>
              Submit assessment
            </button>
            <p className="sl-note"><Icon name="info" size={16} /> Answer every question first. You can’t change answers after you submit.</p>
          </aside>
        </div>

        <QuirriModal
          open={confirmOpen}
          onClose={() => { if (!submitting) setConfirmOpen(false); }}
          title="Submit your assessment?"
          crumb={title}
          footer={(
            <>
              <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>Keep reviewing</button>
              <div className="right">
                <button type="button" className="sd-btn sd-btn--amber" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit assessment'}
                </button>
              </div>
            </>
          )}
        >
          <p className="sl-confirm">
            You’ve answered <b>{answeredCount} of {questions.length}</b> questions. This is your only attempt, so your answers
            can’t be changed after you submit. Quirri scores it straight away.
          </p>
        </QuirriModal>
      </div>
    );
  }

  return (
    <div className="sl">
      {crumbs([{ label: 'Assessment' }])}
      <SectionState
        title="This assessment isn’t ready yet"
        action={<Link className="sd-btn sd-btn--ghost sd-btn--sm" href={classroomHref}><Icon name="back" size={16} /> Back to classroom</Link>}
      >
        Your faculty is still preparing the questions for this chapter. Check back soon.
      </SectionState>
    </div>
  );
}

/* ====================================================================== results */
function ReportButton({ jobId, className = 'sd-btn sd-btn--outline' }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      await mcqApi.downloadReport(jobId);
    } catch (err) {
      toast.error(mcqErrorMessage(err, 'Could not download the report. Try again.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className={className} onClick={download} disabled={busy}>
      <Icon name="download" size={18} /> {busy ? 'Preparing PDF…' : 'Download PDF report'}
    </button>
  );
}

function QuizResults({ title, result, questions, context, nav, onNav, crumbs, classroomHref, tutorHref, jobId }) {
  const pctValue = Number(result.percentage) || 0;
  const rows = useMemo(() => {
    const byId = new Map(questions.map((q) => [String(q.id), q]));
    // Prefer the snapshot saved with the attempt (survives a regenerated set).
    const fromSnapshot = (r) => (r.question_text ? {
      question_text: r.question_text,
      option_a: r.options?.A, option_b: r.options?.B, option_c: r.options?.C, option_d: r.options?.D,
    } : null);
    return (result.answers || []).map((r, i) => ({
      ...r, n: i + 1, question: fromSnapshot(r) || byId.get(String(r.question_id)) || null,
    }));
  }, [result, questions]);
  const wrong = rows.filter((r) => !r.is_correct);
  const right = rows.filter((r) => r.is_correct);
  const submitted = formatDateTime(result.submitted_at);
  const tone = bandFor(pctValue);
  const unanswered = rows.filter((r) => !(r.selected_options || []).length).length;
  const incorrect = Math.max(0, wrong.length - unanswered);
  // One score format across the portal: whole percent (S11).
  const scoreText = `${Math.round(pctValue)}%`;
  const showFile = context.sourceFilename && context.sourceFilename !== title;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'review', label: 'Question review' },
    { id: 'study', label: 'Study next' },
  ];
  const viewId = tabs.some((t) => t.id === nav.view) ? nav.view : 'overview';
  const go = (patch) => { onNav(patch, true); if (typeof window !== 'undefined') window.scrollTo({ top: 0 }); };

  // After switching section, put keyboard focus on that section's nav item
  // (not <body>), so screen-reader and keyboard users keep their place.
  const prevView = useRef(viewId);
  useEffect(() => {
    if (prevView.current === viewId) return;
    prevView.current = viewId;
    const el = document.getElementById(`sl-rt-${viewId}`) || document.querySelector('main h1, main h2');
    if (el) {
      if (!el.hasAttribute('tabindex') && !/^(BUTTON|A)$/.test(el.tagName)) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
  }, [viewId]);

  if (viewId === 'review') {
    const filter = ['incorrect', 'correct'].includes(nav.filter) ? nav.filter : 'all';
    const shown = filter === 'incorrect' ? wrong : filter === 'correct' ? right : rows;
    return (
      <div className="sl animate-fade-in">
        {crumbs([{ label: 'Assessment', onClick: () => go({ view: 'overview', filter: 'all' }) }, { label: 'Review' }])}
        <div className="sl-quiz-top">
          <header className="sl-page-h">
            <h2>Review your answers</h2>
            <p>See what you got right and where to look again.</p>
          </header>
          <div className="sl-strip" aria-label="Score summary">
            <div><b className={`sl-score--${tone}`}>{scoreText}</b><span>Score</span></div>
            <div><b>{result.correct_count} of {result.total_questions} correct</b><span>Questions correct</span></div>
            <div><b>One attempt only</b><span>Assessment rule</span></div>
          </div>
        </div>

        <div className="sl-filters" role="group" aria-label="Filter questions">
          {[
            { id: 'all', label: 'All', n: rows.length, cls: '' },
            { id: 'incorrect', label: 'Incorrect', n: wrong.length, cls: 'is-bad' },
            { id: 'correct', label: 'Correct', n: right.length, cls: 'is-good' },
          ].map((f) => (
            <button key={f.id} type="button" className="sl-filter" aria-pressed={filter === f.id} onClick={() => onNav({ filter: f.id })}>
              {f.label} <span className={`sl-filter-n ${f.cls}`}>{f.n}</span>
            </button>
          ))}
        </div>

        <div className="sl-review">
          <div className="sl-review-list">
            {shown.length ? shown.map((r) => <ReviewCard key={r.question_id || r.n} row={r} />) : (
              <SectionState title={filter === 'incorrect' ? 'No incorrect answers' : 'No correct answers yet'}>
                {filter === 'incorrect' ? 'Every answer was right. Nice work.' : 'Review the incorrect answers and their explanations.'}
              </SectionState>
            )}
            <div className="sl-review-cta">
              <Link className="sd-btn sd-btn--amber" href={classroomHref}><Icon name="playFill" size={18} /> Rewatch lecture</Link>
              <Link className="sd-btn sd-btn--outline" href={tutorHref}><Icon name="chat" size={18} /> Ask AI tutor</Link>
              {jobId ? <ReportButton jobId={jobId} /> : null}
            </div>
          </div>

          <aside className="sl-card sl-qnav" aria-labelledby="sl-rq-h">
            <div className="sl-card-h">
              <h3 id="sl-rq-h">Questions</h3>
              <button type="button" className="sl-linkbtn sl-linkbtn--sm" onClick={() => go({ view: 'overview', filter: 'all' })}>
                <Icon name="back" size={16} /> Back to results
              </button>
            </div>
            <ol className="sl-qlist">
              {rows.map((r) => (
                <li key={r.question_id || r.n}>
                  <a className={`sl-qitem ${r.is_correct ? 'is-right' : 'is-wrong'}`} href={`#sl-rq-${r.n}`}>
                    <span className="sl-qitem-n">{r.n}</span>
                    <span className="sl-qitem-mark" aria-hidden="true"><Icon name={r.is_correct ? 'tick' : 'x'} size={14} /></span>
                    <span className="sl-qitem-t"><b>Question {r.n}</b><small>{r.is_correct ? 'Correct' : 'Incorrect'}</small></span>
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="sl animate-fade-in">
      {crumbs([{ label: 'Assessment results' }])}
      <header className="sl-page-h">
        <h2>{title}</h2>
        {showFile ? <span className="sl-file"><Icon name="doc" size={18} /> Source: {context.sourceFilename}</span> : null}
        {jobId ? <div className="sl-report-dl"><ReportButton jobId={jobId} /></div> : null}
      </header>

      <section className="sl-score" aria-label="Assessment result">
        <div className="sl-score-ring" role="img" aria-label={`Score ${Math.round(pctValue)} percent`}>
          <svg viewBox="0 0 120 120">
            <circle className="trk" cx="60" cy="60" r="52" />
            {pctValue > 0 ? (
              <circle className={`fil is-${tone}`} cx="60" cy="60" r="52" strokeDasharray={`${(Math.min(100, pctValue) / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`} />
            ) : null}
          </svg>
          <span><b>{scoreText}</b><small>Score</small></span>
        </div>
        <div className="sl-score-cell"><b>{result.correct_count} / {result.total_questions}</b><small>Correct</small></div>
        <div className="sl-score-cell sl-score-cell--dist">
          <BandPill score={pctValue} />
          <ModernDonut
            compact
            size={112}
            title="Answers"
            unit={(result.total_questions || rows.length) === 1 ? 'Question' : 'Questions'}
            total={result.total_questions || rows.length}
            parts={[
              { label: 'Correct', value: right.length, tone: 'strong' },
              { label: 'Incorrect', value: incorrect, tone: 'focus' },
              { label: 'Unanswered', value: unanswered, tone: 'neutral' },
            ]}
          />
          <small>Result</small>
        </div>
        <div className="sl-score-cell sl-score-cell--wide">
          <b className="sl-score-when">{submitted || '—'}</b>
          <span>One attempt only. This score is final.</span>
          <small>Submitted</small>
        </div>
      </section>

      {/* Each section is its own URL view (Question review has a different layout), so this is
          section navigation — buttons with aria-current — not an ARIA tablist (S12). */}
      <nav className="sl-tabs" aria-label="Results sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            id={`sl-rt-${t.id}`}
            aria-current={viewId === t.id ? 'page' : undefined}
            className="sl-tab"
            onClick={() => go({ view: t.id, filter: t.id === 'review' ? 'all' : undefined })}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {viewId === 'overview' ? (
        <div className="sl-results">
          <section className="sl-card" aria-labelledby="sl-qs-h">
            <div className="sl-card-h sl-card-h--stack">
              <h3 id="sl-qs-h">Question summary</h3>
              <span>Review your answers and the correct answers for each question.</span>
            </div>
            <div className="sl-table-wrap sl-table-wrap--flat">
              <table className="sl-table">
                <thead><tr><th>Question</th><th>Result</th><th>Your answer</th><th>Correct answer</th><th><span className="sr-only">Review</span></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.question_id || r.n}>
                      <td data-label="Question"><b>Q{r.n}</b></td>
                      <td data-label="Result"><Mark ok={r.is_correct} /></td>
                      <td data-label="Your answer">{(r.selected_options || []).join(', ') || '—'}</td>
                      <td data-label="Correct answer">{(r.correct_options || []).join(', ') || '—'}</td>
                      <td data-label="">
                        <button
                          type="button"
                          className="sl-linkbtn sl-linkbtn--sm"
                          aria-label={`Review question ${r.n}`}
                          onClick={() => {
                            go({ view: 'review', filter: 'all' });
                            // Open the review at this question, not at the top of the list.
                            setTimeout(() => document.getElementById(`sl-rq-${r.n}`)?.scrollIntoView({ block: 'start' }), 80);
                          }}
                        >
                          Review <Icon name="arrow" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="sl-card sl-next" aria-labelledby="sl-ns-h">
            <h3 id="sl-ns-h">Next steps</h3>
            <p>{wrong.length ? 'Review the explanations before revisiting the lecture.' : 'Every answer was right. Keep the momentum with your next chapter.'}</p>
            <button type="button" className="sl-nextbtn is-primary" onClick={() => go({ view: 'review', filter: wrong.length ? 'incorrect' : 'all' })}>
              <Icon name="doc" size={20} /> <span>{wrong.length ? 'Review incorrect answers' : 'Review your answers'}</span> <Icon name="arrow" size={20} />
            </button>
            <Link className="sl-nextbtn" href={classroomHref}><Icon name="play" size={20} /> <span>Rewatch lecture</span> <Icon name="arrow" size={20} /></Link>
            <Link className="sl-nextbtn" href={tutorHref}><Icon name="chat" size={20} /> <span>Ask AI tutor</span> <Icon name="arrow" size={20} /></Link>
          </aside>
        </div>
      ) : (
        <div className="sl-results">
          <section className="sl-card" aria-labelledby="sl-sn-h">
            <div className="sl-card-h sl-card-h--stack">
              <h3 id="sl-sn-h">What to study next</h3>
              <span>{wrong.length ? `Built from the ${wrong.length} question${wrong.length === 1 ? '' : 's'} you missed.` : 'You answered everything correctly.'}</span>
            </div>
            {wrong.length ? (
              <ul className="sl-study">
                {wrong.map((r) => (
                  <li key={r.question_id || r.n}>
                    <span className="sl-qitem-n is-wrong">{r.n}</span>
                    <div>
                      <b>{r.question?.question_text || `Question ${r.n}`}</b>
                      <p>{r.explanation || `The correct answer is ${(r.correct_options || []).join(', ')}.`}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <SectionState title="Nothing to revise here">Move on to your next chapter.</SectionState>
            )}
          </section>
          <aside className="sl-card sl-next" aria-labelledby="sl-plan-h">
            <h3 id="sl-plan-h">Your plan</h3>
            <ol className="sl-plan">
              <li><b>Rewatch the lecture</b><span>Focus on the parts these questions cover.</span></li>
              <li><b>Ask the AI tutor</b><span>Say the question out loud and ask it to explain.</span></li>
              <li><b>Move to the next chapter</b><span>Each finished lecture unlocks its assessment.</span></li>
            </ol>
            <Link className="sl-nextbtn is-primary" href={classroomHref}><Icon name="play" size={20} /> <span>Rewatch lecture</span> <Icon name="arrow" size={20} /></Link>
            <Link className="sl-nextbtn" href={tutorHref}><Icon name="chat" size={20} /> <span>Ask AI tutor</span> <Icon name="arrow" size={20} /></Link>
          </aside>
        </div>
      )}
    </div>
  );
}

function Mark({ ok }) {
  return (
    <span className={`sl-mark ${ok ? 'is-right' : 'is-wrong'}`}>
      <span aria-hidden="true"><Icon name={ok ? 'tick' : 'x'} size={14} /></span>
      {ok ? 'Correct' : 'Incorrect'}
    </span>
  );
}

function answerText(letters, question) {
  const list = letters || [];
  if (!list.length) return '—';
  if (!question) return list.join(', ');
  const labels = Object.fromEntries(optionEntries(question).map((o) => [o.key, o.label]));
  return list.map((k) => (labels[k] ? `${k} · ${labels[k]}` : k)).join('\n');
}

function ReviewCard({ row }) {
  const ok = row.is_correct;
  return (
    <article id={`sl-rq-${row.n}`} className={`sl-card sl-rcard ${ok ? 'is-right' : 'is-wrong'}`} aria-label={`Question ${row.n}, ${ok ? 'correct' : 'incorrect'}`}>
      <div className="sl-rcard-side">
        <span className={`sl-qitem-n ${ok ? 'is-right' : 'is-wrong'}`}>{row.n}</span>
        <Mark ok={ok} />
      </div>
      <div className="sl-rcard-main">
        {row.question?.question_text ? <p className="sl-rcard-q">{row.question.question_text}</p> : null}
        <div className="sl-answers">
          <div className={`sl-answer ${ok ? 'is-right' : 'is-wrong'}`}><span>Your answer</span><b>{answerText(row.selected_options, row.question)}</b></div>
          <div className="sl-answer is-right"><span>Correct answer</span><b>{answerText(row.correct_options, row.question)}</b></div>
        </div>
        {row.explanation ? (
          <div className="sl-explain"><Icon name="info" size={18} /><div><b>Explanation</b><span>{row.explanation}</span></div></div>
        ) : null}
      </div>
    </article>
  );
}
