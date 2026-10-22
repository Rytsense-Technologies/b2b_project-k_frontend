'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon, SectionState } from '@/components/student/ui';
import { BandPill, MetricList, bandFor } from '@/components/shared/data-viz';
import ScoreRing from '@/components/shared/ScoreRing';
import { subjectColor } from '@/components/student/subjectColor';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { loadStudentHomeData } from '@/components/student/studentHome';
import '@/styles/student-dashboard.css';

/**
 * Student Dashboard — quirri-b2c-student-ui skill "Dashboard" (owner, 15 Oct 2026).
 * Top to bottom on the grey canvas:
 *   greeting line · performance card (text tabs: overall / highest / recent) + your next step
 *   (the one orange action) · subjects as skill rows + study focus · up next as stacked white
 *   rows (each links to its target) · leaderboard snapshot.
 * No teal hero, no filter bar. Live student APIs only (lib/student/dashboardModel.js).
 */

const SUBJECTS = '/student/subjects';
const TEAL = '#14606e';

const PERF_TABS = [
  { value: 'overall', label: 'Overall score' },
  { value: 'highest', label: 'Highest score' },
  { value: 'recent', label: 'Recent score' },
];

function pct(n) {
  return n != null && n !== '' && Number.isFinite(Number(n)) ? `${Math.round(Number(n))}%` : '—';
}
const num = (n) => (n != null && n !== '' && Number.isFinite(Number(n)) ? Math.round(Number(n)) : null);

/** The single most useful next action, in priority order. */
function nextStep(m) {
  const cl = m?.continueLearning;
  if (cl && cl.watchPercent < 100) {
    return {
      icon: 'play',
      title: cl.title,
      lead: cl.watchPercent > 0 ? `You are ${cl.watchPercent}% through this lecture` : 'Your next lecture is ready',
      meta: ['Video lecture', cl.subject, cl.duration],
      cta: { label: cl.watchPercent > 0 ? 'Resume lecture' : 'Start lecture', href: cl.href || SUBJECTS, icon: 'play' },
      alt: { label: 'Browse subjects', href: SUBJECTS },
    };
  }
  const ready = m?.assessmentsReady?.[0];
  if (ready) {
    return {
      icon: 'check',
      title: ready.title,
      lead: 'Your chapter assessment is unlocked',
      meta: ['Assessment', ready.subject, 'One attempt'],
      cta: { label: 'Take assessment', href: ready.href, icon: 'check' },
      alt: { label: 'Browse subjects', href: SUBJECTS },
    };
  }
  return {
    icon: 'play',
    title: 'Pick up a lecture',
    lead: 'Review your subjects and keep your chapters moving',
    meta: ['My subjects', m?.deptName],
    cta: { label: 'Go to my subjects', href: SUBJECTS, icon: 'play' },
    alt: { label: 'See my progress', href: '/student/progress' },
  };
}

/** Study focus card copy + actions (each deep-links to its own chapter). */
function studyFocus(m) {
  const latest = m?.trend?.length ? m.trend[m.trend.length - 1] : null;
  const fallbackTutor = m?.chapterWatch?.[0]?.tutorHref || SUBJECTS;
  if (latest) {
    const row = m?.chapterWatch?.find((c) => c.jobId === latest.jobId);
    return {
      title: 'Review your latest assessment',
      // One line: the score itself is on the performance card (Recent score tab).
      lines: [
        bandFor(latest.score) === 'strong'
          ? `You scored ${latest.score}% — keep going with the next chapter while it is fresh.`
          : `You scored ${latest.score}%. Revisit the chapter or ask the AI tutor before your next assessment.`,
      ],
      primary: { label: 'Review chapter', href: row?.href || SUBJECTS, icon: 'playFill' },
      tutor: row?.tutorHref || fallbackTutor,
    };
  }
  const ready = m?.assessmentsReady?.[0];
  if (ready) {
    return {
      title: 'Take your next assessment',
      lines: [`${ready.title} is unlocked.`, 'One attempt, scored by Quirri. Ask the AI tutor first if anything is unclear.'],
      primary: { label: 'Take assessment', href: ready.href, icon: 'check' },
      tutor: m?.chapterWatch?.find((c) => c.jobId === ready.jobId)?.tutorHref || fallbackTutor,
    };
  }
  const cl = m?.continueLearning;
  if (cl) {
    return {
      title: `Finish ${cl.title}`,
      lines: [`You are at ${cl.watchPercent}%.`, 'Watch the lecture to 100% to unlock its assessment.'],
      primary: { label: cl.watchPercent > 0 ? 'Resume lecture' : 'Start lecture', href: cl.href || SUBJECTS, icon: 'playFill' },
      tutor: cl.tutorHref || fallbackTutor,
    };
  }
  return {
    title: 'Nothing due right now',
    lines: ['New lectures and assessments appear here when your department publishes them.'],
    primary: { label: 'Browse subjects', href: SUBJECTS, icon: 'book' },
    tutor: fallbackTutor,
  };
}

/** Up next: open assessments and the lecture to continue (max 4). */
function upNext(m) {
  const out = [];
  (m?.assessmentsReady || []).slice(0, 2).forEach((r) => out.push({
    key: `q-${r.jobId}`, icon: 'check', title: r.title, meta: ['Assessment ready', r.subject], label: 'Take', href: r.href,
  }));
  const cl = m?.continueLearning;
  if (cl && cl.watchPercent < 100) {
    out.push({
      key: `w-${cl.jobId}`, icon: 'play', title: cl.title, meta: [cl.watchPercent > 0 ? `${cl.watchPercent}% watched` : 'Not started', cl.subject], label: cl.watchPercent > 0 ? 'Resume' : 'Watch', href: cl.href || SUBJECTS,
    });
  }
  return out.slice(0, 4);
}

/** Assessment figure for the chosen performance tab. */
function performance(m, tab) {
  const a = m?.assessments;
  const trend = m?.trend || [];
  if (tab === 'highest') {
    return {
      quiz: num(a?.best),
      quizNote: a?.done ? `Best of ${a.done} assessment${a.done === 1 ? '' : 's'}` : 'No assessments yet',
    };
  }
  if (tab === 'recent') {
    const lastQuiz = trend.length ? trend[trend.length - 1] : null;
    return {
      quiz: num(lastQuiz?.score),
      quizNote: lastQuiz ? (lastQuiz.subject || lastQuiz.label || 'Latest assessment') : 'No assessments yet',
    };
  }
  return {
    quiz: num(a?.avg),
    quizNote: a?.done ? `Average of ${a.done} assessment${a.done === 1 ? '' : 's'}` : 'After your first assessment',
  };
}

function perfNote(p) {
  if (p.quiz == null) return 'Finish a lecture and take its assessment to see your score here.';
  const band = bandFor(p.quiz);
  if (band === 'strong') return 'Strong work. Keep the streak going with your next chapter.';
  if (band === 'ok') return 'You are on track. One more strong assessment lifts this further.';
  return 'Needs focus. Aim for 60% or more on your next assessment.';
}

function RowsSkeleton({ rows = 3, h = 72 }) {
  return (
    <div className="shb-skel" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <span key={i} className="sb-skel" style={{ height: h }} />)}
    </div>
  );
}

function SectionHead({ id, title, sub, action }) {
  return (
    <div className="shb-sec-h">
      <div>
        <h3 id={id}>{title}</h3>
        {sub ? <p>{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

const more = (label, href) => (
  <Link className="shb-more" href={href}>{label} <Icon name="chev" size={14} /></Link>
);

const Chev = () => (
  <svg className="sb-row__chev" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
);

export default function StudentHomePage() {
  const { data: m, loading, error, reload } = useAsyncResource(loadStudentHomeData, []);
  const [perfTab, setPerfTab] = useState('overall');
  const isLoading = loading && !m;
  const ready = Boolean(m);

  const w = m?.watch;
  const a = m?.assessments;
  const step = ready ? nextStep(m) : null;
  const focus = ready ? studyFocus(m) : null;
  const next = ready ? upNext(m) : [];
  const perf = ready ? performance(m, perfTab) : null;
  const lbScope = m?.leaderboard?.scope === 'college' ? 'College leaderboard' : 'Department leaderboard';

  const lbItems = m?.leaderboard?.items || [];
  const lbTop = lbItems.slice(0, 3);
  const lbMe = lbItems.find((r) => r.isMe);
  const lbRows = lbMe && !lbTop.some((r) => r.isMe) ? [...lbTop, lbMe] : lbTop;

  const onTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = PERF_TABS.findIndex((t) => t.value === perfTab);
    const nextTab = PERF_TABS[(i + (e.key === 'ArrowRight' ? 1 : PERF_TABS.length - 1)) % PERF_TABS.length];
    setPerfTab(nextTab.value);
    requestAnimationFrame(() => document.getElementById(`shb-tab-${nextTab.value}`)?.focus());
  };

  return (
    <div className={`shb animate-fade-in${isLoading ? ' is-loading' : ''}`} aria-busy={isLoading}>
      <p className="shb-greet">
        {ready ? (
          <>
            <b>{m.name ? `Hi ${m.name},` : 'Hi,'}</b> here is where you stand today.
            {m.deptName || m.collegeName ? <span>{[m.deptName, m.collegeName].filter(Boolean).join(' · ')}</span> : null}
          </>
        ) : <span className="sb-skel shb-greet-skel" aria-hidden="true" />}
      </p>

      {error && !m ? (
        <SectionState
          tone="err"
          title="Could not load your dashboard"
          action={(
            <button type="button" className="text-link shb-retry" onClick={() => reload().catch(() => {})}>
              Try again
            </button>
          )}
        >
          {apiErrorMessage(error, 'Please try again in a moment.')}
        </SectionState>
      ) : null}

      <div className="shb-grid">
        {/* ---------- Main column ---------- */}
        <div className="shb-col shb-col--main">
          {/* Performance card: text tabs, ring, note, semester figures */}
          <section className="shb-card shb-perf" aria-labelledby="shb-perf-h">
            <h3 id="shb-perf-h" className="sr-only">Performance</h3>
            <div className="sb-tabs" role="tablist" aria-label="Performance view" onKeyDown={onTabKey}>
              {PERF_TABS.map((t) => (
                <button
                  key={t.value}
                  id={`shb-tab-${t.value}`}
                  type="button"
                  role="tab"
                  className="sb-tab"
                  aria-selected={perfTab === t.value}
                  aria-controls="shb-perf-panel"
                  tabIndex={perfTab === t.value ? 0 : -1}
                  onClick={() => setPerfTab(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div id="shb-perf-panel" role="tabpanel" aria-labelledby={`shb-tab-${perfTab}`} className="shb-perf-b">
              {perf ? (
                <>
                  <div className="shb-perf-main">
                    <div className="shb-ring">
                      <ScoreRing score={perf.quiz ?? 0} size={112} strokeWidth={9} color={TEAL} suffix={perf.quiz != null ? '%' : ''} label={perf.quiz != null ? `Assessment score ${perf.quiz}%` : 'No assessment score yet'} />
                      <span>Assessment score</span>
                    </div>
                    <div className="shb-perf-copy">
                      <p className="shb-perf-note">{perfNote(perf)}</p>
                      {/* The ring already shows the score; only say what it is based on. */}
                      <p className="shb-perf-basis">{perf.quizNote}</p>
                    </div>
                  </div>
                  <div className="sb-stats shb-stats" aria-label="This semester">
                    <div className="sb-stat"><b>{w ? `${w.finished}/${w.total}` : '—'}</b><span>Lectures watched</span></div>
                    <i className="sb-rule" aria-hidden="true" />
                    <div className="sb-stat"><b>{a ? `${a.done}/${a.total}` : '—'}</b><span>Assessments done</span></div>
                    <i className="sb-rule" aria-hidden="true" />
                    <div className="sb-stat"><b>{a?.locked ?? 0}</b><span>Locked assessments</span></div>
                  </div>
                </>
              ) : <RowsSkeleton rows={2} h={56} />}
            </div>
          </section>

          {/* Subjects as skill rows */}
          <section className="shb-card shb-subj" aria-labelledby="shb-subj-h">
            <SectionHead id="shb-subj-h" title="My subjects" sub="Lectures watched and your average assessment score" action={ready && m.subjects?.length ? more('All subjects', SUBJECTS) : null} />
            {isLoading ? <RowsSkeleton rows={2} h={52} /> : m?.subjects?.length ? (
              <MetricList
                label="My subjects: lectures watched"
                className="shb-metrics"
                items={m.subjects.map((s) => ({
                  key: s.key,
                  label: s.name,
                  href: `${SUBJECTS}?s=${encodeURIComponent(s.key)}`,
                  color: subjectColor(s.key),
                  sub: `${s.watchedCount}/${s.chapterCount} watched · ${s.avgScore != null ? `Avg ${pct(s.avgScore)}` : `${s.quizDone}/${s.chapterCount} assessments`}`,
                  value: s.completion ?? 0,
                  display: `${s.completion ?? 0}%`,
                }))}
              />
            ) : (
              <p className="sb-empty">No subjects yet. They appear once lectures are published for your department.</p>
            )}
          </section>

          {/* Up next: stacked white rows on the canvas */}
          <section className="shb-sec shb-upnext" aria-labelledby="shb-next-h">
            <SectionHead id="shb-next-h" title="Up next" sub="Assessments and lectures waiting for you" />
            {isLoading ? <RowsSkeleton rows={2} /> : next.length ? (
              <div className="sb-rows">
                {next.map((x) => (
                  <Link key={x.key} className="sb-row shb-row" href={x.href}>
                    <span className="shb-row-ic" aria-hidden="true"><Icon name={x.icon} size={18} /></span>
                    <span className="shb-row-main">
                      <span className="sb-row__title">{x.title}</span>
                      <span className="sb-row__sub"><i className="sb-dot" aria-hidden="true" />{x.meta.filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="shb-row-act">{x.label}</span>
                    <Chev />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="shb-card">
                <p className="sb-empty">
                  {a?.locked
                    ? `You are all caught up. Finish watching ${a.locked} lecture${a.locked === 1 ? '' : 's'} to unlock ${a.locked === 1 ? 'its' : 'their'} assessment.`
                    : 'You are all caught up. New lectures and assessments appear here.'}
                </p>
              </div>
            )}
          </section>

        </div>

        {/* ---------- Side column ---------- */}
        <div className="shb-col shb-col--side">
          <section className="shb-card shb-next" aria-labelledby="shb-step-h">
            <span className="shb-over">Your next step</span>
            {step ? (
              <>
                <div className="shb-next-t">
                  <span className="shb-circle" aria-hidden="true"><Icon name={step.icon} size={20} /></span>
                  <div>
                    <h3 id="shb-step-h">{step.title}</h3>
                    <p>{step.lead}</p>
                  </div>
                </div>
                <p className="shb-meta">{step.meta.filter(Boolean).join(' · ')}</p>
                <div className="shb-actions">
                  <Link className="shb-btn shb-btn--primary" href={step.cta.href}>
                    <Icon name={step.cta.icon} size={16} /> {step.cta.label}
                  </Link>
                  <Link className="shb-btn" href={step.alt.href}>{step.alt.label}</Link>
                </div>
              </>
            ) : <RowsSkeleton rows={3} h={20} />}
          </section>

          <section className="shb-card shb-focus" aria-labelledby="shb-focus-h">
            <div className="shb-next-t">
              <span className="shb-circle" aria-hidden="true"><Icon name="target" size={20} /></span>
              <div>
                <span className="shb-over">Study focus</span>
                <h3 id="shb-focus-h">{focus ? focus.title : ' '}</h3>
              </div>
            </div>
            {focus ? (
              <>
                {focus.lines.map((line) => <p key={line} className="shb-line">{line}</p>)}
                <div className="shb-actions">
                  <Link className="shb-btn" href={focus.primary.href}>
                    <Icon name={focus.primary.icon} size={16} /> {focus.primary.label}
                  </Link>
                  <Link className="shb-btn" href={focus.tutor || SUBJECTS}>
                    <Icon name="chat" size={16} /> Ask AI tutor
                  </Link>
                </div>
              </>
            ) : <RowsSkeleton rows={2} h={20} />}
          </section>

          <section className="shb-card shb-lb" aria-labelledby="shb-lb-h">
            <SectionHead id="shb-lb-h" title={lbScope} sub="Ranked by average assessment score" action={ready ? more('Full board', '/student/leaderboard') : null} />
            {isLoading ? <RowsSkeleton rows={3} h={44} /> : lbRows.length ? (
              <ol className="shb-rank" aria-label="Leaderboard snapshot">
                {lbRows.map((r) => (
                  <li key={`${r.rank}-${r.name}`} className={r.isMe ? 'is-me' : undefined}>
                    <span className="shb-rank-n">{r.rank}</span>
                    <span className="shb-rank-who">
                      <b>{r.name}{r.isMe ? ' (you)' : ''}</b>
                      <small>{r.attemptCount} assessment{r.attemptCount === 1 ? '' : 's'}{r.avgScore != null ? ' · ' : ''}{r.avgScore != null ? <BandPill score={r.avgScore} /> : null}</small>
                    </span>
                    <b className="shb-rank-v">{pct(r.avgScore)}</b>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="sb-empty">{m?.leaderboard?.note || 'No rankings yet. They appear after you and your classmates submit chapter assessments.'}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
