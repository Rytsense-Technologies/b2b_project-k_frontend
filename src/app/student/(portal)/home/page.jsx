'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon, SectionState } from '@/components/student/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { loadStudentHome } from '@/lib/student/dashboardModel';
import '@/styles/student-dashboard.css';

/**
 * Student Dashboard — owner mock-ups (Oct 2026):
 *   1. Next step hero + This semester summary
 *   2. Learning workspace (My subjects / Recent lectures) + Study focus
 *   3. Continue learning
 *   4. Learning activity: recent lectures, subject progress, department leaderboard,
 *      practice queue, assessments available, interview history
 * Live student APIs only (lib/student/dashboardModel.js) — empty sections say so, never mocked.
 */

const SUBJECTS = '/student/subjects';
const INTERVIEWS = '/student/interviews';
const CAT = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

function scoreTone(score) {
  if (score == null || score === '') return 'none';
  const n = Number(score);
  if (!Number.isFinite(n)) return 'none';
  if (n >= 75) return 'good';
  if (n >= 50) return 'mid';
  return 'low';
}

function pct(n) {
  return n != null && n !== '' && Number.isFinite(Number(n)) ? `${Math.round(Number(n))}%` : '—';
}

function assessmentHref(jobId, title) {
  return `/student/assessment?job=${encodeURIComponent(jobId)}&title=${encodeURIComponent(title || 'Chapter quiz')}`;
}

/** The single most useful next action, in priority order. */
function nextStep(m) {
  const assignment = m?.assignments?.find((a) => a.status === 'Open');
  if (assignment) {
    return {
      icon: 'mic',
      title: assignment.title,
      lead: 'Assigned by your department',
      meta: ['Practice interview', assignment.mode, assignment.department, assignment.dueShort ? `Due ${assignment.dueShort}` : null],
      cta: { label: `Start ${assignment.mode.toLowerCase()} interview`, href: INTERVIEWS, icon: 'mic' },
      alt: { label: 'Browse subjects', href: SUBJECTS },
    };
  }
  const cl = m?.continueLearning;
  if (cl && cl.watchPercent < 100) {
    return {
      icon: 'play',
      title: cl.title,
      lead: cl.watchPercent > 0 ? `You are ${cl.watchPercent}% through this lecture` : 'Your next lecture is ready',
      meta: ['Video lecture', cl.subject, cl.duration],
      cta: { label: cl.watchPercent > 0 ? 'Resume lecture' : 'Start lecture', href: SUBJECTS, icon: 'play' },
      alt: m?.canSelfInterview ? { label: 'Practice interview', href: INTERVIEWS } : { label: 'Browse subjects', href: SUBJECTS },
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
  if (!m?.canSelfInterview) {
    return {
      icon: 'play',
      title: m?.name ? `Welcome back, ${m.name}` : 'Welcome back',
      lead: 'Pick up a lecture or review your subjects',
      meta: ['My subjects', m?.deptName],
      cta: { label: 'Go to my subjects', href: SUBJECTS, icon: 'play' },
      alt: { label: 'See my progress', href: '/student/progress' },
    };
  }
  return {
    icon: 'mic',
    title: m?.name ? `Welcome back, ${m.name}` : 'Welcome back',
    lead: 'Keep your interview skills sharp',
    meta: ['Practice interview', 'Mock', m?.deptName],
    cta: { label: 'Start mock interview', href: INTERVIEWS, icon: 'mic' },
    alt: { label: 'Browse subjects', href: SUBJECTS },
  };
}

/** Study focus card copy + actions. */
function studyFocus(m) {
  const latest = m?.trend?.length ? m.trend[m.trend.length - 1] : null;
  if (latest) {
    const tone = scoreTone(latest.score);
    return {
      title: 'Review your latest assessment',
      lines: [
        `Your latest quiz score is ${latest.score}%.`,
        tone === 'good'
          ? 'Strong work. Keep going with the next chapter while it is fresh.'
          : 'Revisit the chapter lecture or ask the AI tutor before your next assessment.',
      ],
      primary: { label: 'Review chapter', href: SUBJECTS, icon: 'playFill' },
    };
  }
  const ready = m?.assessmentsReady?.[0];
  if (ready) {
    return {
      title: 'Take your next assessment',
      lines: [`${ready.title} is unlocked.`, 'One attempt, scored by Quirri. Ask the AI tutor first if anything is unclear.'],
      primary: { label: 'Take assessment', href: ready.href, icon: 'check' },
    };
  }
  const cl = m?.continueLearning;
  if (cl) {
    return {
      title: `Finish ${cl.title}`,
      lines: [`You are at ${cl.watchPercent}%.`, 'Watch the lecture to 100% to unlock its assessment.'],
      primary: { label: cl.watchPercent > 0 ? 'Resume lecture' : 'Start lecture', href: SUBJECTS, icon: 'playFill' },
    };
  }
  return {
    title: 'Nothing due right now',
    lines: ['New lectures and assessments appear here when your department publishes them.'],
    primary: { label: 'Browse subjects', href: SUBJECTS, icon: 'book' },
  };
}

function LectureStatus({ row }) {
  return (
    <div className="sh-status">
      {row.watchPercent >= 100 ? (
        <span className="sh-tag sh-tag--good"><Icon name="tick" size={12} /> Watched</span>
      ) : (
        <span className="sh-tag">{row.watchPercent}% watched</span>
      )}
      {row.quiz === 'done' ? <span className="sh-tag sh-tag--good"><Icon name="tick" size={12} /> Quiz completed</span> : null}
      {row.quiz === 'open' ? <span className="sh-tag sh-tag--teal">Quiz ready</span> : null}
      {row.quiz === 'watch_required' ? <span className="sh-tag"><Icon name="lock" size={12} /> Quiz locked</span> : null}
    </div>
  );
}

function lectureAction(row) {
  if (row.quiz === 'open') return { label: 'Take quiz', href: assessmentHref(row.jobId, row.title) };
  if (row.quiz === 'done') return { label: 'Review', href: SUBJECTS };
  return { label: row.watchPercent > 0 ? 'Resume' : 'Watch', href: SUBJECTS };
}

function EmptyCentered({ icon, title, children, action }) {
  return (
    <div className="sh-empty">
      <span className="sh-empty-ic" aria-hidden="true"><Icon name={icon} size={24} /></span>
      <b>{title}</b>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

function CardHead({ id, title, sub, action, icon }) {
  return (
    <div className="sh-card-h">
      {icon ? <span className="sh-card-ic" aria-hidden="true"><Icon name={icon} size={20} /></span> : null}
      <div className="sh-card-t">
        <h3 id={id}>{title}</h3>
        {sub ? <p>{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

const pill = (label, href, icon = 'chev') => (
  <Link className="sh-pillbtn" href={href}>{label} <Icon name={icon} size={14} /></Link>
);

export default function StudentHomePage() {
  const { data: m, loading, error, reload } = useAsyncResource(loadStudentHome, []);
  const [tab, setTab] = useState('subjects');
  const isLoading = loading && !m;

  const w = m?.watch;
  const a = m?.assessments;
  const step = nextStep(m);
  const focus = studyFocus(m);
  const cl = m?.continueLearning && m.continueLearning.watchPercent < 100 ? m.continueLearning : null;
  const latestBySubject = new Map();
  (m?.trend || []).forEach((t) => latestBySubject.set(t.subject, t.score));
  const openAssignments = (m?.assignments || []).filter((x) => x.status === 'Open');
  const lbScope = m?.leaderboard?.scope === 'department' ? 'Department leaderboard' : 'College leaderboard';

  const tabs = [
    { id: 'subjects', label: 'My subjects', icon: 'bookOpen' },
    { id: 'lectures', label: 'Recent lectures', icon: 'playCircle' },
  ];
  const onTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((t) => t.id === tab);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    setTab(next.id);
    document.getElementById(`sh-tab-${next.id}`)?.focus();
  };

  return (
    <div className={`sh animate-fade-in${isLoading ? ' is-loading' : ''}`} aria-busy={isLoading}>
      {error && !m ? (
        <SectionState
          tone="err"
          title="Could not load your dashboard"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {apiErrorMessage(error, 'Please try again in a moment.')}
        </SectionState>
      ) : null}

      {/* ---------- 1. Next step + semester summary ---------- */}
      <section className="sh-row sh-row--top">
        <div className="sh-hero">
          <div className="sh-hero-copy">
            <span className="sh-hero-over">Your next step</span>
            <h2>{isLoading ? 'Loading your next step…' : step.title}</h2>
            {!isLoading ? <p className="sh-hero-lead">{step.lead}</p> : null}
            {!isLoading ? <p className="sh-hero-meta">{step.meta.filter(Boolean).join(' · ')}</p> : null}
            <div className="sh-hero-cta">
              <Link className="sh-btn sh-btn--accent" href={step.cta.href}>
                <Icon name={step.cta.icon} size={18} /> {step.cta.label}
              </Link>
              <Link className="sh-btn sh-btn--light" href={step.alt.href}>
                {step.alt.label} <Icon name="chev" size={16} />
              </Link>
            </div>
          </div>
          <span className="sh-hero-ic" aria-hidden="true"><Icon name={step.icon} size={28} /></span>
        </div>

        <section className="sh-card sh-summary" aria-labelledby="sh-sum-h">
          <CardHead
            id="sh-sum-h"
            title="This semester summary"
            action={<span className="sh-chip"><Icon name="trend" size={14} /> This semester</span>}
          />
          <div className="sh-summary-grid">
            <div className="sh-stat">
              <span className="sh-stat-ic sh-stat-ic--c1"><Icon name="book" size={18} /></span>
              <span className="sh-stat-l">Chapters watched</span>
              <b className="sh-stat-v">{w ? `${w.finished}/${w.total}` : '—'}</b>
              <span className="sh-stat-s">{w?.total ? `${w.percent}% of published chapters` : 'No chapters published yet'}</span>
            </div>
            <div className="sh-stat">
              <span className="sh-stat-ic sh-stat-ic--c2"><Icon name="tick" size={18} /></span>
              <span className="sh-stat-l">Assessments completed</span>
              <b className="sh-stat-v">{a ? `${a.done}/${a.available}` : '—'}</b>
              <span className="sh-stat-s">
                {a?.best != null ? `Best score ${a.best}%` : a?.locked ? `${a.locked} unlock after watching` : 'One attempt per chapter'}
              </span>
            </div>
            <div className="sh-stat">
              <span className="sh-stat-ic sh-stat-ic--c3"><Icon name="bars" size={18} /></span>
              <span className="sh-stat-l">Average quiz score</span>
              <b className={`sh-stat-v sh-score--${scoreTone(a?.avg)}`}>{pct(a?.avg)}</b>
              <span className="sh-stat-s">{m?.deptName || 'Across your subjects'}</span>
            </div>
          </div>
        </section>
      </section>

      {/* ---------- 2. Learning workspace + study focus ---------- */}
      <section className="sh-row sh-row--work">
        <section className="sh-card" aria-labelledby="sh-ws-h">
          <CardHead id="sh-ws-h" title="Learning workspace" />
          <div className="sh-tabs" role="tablist" aria-label="Learning workspace">
            {tabs.map((t) => (
              <button
                key={t.id}
                id={`sh-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`sh-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                className="sh-tab"
                onClick={() => setTab(t.id)}
                onKeyDown={onTabKey}
              >
                <Icon name={t.icon} size={18} /> {t.label}
              </button>
            ))}
          </div>

          <div id="sh-panel-subjects" role="tabpanel" aria-labelledby="sh-tab-subjects" hidden={tab !== 'subjects'}>
            {m?.subjects?.length ? (
              <ul className="sh-list">
                {m.subjects.map((s, i) => {
                  const latest = latestBySubject.get(s.name);
                  return (
                    <li key={s.key} className="sh-subject">
                      <span className={`sh-tile sh-tile--${CAT[i % CAT.length]}`} aria-hidden="true"><Icon name="book" size={20} /></span>
                      <div className="sh-subject-name">
                        <b>{s.name}</b>
                        <span>{s.chapterCount} chapter{s.chapterCount === 1 ? '' : 's'}</span>
                      </div>
                      <div className="sh-metric">
                        <span>Learning completion</span>
                        <b>{s.watchedCount}/{s.chapterCount}</b>
                        <small>{s.completion ?? 0}% watched</small>
                      </div>
                      <div className="sh-metric">
                        <span>Latest quiz score</span>
                        <b className={`sh-score--${scoreTone(latest ?? s.avgScore)}`}>{pct(latest ?? s.avgScore)}</b>
                        <small>{s.quizDone}/{s.quizAvailable || 0} quizzes</small>
                      </div>
                      <Link className="sh-btn sh-btn--outline sh-btn--sm" href={`${SUBJECTS}?subject=${encodeURIComponent(s.key)}`}>
                        View subject <Icon name="chev" size={16} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyCentered icon="book" title={isLoading ? 'Loading subjects…' : 'No subjects yet'}>
                {isLoading ? null : 'Your subjects appear once lectures are published for your department.'}
              </EmptyCentered>
            )}
          </div>

          <div id="sh-panel-lectures" role="tabpanel" aria-labelledby="sh-tab-lectures" hidden={tab !== 'lectures'}>
            {m?.recentLectures?.length ? (
              <ul className="sh-list">
                {m.recentLectures.map((l) => {
                  const act = lectureAction(l);
                  return (
                    <li key={l.jobId} className="sh-subject">
                      <span className="sh-tile sh-tile--c6" aria-hidden="true"><Icon name="play" size={20} /></span>
                      <div className="sh-subject-name">
                        <b>{l.title}</b>
                        <span>{[l.subject, l.duration, l.published].filter(Boolean).join(' · ')}</span>
                      </div>
                      <LectureStatus row={l} />
                      <div className="sh-metric">
                        <span>Quiz score</span>
                        <b className={`sh-score--${scoreTone(l.score)}`}>{pct(l.score)}</b>
                      </div>
                      <Link className="sh-btn sh-btn--outline sh-btn--sm" href={act.href}>
                        {act.label} <Icon name="chev" size={16} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyCentered icon="play" title={isLoading ? 'Loading lectures…' : 'Nothing published yet'}>
                {isLoading ? null : 'Lectures appear here after your HOD or faculty publishes them for your department.'}
              </EmptyCentered>
            )}
          </div>
        </section>

        <aside className="sh-card sh-focus" aria-labelledby="sh-focus-h">
          <span className="sh-focus-ic" aria-hidden="true"><Icon name="target" size={22} /></span>
          <div className="sh-focus-body">
            <h3 id="sh-focus-h">Study focus</h3>
            <h4>{isLoading ? 'Checking your progress…' : focus.title}</h4>
            {!isLoading ? focus.lines.map((line) => <p key={line}>{line}</p>) : null}
            <div className="sh-focus-cta">
              <Link className="sh-btn sh-btn--teal sh-btn--block" href={focus.primary.href}>
                <Icon name={focus.primary.icon} size={16} /> {focus.primary.label}
              </Link>
              <Link className="sh-btn sh-btn--outline sh-btn--block" href={SUBJECTS}>
                <Icon name="chat" size={16} /> Ask AI tutor
              </Link>
            </div>
          </div>
        </aside>
      </section>

      {/* ---------- Learning activity: paired rows, equal heights ---------- */}
      <section className="sh-row sh-row--pair">
          <section className="sh-card" aria-labelledby="sh-rl-h">
            <CardHead
              id="sh-rl-h"
              title="Recent lectures"
              sub="Latest published chapters for your department"
              action={pill('View all subjects', SUBJECTS)}
            />
            {m?.recentLectures?.length ? (
              <div className="sh-table-wrap">
                <table className="sh-table">
                  <thead>
                    <tr><th>Chapter</th><th>Subject</th><th>Status</th><th className="num">Quiz score</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {m.recentLectures.map((l) => {
                      const act = lectureAction(l);
                      return (
                        <tr key={l.jobId}>
                          <td data-label="Chapter">
                            <b>{l.title}</b>
                            <small className="sh-meta">
                              {l.duration ? <><Icon name="clock" size={12} /> {l.duration}</> : null}
                              {l.duration && l.published ? ' · ' : ''}
                              {l.published ? `Published ${l.published}` : ''}
                            </small>
                          </td>
                          <td data-label="Subject">{l.subject}</td>
                          <td data-label="Status"><LectureStatus row={l} /></td>
                          <td data-label="Quiz score" className={`num sh-score--${scoreTone(l.score)}`}><b>{pct(l.score)}</b></td>
                          <td data-label="Action">
                            <Link className="sh-btn sh-btn--outline sh-btn--sm" href={act.href}>{act.label} <Icon name="chev" size={14} /></Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyCentered icon="play" title={isLoading ? 'Loading lectures…' : 'Nothing published yet'}>
                {isLoading ? null : 'Lectures appear here after your HOD or faculty publishes them for your department.'}
              </EmptyCentered>
            )}
          </section>

          <section className="sh-card" aria-labelledby="sh-pq-h">
            <CardHead id="sh-pq-h" title="Practice queue" sub="Your next interview practice" />
            {openAssignments.length ? (
              <ul className="sh-list">
                {openAssignments.slice(0, 3).map((x) => (
                  <li key={x.id} className="sh-queue">
                    <span className="sh-queue-ic" aria-hidden="true"><Icon name="mic" size={20} /></span>
                    <div className="sh-queue-main">
                      <b>{x.title}</b>
                      <span>{[x.mode, x.department, x.dueShort ? `Due ${x.dueShort}` : null].filter(Boolean).join(' · ')}</span>
                    </div>
                    <span className="sh-queue-tag">Assigned</span>
                    <Link className="sh-btn sh-btn--accent sh-btn--sm sh-queue-cta" href={x.href}>
                      <Icon name="mic" size={16} /> Start {x.mode.toLowerCase()} interview
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyCentered
                icon="mic"
                title={isLoading ? 'Loading assignments…' : 'No interview assigned'}
                action={!isLoading && m?.canSelfInterview ? pill('Practise a mock anyway', INTERVIEWS) : null}
              >
                {isLoading ? null : m?.canSelfInterview
                  ? 'When your department assigns a mock or full interview, it shows up here.'
                  : 'AI interviews open in your final year. If your faculty assigns one earlier, it shows up here.'}
              </EmptyCentered>
            )}
          </section>
      </section>

      <section className="sh-row sh-row--pair">
          <section className="sh-card" aria-labelledby="sh-sp-h">
            <CardHead id="sh-sp-h" title="Subject progress" sub="Chapters watched per subject" />
            {m?.subjects?.length ? (
              <ul className="sh-list">
                {m.subjects.map((s, i) => (
                  <li key={s.key} className="sh-progress">
                    <span className={`sh-tile sh-tile--${CAT[i % CAT.length]}`} aria-hidden="true"><Icon name="book" size={20} /></span>
                    <div className="sh-progress-main">
                      <b>{s.name}</b>
                      <span>{s.watchedCount} of {s.chapterCount} chapters watched</span>
                      <div className="sh-progress-bar">
                        <span className="sh-bar" aria-hidden="true"><i style={{ width: `${s.completion ?? 0}%` }} /></span>
                        <b>{s.completion ?? 0}%</b>
                      </div>
                    </div>
                    <div className="sh-progress-side">
                      <span>Average quiz score</span>
                      <b className={`sh-score--${scoreTone(s.avgScore)}`}>{pct(s.avgScore)}</b>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyCentered icon="book" title={isLoading ? 'Loading subjects…' : 'No subjects yet'}>
                {isLoading ? null : 'Progress appears once lectures are published for your department.'}
              </EmptyCentered>
            )}
          </section>

          <section className="sh-card" aria-labelledby="sh-aa-h">
            <CardHead id="sh-aa-h" title="Assessments available" />
            {m?.assessmentsReady?.length ? (
              <ul className="sh-list">
                {m.assessmentsReady.map((r) => (
                  <li key={r.jobId} className="sh-line">
                    <span className="sh-tile sh-tile--c2" aria-hidden="true"><Icon name="check" size={18} /></span>
                    <div className="sh-line-main"><b>{r.title}</b><span>{r.subject}</span></div>
                    <Link className="sh-btn sh-btn--outline sh-btn--sm" href={r.href}>Take <Icon name="chev" size={14} /></Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyCentered
                icon="doc"
                title={isLoading ? 'Checking quizzes…' : 'No new assessments available'}
                action={!isLoading ? pill('Browse subjects', SUBJECTS) : null}
              >
                {isLoading
                  ? null
                  : a?.locked
                    ? `Finish watching ${a.locked} lecture${a.locked === 1 ? '' : 's'} to unlock ${a.locked === 1 ? 'its' : 'their'} assessment.`
                    : 'Finish a published lecture to unlock its assessment.'}
              </EmptyCentered>
            )}
          </section>
      </section>

      <section className="sh-row sh-row--pair">
          <section className="sh-card" aria-labelledby="sh-lb-h">
            <CardHead
              id="sh-lb-h"
              title={lbScope}
              sub="Based on available assessment results."
              action={pill('Full board', '/student/leaderboard')}
            />
            {m?.leaderboard?.items?.length ? (
              <div className="sh-table-wrap">
                <table className="sh-table">
                  <thead>
                    <tr><th className="num sh-rank">#</th><th>Student</th><th>Assessments</th><th className="num">Average quiz score</th></tr>
                  </thead>
                  <tbody>
                    {m.leaderboard.items.slice(0, 5).map((r) => (
                      <tr key={`${r.rank}-${r.name}`} className={r.isMe ? 'is-me' : ''}>
                        <td data-label="Rank" className="num sh-rank">{r.rank}</td>
                        <td data-label="Student"><b>{r.name}{r.isMe ? ' (you)' : ''}</b></td>
                        <td data-label="Assessments">{r.attemptCount} assessment{r.attemptCount === 1 ? '' : 's'}</td>
                        <td data-label="Average quiz score" className={`num sh-score--${scoreTone(r.avgScore)}`}><b>{pct(r.avgScore)}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyCentered icon="trophy" title={isLoading ? 'Loading rankings…' : 'No rankings yet'}>
                {isLoading ? null : (m?.leaderboard?.note || 'Rankings appear after you and your classmates submit chapter quizzes.')}
              </EmptyCentered>
            )}
          </section>

          <section className="sh-card" aria-labelledby="sh-ih-h">
            <CardHead
              id="sh-ih-h"
              title="Interview history"
              sub="Your scored mock and full sessions"
              action={m?.interviewRows?.length ? pill('All reports', '/student/reports') : null}
            />
            {m?.interviewRows?.length ? (
              <ul className="sh-list">
                {m.interviewRows.slice(0, 4).map((r) => (
                  <li key={r.id}>
                    <Link className="sh-line sh-line--link" href={`/student/reports/view?session=${encodeURIComponent(r.id)}`}>
                      <span className="sh-tile sh-tile--c6" aria-hidden="true"><Icon name="mic" size={18} /></span>
                      <div className="sh-line-main">
                        <b>{r.title}</b>
                        <span>{[r.mode === 'full' ? 'Full interview' : 'Mock interview', r.date].filter(Boolean).join(' · ')}</span>
                      </div>
                      <b className={`sh-line-score sh-score--${scoreTone(r.score)}`}>{r.score ?? '—'}<small>/100</small></b>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyCentered icon="mic" title={isLoading ? 'Loading interviews…' : 'No interviews completed'}>
                {isLoading ? null : openAssignments.length ? 'Complete your assigned mock to see feedback here.' : 'Start a mock interview to see feedback here.'}
              </EmptyCentered>
            )}
          </section>
      </section>

      {/* ---------- 3. Continue learning ---------- */}
      <section className="sh-card" aria-labelledby="sh-cl-h">
        <CardHead id="sh-cl-h" icon="bookOpen" title="Continue learning" sub="Resume the lecture you left unfinished" />
        {cl ? (
          <div className="sh-resume">
            <span className="sh-tile sh-tile--c6" aria-hidden="true"><Icon name="play" size={20} /></span>
            <div className="sh-resume-main">
              <b>{cl.title}</b>
              <span>{[cl.subject, cl.duration, `${cl.watchPercent}% watched`].filter(Boolean).join(' · ')}</span>
              <span className="sh-bar" aria-hidden="true"><i style={{ width: `${cl.watchPercent}%` }} /></span>
            </div>
            <Link className="sh-btn sh-btn--outline sh-btn--sm" href={SUBJECTS}>
              {cl.watchPercent > 0 ? 'Resume' : 'Start'} <Icon name="chev" size={16} />
            </Link>
          </div>
        ) : (
          <div className="sh-dashed">
            <Icon name="bookOpen" size={26} />
            <b>{isLoading ? 'Loading lectures…' : 'No unfinished lectures'}</b>
            {!isLoading ? <p>Lectures appear here after your HOD or faculty publishes them for your department.</p> : null}
            {!isLoading ? pill('Browse published lectures', SUBJECTS) : null}
          </div>
        )}
      </section>
    </div>
  );
}
