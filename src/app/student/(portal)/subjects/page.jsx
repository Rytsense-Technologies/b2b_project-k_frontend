'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import VoiceQnaPanel from '@/components/student/VoiceQnaPanel';
import RefreshingVideo from '@/components/shared/RefreshingVideo';
import QuirriModal from '@/components/superadmin/QuirriModal';
import ScoreRing from '@/components/shared/ScoreRing';
import { Icon, SectionState } from '@/components/student/ui';
import { bandFor } from '@/components/shared/data-viz';
import { eduVideoApi } from '@/lib/api/admin/eduVideo';
import { settingsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useUrlState } from '@/hooks/useUrlState';
import { loadQuizStates } from '@/components/student/quizStates';
import {
  SUBJECTS_PATH,
  assessmentHref,
  buildSubjects,
  classroomHref,
  clampPct,
  formatDate,
  formatDuration,
  pct,
} from '@/lib/student/learning';
import '@/styles/student-learning.css';

/**
 * Student · My subjects (owner mock-ups, Oct 2026)
 *   list      → Level 1 (no ?s=): summary strip + subject cards grid (ring, 3 stats, Next hint, one action)
 *               Level 2 (?s=<subject>): header card, "Up next" card, chapter rows (status + one action),
 *               search/status toolbar only for long lists (q, f, p); "How learning works" modal
 *               (redesign: docs/agent/redesign/student-subjects-redesign.md)
 *   classroom → player, chapter info, chapter list, lecture status, AI tutor card
 *   tutor     → VoiceQnaPanel (voice session, history, transcript)
 * Watch-progress rules are unchanged: no seeking past the furthest point watched,
 * progress saved to the server, assessment unlocks at 100%.
 */

/** Quiz states from GET /mcq/my-attempts (+ availability for watched, unattempted chapters) — no per-chapter N+1, no cap. */
function useQuizStatuses(videos) {
  const key = useMemo(() => videos.map((v) => `${v.job_id}:${v.watch_percent ?? ''}`).join(','), [videos]);
  const { data } = useAsyncResource(async () => {
    if (!videos.length) return {};
    const map = await loadQuizStates(videos);
    return Object.fromEntries(map);
  }, [key]);
  // `ready` keeps loading states honest: no "Locked" / "Not published" before the lookups land.
  return { quizzes: data || {}, ready: data != null };
}

const pad2 = (n) => String(n).padStart(2, '0');
const BAND_TEXT = { strong: 'Strong', ok: 'On track', focus: 'Needs focus' };

/* ================================================================== list */
const HOW_STEPS = [
  { icon: 'playCircle', title: 'Watch the lecture', body: 'Short, focused video lectures you can take at your own pace.' },
  { icon: 'doc', title: 'Complete the assessment', body: 'It unlocks once you watch 100% of the lecture and your faculty publishes the questions. One attempt.' },
  { icon: 'chat', title: 'Review with your tutor', body: 'Ask by voice, in English or Tamil, and get explanations grounded in the chapter.' },
];

const subjectHref = (key) => `${SUBJECTS_PATH}?s=${encodeURIComponent(key)}`;

/** The one next action for a subject, in priority order (Up next card + subject card hint). */
function recommend(chapters, subjectKeyValue, watchByJob, quizzes) {
  const w = (c) => watchByJob[c.job_id] ?? 0;
  const q = (c) => quizzes[c.job_id];
  const name = (c) => c.chapter_title || 'this chapter';
  const resuming = chapters.find((c) => w(c) > 0 && w(c) < 100);
  if (resuming) {
    return {
      kind: 'resume', icon: 'playCircle',
      title: `Finish ${name(resuming)}`,
      short: `Finish ${name(resuming)} · ${w(resuming)}% watched`,
      body: `You’re ${w(resuming)}% through — watch to 100% to unlock its assessment.`,
      cta: { label: 'Resume lecture', href: classroomHref(subjectKeyValue, resuming.job_id) },
    };
  }
  const ready = chapters.find((c) => q(c)?.state === 'open');
  if (ready) {
    return {
      kind: 'assess', icon: 'clip',
      title: `Take the ${name(ready)} assessment`,
      short: `Take the ${name(ready)} assessment`,
      body: 'You’ve watched the lecture, so the assessment is open — one attempt.',
      cta: { label: 'Take assessment', href: assessmentHref(ready, subjectKeyValue) },
    };
  }
  const low = chapters
    .filter((c) => q(c)?.state === 'done' && bandFor(q(c).percentage) !== 'strong')
    .sort((a, b) => Number(q(a).percentage) - Number(q(b).percentage))[0];
  if (low) {
    return {
      kind: 'review', icon: 'bookOpen',
      title: `Review your ${name(low)} results`,
      short: `Review your ${name(low)} results`,
      body: `You scored ${pct(q(low).percentage)} — go through the explanations for the questions you missed.`,
      cta: { label: 'Review results', href: assessmentHref(low, subjectKeyValue, { view: 'review' }) },
    };
  }
  const fresh = chapters.find((c) => w(c) === 0);
  if (fresh) {
    return {
      kind: 'start', icon: 'playCircle',
      title: `Start ${name(fresh)}`,
      short: `Start ${name(fresh)}`,
      body: 'Your next lecture is ready — watch it to 100% to unlock its assessment.',
      cta: { label: 'Start lecture', href: classroomHref(subjectKeyValue, fresh.job_id) },
    };
  }
  return { kind: 'done', icon: 'chat', title: 'You’re up to date', short: 'You’re up to date — revise with your AI tutor', body: '', cta: null };
}

/** Lectures watched, assessments done and average score for one subject (or every subject). */
function progressOf(chapters, watchByJob, quizzes) {
  const total = chapters.length;
  const watched = chapters.filter((c) => (watchByJob[c.job_id] ?? 0) >= 100).length;
  const done = chapters.map((c) => quizzes[c.job_id]).filter((q) => q?.state === 'done');
  const avg = done.length ? done.reduce((a, q) => a + Number(q.percentage || 0), 0) / done.length : null;
  return { total, watched, done: done.length, avg, watchedPct: total ? Math.round((watched / total) * 100) : null };
}

/** Chapter filter for the chapter list (spec §2). */
const CHAPTER_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'new', label: 'Not started' },
  { value: 'progress', label: 'In progress' },
  { value: 'watched', label: 'Watched' },
  { value: 'ready', label: 'Assessment ready' },
  { value: 'done', label: 'Completed' },
];

/** One status per chapter (S7), so the filter counts add up to All. */
function chapterStatus(w, q) {
  if (q?.state === 'done') return 'done';
  if (q?.state === 'open') return 'ready';
  if (w >= 100) return 'watched';
  if (w > 0) return 'progress';
  return 'new';
}

function chapterMatches(filter, w, q) {
  return filter === 'all' || chapterStatus(w, q) === filter;
}

/** Status chip (text + dot) and the one action for a chapter row — same vocabulary as the filter. */
function chapterView(c, subjectKeyValue, w, q, ready) {
  const open = classroomHref(subjectKeyValue, c.job_id);
  const status = chapterStatus(w, q);
  if (status === 'done') {
    const band = bandFor(q.percentage);
    return { chip: `Completed · ${pct(q.percentage)}`, dot: `sl-dot--${band}`, note: BAND_TEXT[band] || null, action: { label: 'View result', href: assessmentHref(c, subjectKeyValue) } };
  }
  if (status === 'ready') return { chip: 'Assessment ready', dot: '', note: 'Lecture watched', action: { label: 'Take assessment', href: assessmentHref(c, subjectKeyValue) } };
  if (status === 'watched') {
    const note = !ready ? 'Checking assessment…' : q?.state === 'unavailable' ? 'Assessment not published yet' : null;
    return { chip: 'Watched', dot: '', note, action: { label: 'Rewatch', href: open } };
  }
  if (status === 'progress') return { chip: `In progress · ${w}%`, dot: 'sl-dot--mid', note: 'Watch 100% to unlock assessment', lock: true, action: { label: 'Resume', href: open } };
  return { chip: 'Not started', dot: 'sl-dot--off', note: 'Watch 100% to unlock assessment', lock: true, action: { label: 'Watch', href: open } };
}

const PAGE_SIZE = 10;
const TOOLBAR_MIN = 6;

function SubjectTile({ subject }) {
  return <span className="sl-ov-tile" aria-hidden="true">{subject.code || <Icon name="book" size={20} />}</span>;
}

function subjectMetaLine(subject) {
  return subject.linked ? [subject.program, subject.semester].filter(Boolean).join(' · ') : '';
}

/** "Programme · Semester · 2 chapters" — the count never wraps on its own. */
function SubjectMeta({ subject, published = false }) {
  const meta = subjectMetaLine(subject);
  const n = subject.chapters.length;
  return (
    <>
      {meta ? <>{meta} · </> : null}
      <span className="sl-nowrap">{n} {published ? 'published ' : ''}chapter{n === 1 ? '' : 's'}</span>
    </>
  );
}

/** Same chip (text + dot) on the subject page and in the classroom chapter list. */
function ChapterChip({ v }) {
  return <span className="sl-st"><i className={`sb-dot ${v.dot}`.trim()} aria-hidden="true" /> {v.chip}</span>;
}

/** Ring + three small stats; shared by the subject card and the subject header card. */
function SubjectProgress({ p, ready, className = '' }) {
  return (
    <div className={`sl-prog ${className}`.trim()}>
      <ScoreRing score={p.watchedPct} size="md" color="var(--sb-teal,#14606e)" suffix="%" label={`Lectures watched: ${p.watched} of ${p.total}`} />
      <dl className="sl-mini">
        <div><dt>Lectures</dt><dd>{p.watched}/{p.total}</dd></div>
        <div><dt>Assessments</dt><dd>{ready ? `${p.done}/${p.total}` : '—'}</dd></div>
        <div><dt>Average</dt><dd>{ready ? pct(p.avg) : '—'}</dd></div>
      </dl>
    </div>
  );
}

/** Level 1 card: whole card opens the subject (stretched title link); the button is the primary. */
function SubjectCard({ subject, watchByJob, quizzes, ready }) {
  const p = progressOf(subject.chapters, watchByJob, quizzes);
  const next = ready ? recommend(subject.chapters, subject.key, watchByJob, quizzes) : null;
  const go = next?.cta ? { label: next.cta.label, href: next.cta.href, primary: true } : { label: 'Open subject', href: subjectHref(subject.key), primary: false };
  return (
    <article className="sl-card sl-scard" aria-labelledby={`sl-sc-${subject.key}`}>
      <div className="sl-scard-h">
        <SubjectTile subject={subject} />
        <div className="sl-scard-t">
          <h3 id={`sl-sc-${subject.key}`}><Link className="sl-scard-link" href={subjectHref(subject.key)}>{subject.name}</Link></h3>
          <p><SubjectMeta subject={subject} /></p>
        </div>
      </div>
      <SubjectProgress p={p} ready={ready} className="sl-prog--card" />
      <p className="sl-scard-next"><b>Next:</b> {next ? next.short : 'Checking your progress…'}</p>
      <Link
        className={`sd-btn ${go.primary ? 'sd-btn--amber' : 'sd-btn--outline'} sl-scard-cta`}
        href={go.href}
        aria-label={`${go.label}: ${subject.name}`}
      >
        {go.label} <Icon name="arrow" size={18} />
      </Link>
    </article>
  );
}

function ChapterRow({ c, n, subjectKeyValue, w, q, ready }) {
  const v = chapterView(c, subjectKeyValue, w, q, ready);
  const title = c.chapter_title || 'Untitled chapter';
  return (
    <li className="sl-crow">
      <span className="sl-crow-n" aria-hidden="true">{pad2(n)}</span>
      <div className="sl-crow-main">
        <Link className="sl-crow-link" href={classroomHref(subjectKeyValue, c.job_id)}>{title}</Link>
        <span className="sl-crow-meta">
          <span>{formatDuration(c.video_duration_seconds) || 'Video lecture'}</span>
          <span aria-hidden="true">·</span>
          <span>Published {formatDate(c.published_at) || '—'}</span>
        </span>
      </div>
      <div className="sl-crow-status">
        <span className="sl-crow-chip"><ChapterChip v={v} /></span>
        {v.note ? <small>{v.lock ? <Icon name="lock" size={13} /> : null}{v.note}</small> : null}
      </div>
      <div className="sl-crow-act">
        <Link className="sd-btn sd-btn--outline" href={v.action.href} aria-label={`${v.action.label}: ${title}`}>{v.action.label}</Link>
      </div>
      {w > 0 && w < 100 ? <span className="sl-crow-bar" aria-hidden="true"><i style={{ width: `${w}%` }} /></span> : null}
    </li>
  );
}

/** Level 2 — /student/subjects?s=<key>: header card, Up next, chapters. */
function SubjectPage({ subject, watchByJob, quizzes, ready, url, setUrl, onHow }) {
  const chapters = subject.chapters;
  const p = progressOf(chapters, watchByJob, quizzes);
  const next = ready ? recommend(chapters, subject.key, watchByJob, quizzes) : null;

  // Search applies on Enter; the status select applies on change. Drafts mirror the URL on Back / Forward.
  const [draftQ, setDraftQ] = useState(url.q || '');
  useEffect(() => { setDraftQ(url.q || ''); }, [url.q]);
  const apply = (e) => { e.preventDefault(); setUrl({ q: draftQ.trim(), p: '1' }); };
  const clear = () => {
    setDraftQ('');
    setUrl({ q: '', f: 'all', p: '1' });
    requestAnimationFrame(() => document.getElementById('sl-ov-ch-h')?.focus());
  };

  const term = (url.q || '').trim().toLowerCase();
  const counts = Object.fromEntries(CHAPTER_FILTERS.map((f) => [f.value, chapters.filter((c) => chapterMatches(f.value, watchByJob[c.job_id] ?? 0, quizzes[c.job_id])).length]));
  const shown = chapters
    .map((c, i) => ({ c, n: i + 1 }))
    .filter(({ c }) => chapterMatches(url.f, watchByJob[c.job_id] ?? 0, quizzes[c.job_id]))
    .filter(({ c }) => !term || String(c.chapter_title || '').toLowerCase().includes(term));
  const filtered = url.f !== 'all' || Boolean(term);
  // Toolbar only for long lists — or when a filter arrived in the URL, so it can always be cleared.
  const toolbar = chapters.length > TOOLBAR_MIN || filtered;
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(url.p) || 1));
  const from = (page - 1) * PAGE_SIZE;
  const pageRows = shown.slice(from, from + PAGE_SIZE);
  const goPage = (n) => setUrl({ p: String(n) });

  return (
    <>
      <Link className="sl-back" href={SUBJECTS_PATH}><Icon name="back" size={18} /> All subjects</Link>

      <section className="sl-card sl-shead" aria-labelledby="sl-shead-h">
        <div className="sl-shead-main">
          <div className="sl-ov-title">
            <SubjectTile subject={subject} />
            <div>
              <h2 id="sl-shead-h">{subject.name}</h2>
              <p><SubjectMeta subject={subject} published /></p>
            </div>
          </div>
          <SubjectProgress p={p} ready={ready} className="sl-prog--head" />
        </div>
        <div className="sl-shead-actions">
          <Link className="sl-linkbtn" href={classroomHref(subject.key, null, 'tutor')}><Icon name="mic" size={18} /> Ask AI tutor</Link>
          <button type="button" className="sl-linkbtn" onClick={onHow}><Icon name="info" size={18} /> How learning works</button>
        </div>
      </section>

      {next?.cta ? (
        <section className="sl-card sl-upnext" aria-labelledby="sl-upnext-h">
          <span className="sl-upnext-ic" aria-hidden="true"><Icon name={next.icon} size={22} /></span>
          <div className="sl-upnext-body">
            <span className="sl-over">Up next</span>
            <h3 id="sl-upnext-h">{next.title}</h3>
            <p>{next.body}</p>
          </div>
          <Link className="sd-btn sd-btn--amber" href={next.cta.href}>{next.cta.label} <Icon name="arrow" size={18} /></Link>
        </section>
      ) : null}

      <section className="sl-ov-chapters" aria-labelledby="sl-ov-ch-h">
        <div className="sl-sec-h">
          <h2 id="sl-ov-ch-h" tabIndex={-1}>Chapters <span className="sl-sec-n">· {chapters.length}</span></h2>
          <span className="sl-sec-sub">{subject.linked ? 'In course order' : 'Newest first'}</span>
        </div>

        {toolbar ? (
          <form className="sb-filterbar" role="search" aria-label="Filter chapters" onSubmit={apply}>
            <label className="sb-search">
              <span className="sr-only">Search chapters</span>
              <Icon name="search" size={18} />
              <input type="search" placeholder="Search chapters" value={draftQ} onChange={(e) => setDraftQ(e.target.value)} />
            </label>
            <select className="sb-select" aria-label="Chapter status" value={url.f || 'all'} onChange={(e) => setUrl({ f: e.target.value, p: '1' })}>
              {CHAPTER_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label} ({counts[f.value]})</option>)}
            </select>
            {filtered && pageRows.length ? <button type="button" className="sb-btn sb-btn--clear" onClick={clear}>Clear</button> : null}
            <button type="submit" className="sr-only" tabIndex={-1}>Search</button>
          </form>
        ) : null}

        {pageRows.length ? (
          <ul className="sl-crows">
            {pageRows.map(({ c, n }) => (
              <ChapterRow key={c.job_id} c={c} n={n} subjectKeyValue={subject.key} w={watchByJob[c.job_id] ?? 0} q={quizzes[c.job_id]} ready={ready} />
            ))}
          </ul>
        ) : (
          <div className="sl-card sl-empty">
            <span className="sl-empty-ic" aria-hidden="true"><Icon name={filtered ? 'search' : 'book'} size={24} /></span>
            <b>{filtered ? 'No chapters match your filters' : 'No chapters published yet'}</b>
            {filtered ? <button type="button" className="sl-linkbtn" onClick={clear}>Clear filters</button> : <p>Chapters appear here once your faculty publishes them.</p>}
          </div>
        )}

        {shown.length > PAGE_SIZE ? (
          <div className="sb-pager">
            <span className="sb-pager__info">Showing {from + 1}–{Math.min(from + PAGE_SIZE, shown.length)} of {shown.length}</span>
            <div className="sb-pager__nav">
              <button type="button" onClick={() => goPage(page - 1)} disabled={page <= 1}>Previous</button>
              <span>{page} / {pages}</span>
              <button type="button" onClick={() => goPage(page + 1)} disabled={page >= pages}>Next</button>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

/** Level 1 — /student/subjects: summary strip + subject cards. Level 2 when ?s= names a subject. */
function SubjectList({ subjects, watchByJob, quizzes, quizzesReady, loading, error, reload, deptName, url, setUrl }) {
  const [howOpen, setHowOpen] = useState(false);
  const subject = url.s ? subjects.find((s) => s.key === url.s) || null : null;
  const all = useMemo(() => subjects.flatMap((s) => s.chapters), [subjects]);
  const sum = progressOf(all, watchByJob, quizzes);

  return (
    <div className="sl sl-ov animate-fade-in">
      {error ? (
        <section className="sl-card">
          <SectionState
            tone="err"
            title="Could not load your subjects"
            action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}><Icon name="refresh" size={16} /> Try again</button>}
          >
            {apiErrorMessage(error, 'Please try again.')}
          </SectionState>
        </section>
      ) : null}

      {loading ? (
        <div className="sl-ov-loading" role="status" aria-label="Loading your published lectures">
          <span className="sb-skel" style={{ height: 88 }} />
          <div className="sl-sgrid">
            <span className="sb-skel" style={{ height: 300 }} />
            <span className="sb-skel" style={{ height: 300 }} />
            <span className="sb-skel" style={{ height: 300 }} />
          </div>
        </div>
      ) : null}

      {!loading && !error && !subjects.length ? (
        <section className="sl-card sl-empty">
          <span className="sl-empty-ic" aria-hidden="true"><Icon name="book" size={26} /></span>
          <b>Nothing published for your department yet</b>
          <p>Lectures appear here after your HOD or faculty publishes them{deptName ? ` for ${deptName}` : ' for your department'}.</p>
          <button type="button" className="sl-linkbtn" onClick={() => setHowOpen(true)}><Icon name="info" size={18} /> How learning works</button>
        </section>
      ) : null}

      {subject ? (
        <SubjectPage
          subject={subject}
          watchByJob={watchByJob}
          quizzes={quizzes}
          ready={quizzesReady}
          url={url}
          setUrl={setUrl}
          onHow={() => setHowOpen(true)}
        />
      ) : null}

      {!subject && subjects.length ? (
        <>
          <section className="sl-card sl-sum" aria-label="Your learning summary">
            <div><b>{subjects.length}</b><span>Subject{subjects.length === 1 ? '' : 's'}</span></div>
            <div><b>{sum.watched}/{sum.total}</b><span>Lectures watched</span></div>
            <div><b>{quizzesReady ? `${sum.done}/${sum.total}` : '—'}</b><span>Assessments done</span></div>
            <div><b>{quizzesReady ? pct(sum.avg) : '—'}</b><span>Average score</span></div>
          </section>

          <section className="sl-ov-subjects" aria-labelledby="sl-subj-h">
            <div className="sl-sec-h">
              <h2 id="sl-subj-h">Your subjects <span className="sl-sec-n">· {subjects.length}</span></h2>
              <button type="button" className="sl-linkbtn" onClick={() => setHowOpen(true)}><Icon name="info" size={18} /> How learning works</button>
            </div>
            <ul className={`sl-sgrid sl-sgrid--n${Math.min(subjects.length, 3)}`}>
              {subjects.map((s) => (
                <li key={s.key}>
                  <SubjectCard subject={s} watchByJob={watchByJob} quizzes={quizzes} ready={quizzesReady} />
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      <QuirriModal
        open={howOpen}
        onClose={() => setHowOpen(false)}
        title="How learning works"
        crumb="Three steps for every chapter"
        footer={<div className="right"><button type="button" className="sd-btn sd-btn--amber" onClick={() => setHowOpen(false)}>Got it</button></div>}
      >
        <ol className="sl-ov-how">
          {HOW_STEPS.map((st, i) => (
            <li key={st.title}>
              <span className="sl-ov-how-n" aria-hidden="true">{i + 1}</span>
              <div><b><Icon name={st.icon} size={18} /> {st.title}</b><p>{st.body}</p></div>
            </li>
          ))}
        </ol>
      </QuirriModal>
    </div>
  );
}

/* ============================================================= classroom */
function LectureStatus({ job, subjectKeyValue, watchPercent, quiz, onPlay }) {
  const complete = watchPercent >= 100;
  if (quiz?.state === 'done') {
    return (
      <section className="sl-card sl-status" aria-labelledby="sl-st-h">
        <div className="sl-status-h">
          <span className="sl-status-ic is-good" aria-hidden="true"><Icon name="tick" size={22} /></span>
          <div>
            <h3 id="sl-st-h">Assessment completed</h3>
            <p className="sl-status-score">You scored <b>{pct(quiz.percentage)}</b>{BAND_TEXT[bandFor(quiz.percentage)] ? <span>· {BAND_TEXT[bandFor(quiz.percentage)]}</span> : null}{quiz.total ? <span>· {quiz.correct}/{quiz.total} correct</span> : null}</p>
            <p>One attempt only. Review your answers to learn from it.</p>
          </div>
        </div>
        <Link className="sd-btn sd-btn--amber sd-btn--block" href={assessmentHref(job, subjectKeyValue)}>
          <Icon name="clip" size={18} /> View results
        </Link>
        <button type="button" className="sl-linkbtn" onClick={onPlay}>
          {complete
            ? <><Icon name="refresh" size={18} /> Rewatch lecture</>
            : <><Icon name="playCircle" size={18} /> {watchPercent > 0 ? 'Resume lecture' : 'Watch lecture'}</>}
        </button>
      </section>
    );
  }
  if (complete) {
    const notReady = quiz?.state === 'unavailable';
    return (
      <section className="sl-card sl-status" aria-labelledby="sl-st-h">
        <div className="sl-status-h">
          <span className="sl-status-ic is-good" aria-hidden="true"><Icon name="tick" size={22} /></span>
          <div>
            <h3 id="sl-st-h">Lecture complete</h3>
            <p>100% watched</p>
            <p>{notReady ? 'Your faculty is still preparing this chapter’s questions.' : 'Your assessment is unlocked.'}</p>
          </div>
        </div>
        {notReady ? (
          <span className="sd-btn sd-btn--block" aria-disabled="true"><Icon name="clock" size={18} /> Assessment not ready yet</span>
        ) : (
          <Link className="sd-btn sd-btn--amber sd-btn--block" href={assessmentHref(job, subjectKeyValue)}>
            <Icon name="check" size={18} /> Take assessment
          </Link>
        )}
        <button type="button" className="sl-linkbtn" onClick={onPlay}><Icon name="refresh" size={18} /> Rewatch lecture</button>
      </section>
    );
  }
  return (
    <section className="sl-card sl-status" aria-labelledby="sl-st-h">
      <div className="sl-status-h">
        <span className="sl-status-ic" aria-hidden="true"><Icon name="play" size={22} /></span>
        <div>
          <h3 id="sl-st-h">{watchPercent > 0 ? 'Keep watching' : 'Start this lecture'}</h3>
          <p>{watchPercent}% watched</p>
          <p>Watch to 100% to unlock the assessment.</p>
        </div>
      </div>
      {/* White secondary: the play disc on the stage is this view's one orange action (S18). */}
      <button type="button" className="sd-btn sd-btn--outline sd-btn--block" onClick={onPlay}>
        <Icon name="playFill" size={18} /> {watchPercent > 0 ? 'Resume lecture' : 'Watch lecture'}
      </button>
      <span className="sd-btn sd-btn--block" aria-disabled="true">
        <Icon name="lock" size={18} /> Assessment locked
      </span>
    </section>
  );
}

function SubjectView({ subject, url, setUrl, watchByJob, setWatchByJob, quizzes }) {
  const chapters = subject.chapters;
  const activeJob = chapters.find((c) => c.job_id === url.chapter) || chapters[0] || null;
  const activeIndex = activeJob ? chapters.findIndex((c) => c.job_id === activeJob.job_id) : -1;
  const tab = url.tab === 'tutor' ? 'tutor' : 'classroom';
  const watchPercent = activeJob ? (watchByJob[activeJob.job_id] ?? 0) : 0;
  const complete = watchPercent >= 100;
  const quiz = activeJob ? quizzes[activeJob.job_id] : null;

  const [watching, setWatching] = useState(false);
  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const maxWatchedRef = useRef(0);
  const lastSavedPctRef = useRef(0);
  const saveTimerRef = useRef(null);

  const persistProgress = useCallback(async (jobId, percent, maxPos) => {
    if (!jobId) return;
    const p = clampPct(percent);
    if (p <= lastSavedPctRef.current && p < 100) return;
    try {
      const res = await eduVideoApi.putWatchProgress(jobId, {
        percent: p,
        max_position_seconds: Math.max(0, Math.round(maxPos || 0)),
      });
      const saved = Math.max(p, Number(res?.percent) || 0);
      lastSavedPctRef.current = saved;
      setWatchByJob((prev) => ({ ...prev, [jobId]: Math.max(prev[jobId] ?? 0, saved) }));
    } catch {
      /* Keep local progress; the next heartbeat retries. */
    }
  }, [setWatchByJob]);

  const schedulePersist = useCallback((jobId, percent, maxPos) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistProgress(jobId, percent, maxPos), 800);
  }, [persistProgress]);

  /* Changing chapter or tab stops the inline player. */
  useEffect(() => {
    setWatching(false);
    maxWatchedRef.current = 0;
    lastSavedPctRef.current = activeJob ? (watchByJob[activeJob.job_id] ?? 0) : 0;
  }, [activeJob?.job_id, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  const play = () => {
    setWatching(true);
    stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const onTimeUpdate = (e) => {
    if (!activeJob) return;
    const el = e.currentTarget;
    const d = el.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    const t = el.currentTime || 0;
    if (t > maxWatchedRef.current) maxWatchedRef.current = t;
    const p = Math.min(100, Math.floor((maxWatchedRef.current / d) * 100));
    setWatchByJob((prev) => {
      const cur = prev[activeJob.job_id] ?? 0;
      return p <= cur ? prev : { ...prev, [activeJob.job_id]: p };
    });
    schedulePersist(activeJob.job_id, p, maxWatchedRef.current);
  };

  const restoreMaxWatched = (el) => {
    if (!el || !activeJob) return;
    const d = el.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    const savedPct = watchByJob[activeJob.job_id] ?? lastSavedPctRef.current ?? 0;
    const fromSaved = (Math.min(100, Math.max(0, Number(savedPct) || 0)) / 100) * d;
    maxWatchedRef.current = Math.max(maxWatchedRef.current, fromSaved);
  };

  const onLoadedMetadata = (e) => {
    restoreMaxWatched(e.currentTarget);
  };

  const onSeeking = (e) => {
    const el = e.currentTarget;
    restoreMaxWatched(el);
    if (el.currentTime > maxWatchedRef.current + 1.25) el.currentTime = maxWatchedRef.current;
  };

  const onEnded = () => {
    if (!activeJob) return;
    maxWatchedRef.current = Math.max(maxWatchedRef.current, videoRef.current?.duration || 0);
    setWatchByJob((prev) => ({ ...prev, [activeJob.job_id]: 100 }));
    persistProgress(activeJob.job_id, 100, maxWatchedRef.current);
    setWatching(false);
  };

  const tabs = [
    { id: 'classroom', label: 'Classroom', icon: 'doc' },
    { id: 'tutor', label: 'AI tutor', icon: 'mic' },
  ];
  const onTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = tab === 'classroom' ? 'tutor' : 'classroom';
    setUrl({ tab: next }, { push: true });
    document.getElementById(`sl-tab-${next}`)?.focus();
  };

  const duration = formatDuration(activeJob?.video_duration_seconds);

  return (
    <div className="sl animate-fade-in">
      <nav className="sl-crumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link href={SUBJECTS_PATH}>My subjects</Link></li>
          <li><Link href={`${SUBJECTS_PATH}?s=${encodeURIComponent(subject.key)}`}>{subject.name}</Link></li>
          <li aria-current="page">{tab === 'tutor' ? 'AI tutor' : 'Classroom'}</li>
        </ol>
      </nav>

      <header className="sl-card sl-head">
        <SubjectTile subject={subject} />
        <div>
          <h2>{subject.name}</h2>
          <p className="sl-head-meta"><SubjectMeta subject={subject} published /></p>
        </div>
      </header>

      <div className="sb-tabs sl-tabs" role="tablist" aria-label="Subject sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`sl-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`sl-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className="sb-tab sl-tab"
            onClick={() => setUrl({ tab: t.id }, { push: true })}
            onKeyDown={onTabKey}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'classroom' ? (
        <div id="sl-panel-classroom" role="tabpanel" aria-labelledby="sl-tab-classroom" className="sl-classroom">
          <div className="sl-stage-col">
            <div ref={stageRef} className={`sl-stage${watching ? ' is-playing' : ''}`}>
              {watching && activeJob ? (
                <RefreshingVideo
                  key={activeJob.job_id}
                  ref={videoRef}
                  className="sl-video"
                  controls
                  autoPlay
                  playsInline
                  src={eduVideoApi.getDownloadUrl(activeJob.job_id)}
                  onTimeUpdate={onTimeUpdate}
                  onSeeking={onSeeking}
                  onLoadedMetadata={onLoadedMetadata}
                  onEnded={onEnded}
                >
                  Your browser does not support embedded video playback.
                </RefreshingVideo>
              ) : (
                <>
                  <span className="sl-stage-art" aria-hidden="true" />
                  {complete ? (
                    <button type="button" className="sl-replay" onClick={play} disabled={!activeJob}>
                      <span><Icon name="refresh" size={34} /></span>
                      Replay lecture
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="sl-play"
                      onClick={play}
                      disabled={!activeJob}
                      aria-label={activeJob ? `${watchPercent > 0 ? 'Resume' : 'Play'} ${activeJob.chapter_title || 'lecture'}` : 'Select a chapter'}
                    >
                      <Icon name="playFill" size={34} />
                    </button>
                  )}
                  <span className="sl-stage-foot">
                    <span className="sl-stage-bar" aria-hidden="true"><i style={{ width: `${watchPercent}%` }} /></span>
                    <span>{watchPercent}% watched{duration ? ` · ${duration}` : ''}</span>
                  </span>
                </>
              )}
              <span className="sl-stage-tag">{subject.linked ? `Chapter ${activeIndex + 1} of ${chapters.length}` : 'Lecture'}</span>
            </div>

            {activeJob ? (
              <section className="sl-card sl-info" aria-labelledby="sl-info-h">
                <div className="sl-info-main">
                  <span className="sl-over">{subject.linked ? `Chapter ${activeIndex + 1} of ${chapters.length}` : subject.name}</span>
                  <h2 id="sl-info-h">{activeJob.chapter_title || 'Untitled chapter'}</h2>
                  <div className="sl-info-meta">
                    {activeJob.source_filename ? <span><Icon name="doc" size={16} /> Source: {activeJob.source_filename}</span> : null}
                    <span><Icon name="calendar" size={16} /> Published {formatDate(activeJob.published_at) || '—'}</span>
                    {duration ? <span><Icon name="clock" size={16} /> {duration}</span> : null}
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          <div className="sl-side">
            <section className="sl-card sl-chapters" aria-labelledby="sl-chs-h">
              <div className="sl-card-h">
                <h3 id="sl-chs-h">Chapters</h3>
                <span>{chapters.length} chapter{chapters.length === 1 ? '' : 's'}</span>
              </div>
              <ul>
                {chapters.map((c, i) => {
                  const selected = c.job_id === activeJob?.job_id;
                  return (
                    <li key={c.job_id}>
                      <button
                        type="button"
                        className="sl-chapter"
                        aria-current={selected ? 'true' : undefined}
                        onClick={() => setUrl({ chapter: c.job_id }, { push: true })}
                      >
                        <span className="sl-chapter-n">{pad2(i + 1)}</span>
                        <span className="sl-chapter-t">
                          <b>{c.chapter_title || 'Untitled chapter'}</b>
                          <small>
                            <ChapterChip v={chapterView(c, subject.key, watchByJob[c.job_id] ?? 0, quizzes[c.job_id], true)} />
                            <span aria-hidden="true">·</span>
                            {formatDuration(c.video_duration_seconds) || 'Video lecture'}
                          </small>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {activeJob ? (
              <LectureStatus
                job={activeJob}
                subjectKeyValue={subject.key}
                watchPercent={watchPercent}
                quiz={quiz}
                onPlay={play}
              />
            ) : null}

            <section className="sl-card sl-ask" aria-labelledby="sl-ask-h">
              <div className="sl-status-h">
                <span className="sl-status-ic" aria-hidden="true"><Icon name="chat" size={22} /></span>
                <div>
                  <h3 id="sl-ask-h">Have a question?</h3>
                  <p>Get instant help from your AI tutor about this chapter.</p>
                </div>
              </div>
              <button type="button" className="sd-btn sd-btn--outline sd-btn--block" onClick={() => setUrl({ tab: 'tutor' }, { push: true })}>
                <Icon name="mic" size={18} /> Ask your AI tutor <Icon name="chev" size={16} />
              </button>
            </section>
          </div>
        </div>
      ) : (
        <div id="sl-panel-tutor" role="tabpanel" aria-labelledby="sl-tab-tutor">
          <VoiceQnaPanel
            jobId={activeJob?.job_id}
            chapterTitle={activeJob?.chapter_title || ''}
            subjectName={subject.name}
            chapters={chapters}
            onSelectChapter={(id) => setUrl({ chapter: id })}
          />
        </div>
      )}
    </div>
  );
}

/* ================================================================== page */
function SubjectsInner() {
  const [url, setUrl] = useUrlState({ subject: '', chapter: '', tab: 'classroom', s: '', f: 'all', q: '', p: '1' });
  const [watchByJob, setWatchByJob] = useState({});

  const { data: meData } = useAsyncResource(() => fetchData(() => settingsApi.get()), []);
  const { data, loading, error, reload } = useAsyncResource(() => eduVideoApi.listStudentVideos({ pageSize: 100 }), []);

  const videos = useMemo(() => asList(data, []), [data]);
  const me = meData?.user || meData || null;
  const deptName = me?.department_name || me?.department || null;
  const subjects = useMemo(() => buildSubjects(videos), [videos]);
  const { quizzes, ready: quizzesReady } = useQuizStatuses(videos);

  /* Seed / refresh watch map from the API (never lower a live value). A submitted
     assessment means the lecture was watched to 100% (the quiz only opens then). */
  useEffect(() => {
    setWatchByJob((prev) => {
      const next = { ...prev };
      videos.forEach((job) => {
        if (!job.job_id) return;
        const attempted = quizzes[job.job_id]?.state === 'done';
        next[job.job_id] = Math.max(next[job.job_id] ?? 0, clampPct(job.watch_percent), attempted ? 100 : 0);
      });
      return next;
    });
  }, [videos, quizzes]);

  const active = url.subject ? subjects.find((s) => s.key === url.subject) : null;

  if (url.subject && !active) {
    if (loading && !data) return <SectionState title="Loading your classroom…" />;
    return (
      <div className="sl">
        <nav className="sl-crumbs" aria-label="Breadcrumb">
          <ol><li><Link href={SUBJECTS_PATH}>My subjects</Link></li><li aria-current="page">Not found</li></ol>
        </nav>
        <SectionState
          tone={error ? 'err' : 'info'}
          title={error ? 'Could not load this subject' : 'This subject isn’t available'}
          action={<Link className="sd-btn sd-btn--ghost sd-btn--sm" href={SUBJECTS_PATH}><Icon name="back" size={16} /> All subjects</Link>}
        >
          {error ? apiErrorMessage(error, 'Please try again.') : 'It may have been unpublished, or it belongs to another department.'}
        </SectionState>
      </div>
    );
  }

  if (active) {
    return (
      <SubjectView
        subject={active}
        url={url}
        setUrl={setUrl}
        watchByJob={watchByJob}
        setWatchByJob={setWatchByJob}
        quizzes={quizzes}
      />
    );
  }

  return (
    <SubjectList
      subjects={subjects}
      watchByJob={watchByJob}
      quizzes={quizzes}
      quizzesReady={quizzesReady || (!loading && !videos.length)}
      loading={loading && !data}
      error={error}
      reload={reload}
      deptName={deptName}
      url={url}
      setUrl={setUrl}
    />
  );
}

export default function StudentSubjectsPage() {
  return (
    <Suspense fallback={<SectionState title="Loading your subjects…" />}>
      <SubjectsInner />
    </Suspense>
  );
}
