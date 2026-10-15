'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import VoiceQnaPanel from '@/components/student/VoiceQnaPanel';
import RefreshingVideo from '@/components/shared/RefreshingVideo';
import QuirriModal from '@/components/superadmin/QuirriModal';
import QuirriSelect from '@/components/superadmin/QuirriSelect';
import { Icon, SectionState } from '@/components/student/ui';
import { SearchBox, SegTabs } from '@/components/shared/module-ui';
import { BandPill, bandFor } from '@/components/shared/data-viz';
import { subjectColor, subjectTileStyle } from '@/components/student/subjectColor';
import { eduVideoApi } from '@/lib/api/admin/eduVideo';
import { settingsApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useUrlSearch, useUrlState } from '@/hooks/useUrlState';
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
 *   list      → subject overview: summary strip, recommended next step, chapters table
 *               (?s=<subject> picks the subject when there are several), "How learning works" modal
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

function WatchChip({ value }) {
  if (value >= 100) return <span className="sl-chip sl-chip--good"><Icon name="tick" size={12} /> Watched</span>;
  if (value > 0) return <span className="sl-chip">{value}% watched</span>;
  return <span className="sl-chip">Not started</span>;
}

/* ================================================================== list */
const HOW_STEPS = [
  { icon: 'playCircle', title: 'Watch the lecture', body: 'Short, focused video lectures you can take at your own pace.' },
  { icon: 'doc', title: 'Complete the assessment', body: 'It unlocks once you watch 100% of the lecture and your faculty publishes the questions. One attempt.' },
  { icon: 'chat', title: 'Review with your tutor', body: 'Ask by voice, in English or Tamil, and get explanations grounded in the chapter.' },
];

function lectureStatus(w) {
  if (w >= 100) return <span className="sl-chip sl-chip--good"><Icon name="tick" size={12} /> Watched</span>;
  if (w > 0) return <span className="sl-chip sl-chip--mid">{w}% watched</span>;
  return <span className="sl-chip">Not started</span>;
}

function assessmentStatus(q, w) {
  if (q?.state === 'done') return <span className="sl-ov-score"><b>{pct(q.percentage)}</b><BandPill score={q.percentage} /></span>;
  if (q?.state === 'open') return <span className="sl-chip sl-chip--mid">Ready to take</span>;
  if (q?.state === 'watch_required' || w < 100) return <span className="sl-ov-quiet"><Icon name="lock" size={14} /> Locked</span>;
  if (q?.state === 'unavailable') return <span className="sl-ov-quiet"><Icon name="clock" size={14} /> Not published yet</span>;
  return <span className="sl-ov-quiet">—</span>;
}

/** Primary + secondary action for one chapter row. Never orange (the banner owns the one orange action). */
function rowActions(c, subjectKey, q, w) {
  const watch = { label: w >= 100 ? 'Rewatch' : w > 0 ? 'Resume' : 'Watch', icon: 'playCircle', href: classroomHref(subjectKey, c.job_id) };
  const tutor = { label: 'Ask tutor', icon: 'chat', href: classroomHref(subjectKey, c.job_id, 'tutor') };
  if (q?.state === 'done') return [{ label: 'Review answers', icon: 'doc', href: assessmentHref(c, subjectKey, { view: 'review' }) }, watch];
  if (q?.state === 'open') return [{ label: 'Take assessment', icon: 'clip', href: assessmentHref(c, subjectKey) }, watch];
  return [watch, tutor];
}

/** The one next action for this subject, in priority order. */
function recommend(chapters, subjectKey, watchByJob, quizzes) {
  const w = (c) => watchByJob[c.job_id] ?? 0;
  const q = (c) => quizzes[c.job_id];
  const name = (c) => c.chapter_title || 'this chapter';
  const resuming = chapters.find((c) => w(c) > 0 && w(c) < 100);
  if (resuming) {
    return { icon: 'playCircle', title: `Finish ${name(resuming)}`, body: `You’re ${w(resuming)}% through. Finish the lecture to unlock its assessment.`, cta: { label: 'Resume lecture', href: classroomHref(subjectKey, resuming.job_id) } };
  }
  const ready = chapters.find((c) => q(c)?.state === 'open');
  if (ready) {
    return { icon: 'clip', title: `Take the ${name(ready)} assessment`, body: 'You’ve finished the lecture. One attempt, scored by Quirri — ask your tutor first if anything is unclear.', cta: { label: 'Take assessment', href: assessmentHref(ready, subjectKey) } };
  }
  const low = chapters
    .filter((c) => q(c)?.state === 'done' && bandFor(q(c).percentage) !== 'strong')
    .sort((a, b) => Number(q(a).percentage) - Number(q(b).percentage))[0];
  if (low) {
    return { icon: 'bookOpen', title: `Review your ${name(low)} assessment`, body: 'Go through the explanations for the questions you missed, then ask your tutor about anything unclear.', cta: { label: 'Review answers', href: assessmentHref(low, subjectKey, { view: 'review' }) } };
  }
  const fresh = chapters.find((c) => w(c) === 0);
  if (fresh) {
    return { icon: 'playCircle', title: `Start ${name(fresh)}`, body: 'Your next lecture is ready. Watch it to 100% to unlock its assessment.', cta: { label: 'Start lecture', href: classroomHref(subjectKey, fresh.job_id) } };
  }
  return { icon: 'chat', title: 'You’re up to date', body: 'Every published chapter is watched and assessed. Revise any chapter with your AI tutor.', cta: { label: 'Ask AI tutor', href: classroomHref(subjectKey, null, 'tutor') } };
}

/** Chapter filter for the overview table (spec §2). */
const CHAPTER_FILTERS = [
  { value: 'all', label: 'All' },
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

/** Subject switcher: colour dot, code, name and a watched mini bar; a select at 390 / more than 6 subjects. */
function SubjectSwitcher({ subjects, current, watchByJob, onPick }) {
  const many = subjects.length > 6;
  const groups = [];
  subjects.forEach((s) => {
    const label = s.semester || (s.linked ? 'Subjects' : 'Not linked to a subject');
    let g = groups.find((x) => x.label === label);
    if (!g) { g = { label, items: [] }; groups.push(g); }
    g.items.push(s);
  });
  const showGroups = groups.length > 1;
  const options = subjects.map((s) => ({
    value: s.key,
    label: [s.semester, s.code, s.name].filter(Boolean).join(' · '),
  }));
  return (
    <div className={`sl-ov-switch${many ? ' is-many' : ''}`}>
      <div className="sl-ov-switch-select">
        <QuirriSelect ariaLabel="Choose a subject" value={current?.key || ''} options={options} onChange={(e) => onPick(e.target.value)} />
      </div>
      {!many ? (
        <div className="sl-ov-switch-pills" role="group" aria-label="Choose a subject">
          {groups.map((g) => (
            <div key={g.label} className="sl-ov-group">
              {showGroups ? <span className="sl-ov-group-l">{g.label}</span> : null}
              <div className="sl-ov-group-items">
                {g.items.map((s) => {
                  const w = s.chapters.filter((c) => (watchByJob[c.job_id] ?? 0) >= 100).length;
                  const on = s.key === current?.key;
                  const pctW = s.chapters.length ? Math.round((w / s.chapters.length) * 100) : 0;
                  const color = subjectColor(s.key);
                  return (
                    <button key={s.key} type="button" className={`sl-ov-pill${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onPick(s.key)}>
                      <i className="sl-ov-dot" style={{ background: color }} aria-hidden="true" />
                      <span className="sl-ov-pill-t">
                        <b>{s.code ? <span className="sl-ov-pill-code">{s.code}</span> : null}{s.name}</b>
                        <span className="sl-ov-mini">
                          <span aria-hidden="true"><i style={{ width: `${pctW}%`, background: color }} /></span>
                          <small>{w}/{s.chapters.length}</small>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SubjectList({ subjects, watchByJob, quizzes, quizzesReady, loading, error, reload, deptName, url, setUrl }) {
  const [howOpen, setHowOpen] = useState(false);
  const subject = subjects.find((s) => s.key === url.s) || subjects[0] || null;
  const chapters = subject?.chapters || [];
  const watched = chapters.filter((c) => (watchByJob[c.job_id] ?? 0) >= 100).length;
  const done = chapters.map((c) => quizzes[c.job_id]).filter((q) => q?.state === 'done');
  const available = chapters.map((c) => quizzes[c.job_id]).filter((q) => q?.state === 'done' || q?.state === 'open').length;
  const avg = done.length ? done.reduce((a, q) => a + Number(q.percentage || 0), 0) / done.length : null;
  const next = subject && quizzesReady ? recommend(chapters, subject.key, watchByJob, quizzes) : null;
  const watchPct = chapters.length ? Math.round((watched / chapters.length) * 100) : 0;
  const color = subject ? subjectColor(subject.key) : null;

  // Local box, URL written debounced — typing never loses characters (S1).
  const [q, setQ] = useUrlSearch(url.q, (v) => setUrl({ q: v }));
  const term = q.trim().toLowerCase();
  const counts = Object.fromEntries(CHAPTER_FILTERS.map((f) => [f.value, chapters.filter((c) => chapterMatches(f.value, watchByJob[c.job_id] ?? 0, quizzes[c.job_id])).length]));
  const shown = chapters
    .map((c, i) => ({ c, n: i + 1 }))
    .filter(({ c }) => chapterMatches(url.f, watchByJob[c.job_id] ?? 0, quizzes[c.job_id]))
    .filter(({ c }) => !term || String(c.chapter_title || '').toLowerCase().includes(term));
  const filtered = url.f !== 'all' || Boolean(term);

  return (
    <div className="sl sl-ov animate-fade-in">
      {subjects.length > 1 ? (
        <SubjectSwitcher subjects={subjects} current={subject} watchByJob={watchByJob} onPick={(key) => setUrl({ s: key, f: 'all', q: '' }, { push: true })} />
      ) : null}

      {error ? (
        <SectionState
          tone="err"
          title="Could not load your subjects"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}><Icon name="refresh" size={16} /> Try again</button>}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      {loading ? <SectionState title="Loading your published lectures…" /> : null}

      {!loading && !error && !subjects.length ? (
        <section className="sl-card sl-empty">
          <span className="sl-empty-ic" aria-hidden="true"><Icon name="book" size={26} /></span>
          <b>Nothing published for your department yet</b>
          <p>Lectures appear here after your HOD or faculty publishes them{deptName ? ` for ${deptName}` : ' for your department'}.</p>
          <button type="button" className="sl-linkbtn" onClick={() => setHowOpen(true)}><Icon name="info" size={18} /> How learning works</button>
        </section>
      ) : null}

      {subject ? (
        <>
          <header className="sl-ov-head">
            <div className="sl-ov-title">
              <span className="sl-ov-tile" style={subjectTileStyle(subject.key)} aria-hidden="true">{subject.code || <Icon name="book" size={20} />}</span>
              <div>
                <h2>{subject.name}</h2>
                <p>
                  {[subject.program, subject.semester].filter(Boolean).join(' · ')}
                  {subject.program || subject.semester ? <span aria-hidden="true"> · </span> : null}
                  {chapters.length} published chapter{chapters.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="sl-ov-head-cta">
              <Link className="sd-btn sd-btn--outline" href={classroomHref(subject.key, null, 'tutor')}><Icon name="mic" size={18} /> Ask AI tutor</Link>
              <button type="button" className="sl-linkbtn" onClick={() => setHowOpen(true)}><Icon name="info" size={18} /> How learning works</button>
            </div>
          </header>

          <section className="sl-card sl-ov-stats" aria-label={`${subject.name} summary`}>
            <div className="sl-ov-stat">
              <span className="sl-ov-ic" style={subjectTileStyle(subject.key)} aria-hidden="true"><Icon name="playCircle" size={22} /></span>
              <div>
                <span>Lectures watched</span>
                <b>{watched}/{chapters.length}</b>
                <span className="sl-ov-meter" aria-hidden="true"><i style={{ width: `${watchPct}%`, background: color }} /></span>
              </div>
            </div>
            <div className="sl-ov-stat">
              <span className="sl-ov-ic" aria-hidden="true"><Icon name="clip" size={22} /></span>
              <div>
                <span>Assessments completed</span>
                <b>{quizzesReady ? <>{done.length}<small>/{available}</small></> : '—'}</b>
                <small>{available ? 'One attempt each' : 'Unlock after each lecture'}</small>
              </div>
            </div>
            <div className="sl-ov-stat">
              <span className="sl-ov-ic" aria-hidden="true"><Icon name="bars" size={22} /></span>
              <div>
                <span>Assessment average</span>
                <b className="sl-ov-avg">{quizzesReady ? pct(avg) : '—'}{quizzesReady && avg != null ? <BandPill score={avg} /> : null}</b>
                <small>{done.length ? `Based on ${done.length} completed assessment${done.length === 1 ? '' : 's'}` : 'After your first assessment'}</small>
              </div>
            </div>
          </section>

          {next ? (
            <section className="sl-card sl-ov-next" aria-labelledby="sl-ov-next-h">
              <span className="sl-ov-next-ic" aria-hidden="true"><Icon name={next.icon} size={22} /></span>
              <div className="sl-ov-next-body">
                <span className="sl-ov-over">Recommended next step</span>
                <h3 id="sl-ov-next-h">{next.title}</h3>
                <p>{next.body}</p>
              </div>
              <Link className="sd-btn sd-btn--amber" href={next.cta.href}>{next.cta.label} <Icon name="arrow" size={18} /></Link>
            </section>
          ) : null}

          <section className="sl-card sl-ov-chapters" aria-labelledby="sl-ov-ch-h">
            <div className="sl-ov-section-h">
              <h3 id="sl-ov-ch-h">Chapters</h3>
              <p>Watch, assess and review each chapter. {subject?.linked ? 'In course order.' : 'Newest first.'}</p>
            </div>
            <div className="sl-ov-tools" role="search">
              <SegTabs
                label="Chapter status"
                value={url.f}
                onChange={(v) => setUrl({ f: v })}
                options={CHAPTER_FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
              />
              <SearchBox placeholder="Search chapters" value={q} onChange={(e) => setQ(e.target.value)} />
              {filtered ? <button type="button" className="sl-linkbtn" onClick={() => { setQ(''); setUrl({ f: 'all', q: '' }); }}>Clear</button> : null}
            </div>
            {shown.length ? (
              <div className="sl-table-wrap">
                <table className="sl-table sl-ov-table">
                  <thead>
                    <tr>
                      {subject.linked ? <th className="sl-n">#</th> : null}
                      <th>Chapter</th>
                      <th className="sl-num">Duration</th>
                      <th>Published</th>
                      <th>Lecture</th>
                      <th>Assessment</th>
                      <th><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map(({ c, n }) => {
                      const w = watchByJob[c.job_id] ?? 0;
                      const q = quizzes[c.job_id];
                      const [primary, secondary] = rowActions(c, subject.key, q, w);
                      return (
                        <tr key={c.job_id}>
                          {subject.linked ? <td data-label="#" className="sl-n">{n}</td> : null}
                          <td data-label="Chapter"><Link className="sl-ov-chname" href={classroomHref(subject.key, c.job_id)}>{c.chapter_title || 'Untitled chapter'}</Link></td>
                          <td data-label="Duration" className="sl-num sl-nowrap">{formatDuration(c.video_duration_seconds) || '—'}</td>
                          <td data-label="Published" className="sl-nowrap">{formatDate(c.published_at) || '—'}</td>
                          <td data-label="Lecture">{lectureStatus(w)}</td>
                          <td data-label="Assessment">{quizzesReady ? assessmentStatus(q, w) : <span className="sl-ov-quiet">Checking…</span>}</td>
                          <td data-label="Actions">
                            <span className="sl-ov-acts">
                              <Link className="sd-btn sd-btn--outline sd-btn--sm" href={primary.href}><Icon name={primary.icon} size={16} /> {primary.label}</Link>
                              <Link className="sl-linkbtn sl-linkbtn--sm" href={secondary.href}><Icon name={secondary.icon} size={16} /> {secondary.label}</Link>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="sl-ov-none">No chapters match these filters.</p>
            )}
            <p className="sl-ov-note">
              <Icon name="info" size={18} />
              <span>Assessments unlock after you watch 100% of a lecture, once your faculty publishes the questions. <button type="button" className="sl-ov-inlinelink" onClick={() => setHowOpen(true)}>How learning works</button></span>
            </p>
          </section>
        </>
      ) : null}

      <QuirriModal
        open={howOpen}
        onClose={() => setHowOpen(false)}
        title="How learning works"
        crumb="Three steps for every chapter"
        footer={<div className="right"><button type="button" className="sd-btn sd-btn--teal" onClick={() => setHowOpen(false)}>Got it</button></div>}
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
            <p className="sl-status-score">You scored <b>{pct(quiz.percentage)}</b> <BandPill score={quiz.percentage} />{quiz.total ? <span> {quiz.correct}/{quiz.total} correct</span> : null}</p>
            <p>One attempt only. Review your answers to learn from it.</p>
          </div>
        </div>
        <Link className="sd-btn sd-btn--teal sd-btn--block" href={assessmentHref(job, subjectKeyValue)}>
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
      {/* Teal, not orange: the play disc on the stage is this view's one orange action (S18). */}
      <button type="button" className="sd-btn sd-btn--teal sd-btn--block" onClick={onPlay}>
        <Icon name="playFill" size={18} /> {watchPercent > 0 ? 'Resume lecture' : 'Watch lecture'}
      </button>
      <span className="sd-btn sd-btn--block" aria-disabled="true">
        <Icon name="lock" size={18} /> Assessment locked
      </span>
    </section>
  );
}

function SubjectView({ subject, url, setUrl, watchByJob, setWatchByJob, quizzes, deptName }) {
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

  const onSeeking = (e) => {
    const el = e.currentTarget;
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
    <div className="sl animate-fade-in" style={{ '--subject': subjectColor(subject.key) }}>
      <nav className="sl-crumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link href={SUBJECTS_PATH}>My subjects</Link></li>
          <li><Link href={`${SUBJECTS_PATH}?s=${encodeURIComponent(subject.key)}`}><i className="sl-crumb-dot" aria-hidden="true" />{subject.name}</Link></li>
          <li aria-current="page">{tab === 'tutor' ? 'AI tutor' : 'Classroom'}</li>
        </ol>
      </nav>

      <header className="sl-head">
        {subject.code ? <span className="sl-code" style={subjectTileStyle(subject.key)} aria-hidden="true">{subject.code}</span> : null}
        <div>
          <span className="sl-over">{subject.linked ? 'Subject' : 'Not linked to a subject'}</span>
          <h2>{subject.name}</h2>
          <div className="sl-head-meta">
            <span className="sl-pill"><Icon name="video" size={14} /> {chapters.length} chapter{chapters.length === 1 ? '' : 's'}</span>
            {deptName ? <span className="sl-pill">{deptName}</span> : null}
          </div>
        </div>
      </header>

      <div className="sl-tabs" role="tablist" aria-label="Subject sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`sl-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`sl-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className="sl-tab"
            onClick={() => setUrl({ tab: t.id }, { push: true })}
            onKeyDown={onTabKey}
          >
            <Icon name={t.icon} size={18} /> {t.label}
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
                <a className="sd-btn sd-btn--outline" href={eduVideoApi.getDownloadUrl(activeJob.job_id)} target="_blank" rel="noopener noreferrer">
                  <Icon name="download" size={18} /> Download lecture
                </a>
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
                        <span className={`sl-chapter-n${(watchByJob[c.job_id] ?? 0) >= 100 ? ' is-done' : ''}`} aria-hidden={subject.linked ? undefined : 'true'}>
                          {(watchByJob[c.job_id] ?? 0) >= 100 && !selected ? <Icon name="tick" size={16} /> : subject.linked ? i + 1 : <Icon name="playCircle" size={16} />}
                        </span>
                        <span className="sl-chapter-t">
                          <b>{c.chapter_title || 'Untitled chapter'}</b>
                          <small><Icon name="playCircle" size={14} /> {formatDuration(c.video_duration_seconds) || 'Video lecture'}</small>
                        </span>
                        <WatchChip value={watchByJob[c.job_id] ?? 0} />
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
  const [url, setUrl] = useUrlState({ subject: '', chapter: '', tab: 'classroom', s: '', f: 'all', q: '' });
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
        deptName={deptName}
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
