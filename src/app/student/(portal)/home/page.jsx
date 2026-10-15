'use client';

import Link from 'next/link';
import { Icon, SectionState } from '@/components/student/ui';
import { BandPill, TrendChart, bandFor } from '@/components/shared/data-viz';
import ScoreRing from '@/components/shared/ScoreRing';
import { subjectColor, subjectTileStyle } from '@/components/student/subjectColor';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { loadStudentHomeData } from '@/components/student/studentHome';
import '@/styles/student-dashboard.css';

/**
 * Student Dashboard (redesign spec student.md §1, 14 Oct 2026) — "what next", six cards:
 *   1. Next-step hero (the one orange action) + This semester
 *   2. Subjects (subject colour, watch bar, score band) + Study focus (teal side panel)
 *   3. Up next + Leaderboard snapshot (rank colours)
 *   4. Interview history (+ score trend when there are 2 or more)
 * Live student APIs only (lib/student/dashboardModel.js) — empty sections say so, never mocked.
 * While loading, cards show skeletons: no fallback buttons or "nothing yet" copy.
 */

const SUBJECTS = '/student/subjects';
/** Single-series trends: teal line, orange markers (design-system §2b Charts). */
const TEAL = '#0E5C6B';
const INTERVIEWS = '/student/interviews';

function pct(n) {
  return n != null && n !== '' && Number.isFinite(Number(n)) ? `${Math.round(Number(n))}%` : '—';
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
      cta: { label: cl.watchPercent > 0 ? 'Resume lecture' : 'Start lecture', href: cl.href || SUBJECTS, icon: 'play' },
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

/** Study focus card copy + actions (each deep-links to its own chapter). */
function studyFocus(m) {
  const latest = m?.trend?.length ? m.trend[m.trend.length - 1] : null;
  const fallbackTutor = m?.chapterWatch?.[0]?.tutorHref || SUBJECTS;
  if (latest) {
    const row = m?.chapterWatch?.find((c) => c.jobId === latest.jobId);
    return {
      title: 'Review your latest assessment',
      lines: [
        `Your latest quiz score is ${latest.score}%.`,
        bandFor(latest.score) === 'strong'
          ? 'Strong work. Keep going with the next chapter while it is fresh.'
          : 'Revisit the chapter lecture or ask the AI tutor before your next assessment.',
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

/** Up next: open assessments, the lecture to continue and open interview assignments (max 4). */
function upNext(m) {
  const out = [];
  (m?.assessmentsReady || []).slice(0, 2).forEach((r) => out.push({
    key: `q-${r.jobId}`, icon: 'check', title: r.title, meta: ['Assessment ready', r.subject], label: 'Take', href: r.href, color: subjectColor(m?.chapterWatch?.find((c) => c.jobId === r.jobId)?.subjectKey),
  }));
  const cl = m?.continueLearning;
  if (cl && cl.watchPercent < 100) {
    out.push({
      key: `w-${cl.jobId}`, icon: 'play', title: cl.title, meta: [cl.watchPercent > 0 ? `${cl.watchPercent}% watched` : 'Not started', cl.subject], label: cl.watchPercent > 0 ? 'Resume' : 'Watch', href: cl.href || SUBJECTS, color: subjectColor(cl.subjectKey),
    });
  }
  (m?.assignments || []).filter((a) => a.status === 'Open').forEach((a) => out.push({
    key: `i-${a.id}`, icon: 'mic', title: a.title, meta: [`${a.mode} interview`, a.dueShort ? `Due ${a.dueShort}` : 'Assigned'], label: 'Open', href: a.href, color: 'var(--teal-500)',
  }));
  return out.slice(0, 4);
}

function Skeleton({ rows = 3 }) {
  return (
    <div className="sh-skel" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <span key={i} />)}
    </div>
  );
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

function CardHead({ id, title, sub, action }) {
  return (
    <div className="sh-card-h">
      <div className="sh-card-t">
        <h3 id={id}>{title}</h3>
        {sub ? <p>{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

const more = (label, href) => (
  <Link className="sd-btn sd-btn--ghost sd-btn--sm" href={href}>{label} <Icon name="chev" size={14} /></Link>
);

/** Leaderboard snapshot rows with real ranks (ties share a rank), RankList styling. */
function RankRows({ rows }) {
  return (
    <ol className="dv-rank" aria-label="Leaderboard snapshot">
      {rows.map((r) => {
        const tier = r.rank === 1 ? 'r1' : r.rank === 2 ? 'r2' : r.rank === 3 ? 'r3' : 'rn';
        return (
          <li key={`${r.rank}-${r.name}`} className={r.isMe ? 'sh-rank-me' : undefined}>
            <span className={`dv-rank-n dv-rank-n--${tier}`}>{r.rank}</span>
            <span className="dv-rank-who">
              <b>{r.name}{r.isMe ? ' (you)' : ''}</b>
              <small>{r.attemptCount} assessment{r.attemptCount === 1 ? '' : 's'}</small>
            </span>
            {r.avgScore != null ? <BandPill score={r.avgScore} /> : <span />}
            <b className="dv-rank-v">{pct(r.avgScore)}</b>
          </li>
        );
      })}
    </ol>
  );
}

export default function StudentHomePage() {
  const { data: m, loading, error, reload } = useAsyncResource(loadStudentHomeData, []);
  const isLoading = loading && !m;
  const ready = Boolean(m);

  const w = m?.watch;
  const a = m?.assessments;
  const step = ready ? nextStep(m) : null;
  const focus = ready ? studyFocus(m) : null;
  const next = ready ? upNext(m) : [];
  const lbScope = m?.leaderboard?.scope === 'college' ? 'College leaderboard' : 'Department leaderboard';

  const lbItems = m?.leaderboard?.items || [];
  const lbTop = lbItems.slice(0, 3);
  const lbMe = lbItems.find((r) => r.isMe);
  const lbRows = lbMe && !lbTop.some((r) => r.isMe) ? [...lbTop, lbMe] : lbTop;

  const interviews = (m?.interviewRows || []).slice(0, 4);
  const interviewTrend = (m?.interviewRows || [])
    .filter((r) => r.score != null)
    .slice(0, 8)
    .reverse()
    .map((r, i) => ({ label: r.date || `#${i + 1}`, score: r.score }));

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

      {/* ---------- 1. Next step + this semester ---------- */}
      <section className="sh-row sh-row--top">
        <div className="sh-hero">
          <div className="sh-hero-copy">
            <span className="sh-hero-over">Your next step</span>
            {step ? (
              <>
                <h2>{step.title}</h2>
                <p className="sh-hero-lead">{step.lead}</p>
                <p className="sh-hero-meta">{step.meta.filter(Boolean).join(' · ')}</p>
                <div className="sh-hero-cta">
                  <Link className="sd-btn sd-btn--amber" href={step.cta.href}>
                    <Icon name={step.cta.icon} size={18} /> {step.cta.label}
                  </Link>
                  <Link className="sd-btn sd-btn--light" href={step.alt.href}>
                    {step.alt.label} <Icon name="chev" size={16} />
                  </Link>
                </div>
              </>
            ) : (
              <div className="sh-skel sh-skel--hero" aria-hidden="true"><span /><span /><span /></div>
            )}
          </div>
          <span className="sh-hero-ic" aria-hidden="true"><Icon name={step?.icon || 'play'} size={28} /></span>
        </div>

        <section className="sh-card sh-summary" aria-labelledby="sh-sum-h">
          <CardHead id="sh-sum-h" title="This semester" />
          <div className="sh-summary-grid">
            <div className="sh-stat">
              <span className="sh-stat-l">Chapters watched</span>
              <div className="sh-stat-ring">
                {w ? <ScoreRing score={w.percent} size={56} strokeWidth={6} tone="progress" suffix="%" label={`${w.percent}% of chapters watched`} /> : <span className="sh-skel-ring" aria-hidden="true" />}
                <b className="sh-stat-v">{w ? `${w.finished}/${w.total}` : '—'}</b>
              </div>
              <span className="sh-stat-s">{w ? (w.total ? 'Published chapters' : 'No chapters published yet') : ' '}</span>
            </div>
            <div className="sh-stat">
              <span className="sh-stat-l">Assessments done</span>
              <b className="sh-stat-v">{a ? `${a.done}/${a.available}` : '—'}</b>
              <span className="sh-stat-s">
                {a ? (a.best != null ? `Best score ${a.best}%` : a.locked ? `${a.locked} unlock after watching` : 'One attempt per chapter') : ' '}
              </span>
            </div>
            <div className="sh-stat">
              <span className="sh-stat-l">Average quiz score</span>
              <b className="sh-stat-v">{pct(a?.avg)}</b>
              {a ? <BandPill score={a.avg} label={a.avg == null ? 'No scores yet' : undefined} /> : <span className="sh-stat-s">{' '}</span>}
            </div>
          </div>
        </section>
      </section>

      {/* ---------- 2. Subjects + study focus ---------- */}
      <section className="sh-row sh-row--work">
        <section className="sh-card" aria-labelledby="sh-subj-h">
          <CardHead id="sh-subj-h" title="My subjects" sub="Chapters watched and your average quiz score" action={ready && m.subjects?.length ? more('All subjects', SUBJECTS) : null} />
          {isLoading ? <Skeleton rows={3} /> : m?.subjects?.length ? (
            <ul className="sh-list">
              {m.subjects.map((s) => {
                const color = subjectColor(s.key);
                return (
                  <li key={s.key} className="sh-subject">
                    <span className="sh-tile" style={subjectTileStyle(s.key)} aria-hidden="true"><Icon name="book" size={20} /></span>
                    <div className="sh-subject-main">
                      <div className="sh-subject-name">
                        <b>{s.name}</b>
                        <span>{s.watchedCount} of {s.chapterCount} chapter{s.chapterCount === 1 ? '' : 's'} watched</span>
                      </div>
                      <div className="sh-progress-bar">
                        <span className="sh-bar" aria-hidden="true"><i style={{ width: `${s.completion ?? 0}%`, background: color }} /></span>
                        <b>{s.completion ?? 0}%</b>
                      </div>
                    </div>
                    <div className="sh-metric">
                      <span>Average score</span>
                      <b>{pct(s.avgScore)}</b>
                      <BandPill score={s.avgScore} label={s.avgScore == null ? `${s.quizDone}/${s.quizAvailable || 0} quizzes` : undefined} />
                    </div>
                    <Link className="sd-btn sd-btn--outline sd-btn--sm" href={`${SUBJECTS}?subject=${encodeURIComponent(s.key)}`}>
                      View <Icon name="chev" size={16} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyCentered icon="book" title="No subjects yet">
              Your subjects appear once lectures are published for your department.
            </EmptyCentered>
          )}
        </section>

        <aside className="sh-focus" aria-labelledby="sh-focus-h">
          <div className="sh-focus-h">
            <span className="sh-focus-ic" aria-hidden="true"><Icon name="target" size={20} /></span>
            <h3 id="sh-focus-h">Study focus</h3>
          </div>
          {focus ? (
            <>
              <h4>{focus.title}</h4>
              {focus.lines.map((line) => <p key={line}>{line}</p>)}
              <div className="sh-focus-cta">
                <Link className="sd-btn sd-btn--light" href={focus.primary.href}>
                  <Icon name={focus.primary.icon} size={16} /> {focus.primary.label}
                </Link>
                <Link className="sd-btn sd-btn--glass" href={focus.tutor || SUBJECTS}>
                  <Icon name="chat" size={16} /> Ask AI tutor
                </Link>
              </div>
            </>
          ) : (
            <div className="sh-skel sh-skel--brand" aria-hidden="true"><span /><span /><span /></div>
          )}
        </aside>
      </section>

      {/* ---------- 3. Up next + leaderboard snapshot ---------- */}
      <section className="sh-row sh-row--pair">
        <section className="sh-card" aria-labelledby="sh-next-h">
          <CardHead id="sh-next-h" title="Up next" sub="Assessments, lectures and interviews waiting for you" />
          {isLoading ? <Skeleton rows={3} /> : next.length ? (
            <ul className="sh-list">
              {next.map((x) => (
                <li key={x.key} className="sh-line">
                  <span className="sh-line-dot" style={{ background: x.color }} aria-hidden="true" />
                  <span className="sh-line-ic" aria-hidden="true"><Icon name={x.icon} size={18} /></span>
                  <div className="sh-line-main">
                    <b>{x.title}</b>
                    <span>{x.meta.filter(Boolean).join(' · ')}</span>
                  </div>
                  <Link className="sd-btn sd-btn--outline sd-btn--sm" href={x.href}>{x.label} <Icon name="chev" size={14} /></Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyCentered icon="check" title="You are all caught up">
              {a?.locked
                ? `Finish watching ${a.locked} lecture${a.locked === 1 ? '' : 's'} to unlock ${a.locked === 1 ? 'its' : 'their'} assessment.`
                : 'New lectures, assessments and interview assignments appear here.'}
            </EmptyCentered>
          )}
        </section>

        <section className="sh-card" aria-labelledby="sh-lb-h">
          <CardHead
            id="sh-lb-h"
            title={lbScope}
            sub="Ranked by average assessment score"
            action={ready ? more('Full board', '/student/leaderboard') : null}
          />
          {isLoading ? <Skeleton rows={3} /> : lbRows.length ? (
            <RankRows rows={lbRows} />
          ) : (
            <EmptyCentered icon="trophy" title="No rankings yet">
              {m?.leaderboard?.note || 'Rankings appear after you and your classmates submit chapter quizzes.'}
            </EmptyCentered>
          )}
        </section>
      </section>

      {/* ---------- 4. Interview history ---------- */}
      <section className="sh-card" aria-labelledby="sh-ih-h">
        <CardHead
          id="sh-ih-h"
          title="Interview history"
          sub="Your scored mock and full sessions"
          action={ready && m.interviewRows?.length ? more('All reports', '/student/reports') : null}
        />
        {isLoading ? <Skeleton rows={2} /> : interviews.length ? (
          <div className={`sh-hist${interviewTrend.length >= 2 ? ' has-trend' : ''}`}>
            <ul className="sh-list">
              {interviews.map((r) => (
                <li key={r.id}>
                  <Link className="sh-line sh-line--link" href={`/student/reports/view?session=${encodeURIComponent(r.id)}`}>
                    <span className="sh-line-ic" aria-hidden="true"><Icon name="mic" size={18} /></span>
                    <div className="sh-line-main">
                      <b>{r.title}</b>
                      <span>{[r.mode === 'full' ? 'Full interview' : 'Mock interview', r.date].filter(Boolean).join(' · ')}</span>
                    </div>
                    <BandPill score={r.score} />
                    <b className="sh-line-score">{r.score != null ? <>{r.score}<small>/100</small></> : '—'}</b>
                  </Link>
                </li>
              ))}
            </ul>
            {interviewTrend.length >= 2 ? (
              <div className="sh-hist-trend">
                <span className="sh-hist-l">Score trend</span>
                <TrendChart data={interviewTrend} series={[{ key: 'score', name: 'Score', color: TEAL }]} height={200} suffix="/100" />
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyCentered icon="mic" title="No interviews completed">
            {m?.canSelfInterview ? 'Start a mock interview to see feedback here.' : 'Your interview reports appear here once you complete one.'}
          </EmptyCentered>
        )}
      </section>
    </div>
  );
}
