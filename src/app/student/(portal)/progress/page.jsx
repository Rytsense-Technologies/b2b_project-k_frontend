'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import PerformanceChart from '@/components/student/dashboard/PerformanceChart';
import { Icon, SectionState } from '@/components/student/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useUrlState } from '@/hooks/useUrlState';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { loadStudentHome, scoreBand } from '@/lib/student/dashboardModel';
import { assessmentHref, classroomHref, SUBJECTS_PATH } from '@/lib/student/learning';
import '@/styles/student-progress.css';

/**
 * My progress — owner mock-ups (Oct 2026): Overview + Details tabs.
 *   Overview: KPI strip · learning record + assessment history · recommended next step · interview practice
 *   Details:  per-subject completion / performance · chapter table · chronological learning record ·
 *             assessment review · interview practice
 * Tab and subject live in the query string (?tab=details&subject=…). Live student APIs only.
 */

const INTERVIEWS = '/student/interviews';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
];

const pct = (n) => (n != null && n !== '' && Number.isFinite(Number(n)) ? `${Math.round(Number(n))}%` : '—');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const tone = (score) => scoreBand(score).key;
const reportHref = (id) => `/student/reports/view?session=${encodeURIComponent(id)}`;
const jobOf = (row) => ({ job_id: row.jobId, chapter_title: row.title });
const toTime = (iso) => Date.parse(iso || '') || 0;

/* ------------------------------------------------------------------ next step */
/** One recommended action from the student's own data (latest result first). */
function nextStep(m) {
  const rows = m?.chapterRows || [];
  const latest = m?.trend?.length ? m.trend[m.trend.length - 1] : null;
  const latestRow = latest ? rows.find((r) => r.jobId === latest.jobId) : null;
  const open = rows.find((r) => r.quiz === 'open');
  const watching = rows.find((r) => r.watchPercent > 0 && !r.watchComplete);
  const unwatched = rows.find((r) => r.watchPercent === 0);

  if (latestRow && latest.score < 75) {
    return {
      icon: 'bookOpen',
      title: 'Review your assessment',
      body: latestRow.watchComplete
        ? 'You’ve finished the lecture. Review the answers to strengthen your understanding.'
        : 'Go through the answers you missed, then rewatch the parts that tripped you up.',
      primary: { label: 'Review answers', icon: 'doc', href: assessmentHref(jobOf(latestRow), latestRow.subjectKey, { view: 'review' }) },
      links: [
        { label: 'Rewatch lecture', icon: 'playCircle', href: classroomHref(latestRow.subjectKey, latestRow.jobId) },
        { label: 'Ask AI tutor', icon: 'chat', href: classroomHref(latestRow.subjectKey, latestRow.jobId, 'tutor') },
      ],
    };
  }
  if (open) {
    return {
      icon: 'clip',
      title: 'Take your assessment',
      body: `${open.title} is unlocked. One attempt, scored by Quirri.`,
      primary: { label: 'Take assessment', icon: 'clip', href: assessmentHref(jobOf(open), open.subjectKey) },
      links: [
        { label: 'Revise the lecture', icon: 'playCircle', href: classroomHref(open.subjectKey, open.jobId) },
        { label: 'Ask AI tutor', icon: 'chat', href: classroomHref(open.subjectKey, open.jobId, 'tutor') },
      ],
    };
  }
  const resume = watching || unwatched;
  if (resume) {
    return {
      icon: 'playCircle',
      title: watching ? 'Finish your lecture' : 'Start your next lecture',
      body: watching
        ? `You’re ${resume.watchPercent}% through ${resume.title}. Finish it to unlock the assessment.`
        : `${resume.title} is ready. Watch it to unlock its assessment.`,
      primary: { label: watching ? 'Resume lecture' : 'Start lecture', icon: 'play', href: classroomHref(resume.subjectKey, resume.jobId) },
      links: [{ label: 'Ask AI tutor', icon: 'chat', href: classroomHref(resume.subjectKey, resume.jobId, 'tutor') }],
    };
  }
  if (rows.length) {
    return {
      icon: 'mic',
      title: 'Put it into practice',
      body: 'Your lectures and assessments are up to date. A mock interview turns what you learned into answers.',
      primary: { label: 'Start mock interview', icon: 'mic', href: INTERVIEWS },
      links: latestRow ? [{ label: 'Review your last assessment', icon: 'doc', href: assessmentHref(jobOf(latestRow), latestRow.subjectKey, { view: 'review' }) }] : [],
    };
  }
  return {
    icon: 'book',
    title: 'Your progress starts here',
    body: 'When your faculty publish a lecture, watch it and take its assessment to see your progress.',
    primary: { label: 'Go to My subjects', icon: 'book', href: SUBJECTS_PATH },
    links: [],
  };
}

/* ------------------------------------------------------------------ small parts */
function StatusPill({ row }) {
  if (row.watchComplete) return <span className="spg-pill spg-pill--good"><Icon name="tick" size={14} /> Watched</span>;
  if (row.watchPercent > 0) return <span className="spg-pill spg-pill--teal">{row.watchPercent}% watched</span>;
  return <span className="spg-pill">Not started</span>;
}

function ScoreChip({ score }) {
  return <span className={`spg-score spg-score--${tone(score)}`}>{pct(score)}</span>;
}

function Empty({ icon, title, children, action }) {
  return (
    <div className="spg-empty">
      <span className="spg-empty-ic" aria-hidden="true"><Icon name={icon} size={22} /></span>
      <b>{title}</b>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

/** Assessment cell + action for one chapter (Details table). */
function chapterAction(row) {
  if (row.quiz === 'done') {
    return { cell: <ScoreChip score={row.score} />, action: { label: 'Review', href: assessmentHref(jobOf(row), row.subjectKey, { view: 'review' }) } };
  }
  if (row.quiz === 'open') {
    return { cell: <span className="spg-muted-strong">Unlocked</span>, action: { label: 'Take', href: assessmentHref(jobOf(row), row.subjectKey), accent: true } };
  }
  if (row.quiz === 'watch_required') {
    return { cell: <span className="spg-muted"><Icon name="lock" size={14} /> Watch to unlock</span>, action: { label: row.watchPercent ? 'Resume' : 'Watch', href: classroomHref(row.subjectKey, row.jobId) } };
  }
  return { cell: <span className="spg-muted">No assessment</span>, action: { label: 'Open', href: classroomHref(row.subjectKey, row.jobId) } };
}

/* ------------------------------------------------------------------ page */
function ProgressView() {
  const [url, setUrl] = useUrlState({ tab: 'overview', subject: '' });
  const tab = url.tab === 'details' ? 'details' : 'overview';
  const { data: m, loading, error, reload } = useAsyncResource(loadStudentHome, []);
  const isLoading = loading && !m;

  const w = m?.watch;
  const a = m?.assessments;
  const iv = m?.interviews;
  const rows = m?.chapterRows || [];
  const subjects = m?.subjects || [];
  const history = [...(m?.trend || [])].reverse();
  const latest = history[0] || null;
  const latestRow = latest ? rows.find((r) => r.jobId === latest.jobId) : null;
  const openAssignments = (m?.assignments || []).filter((x) => x.status === 'Open');
  const interviews = m?.interviewRows || [];
  const step = nextStep(m);
  const context = [m?.deptName, m?.collegeName].filter(Boolean).join(' · ');

  /* the chapter the "learning record" spotlights: in progress → latest assessed → newest */
  const focusRow = rows.find((r) => r.watchPercent > 0 && !r.watchComplete) || latestRow || rows[0] || null;

  /* Details: one subject at a time (chips when there is more than one) */
  const subject = subjects.find((s) => s.key === url.subject) || subjects[0] || null;
  const subjectRows = subject ? rows.filter((r) => r.subjectKey === subject.key) : [];
  const subjectHistory = history.filter((h) => !subject || h.subjectKey === subject.key);
  const record = useMemo(() => {
    const events = [];
    subjectRows.forEach((r) => {
      if (r.publishedAt) events.push({ at: toTime(r.publishedAt), date: r.published, kind: 'lecture', activity: `Lecture published: ${r.title}`, result: r.duration ? `Duration ${r.duration}` : '—', row: r });
      if (r.submittedAt) events.push({ at: toTime(r.submittedAt), date: r.submitted, kind: 'assessment', activity: `Assessment completed: ${r.title}`, result: `Score ${pct(r.score)}${r.correct ? ` · ${r.correct} correct` : ''}`, row: r });
    });
    return events.sort((x, y) => y.at - x.at);
  }, [subjectRows]);

  const interviewKpi = iv?.total
    ? { value: pct(iv.avg), tone: tone(iv.avg), sub: `Average of ${plural(iv.total, 'completed interview')}` }
    : { value: m ? 'Not started' : null, tone: null, sub: openAssignments.length ? `${plural(openAssignments.length, 'interview')} assigned to you` : 'No completed interviews' };

  const onTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = tab === 'overview' ? 'details' : 'overview';
    setUrl({ tab: next });
    document.getElementById(`spg-tab-${next}`)?.focus();
  };

  const interviewList = () => (
    openAssignments.length || interviews.length ? (
      <ul className="spg-ivlist">
        {openAssignments.map((x) => (
          <li key={`as-${x.id}`}>
            <span className="spg-ic spg-ic--teal" aria-hidden="true"><Icon name="clip" size={18} /></span>
            <div className="spg-ivlist-main">
              <b>{x.title}</b>
              <span>{['Assigned by your department', x.mode === 'Full' ? 'Full' : 'Mock', x.dueShort ? `Due ${x.dueShort}` : null].filter(Boolean).join(' · ')}</span>
            </div>
            <span className="spg-pill">Not started</span>
          </li>
        ))}
        {interviews.slice(0, 3).map((r) => (
          <li key={`iv-${r.id}`}>
            <Link className="spg-ivlink" href={reportHref(r.id)} aria-label={`${r.title}, ${pct(r.score)} — open report`}>
              <span className="spg-ic spg-ic--teal" aria-hidden="true"><Icon name="mic" size={18} /></span>
              <span className="spg-ivlist-main">
                <b>{r.title}</b>
                <span>{[r.mode === 'full' ? 'Full' : 'Mock', r.date].filter(Boolean).join(' · ')}</span>
              </span>
              <ScoreChip score={r.score} />
              <Icon name="chev" size={16} />
            </Link>
          </li>
        ))}
      </ul>
    ) : null
  );

  return (
    <div className={`spg spg-hide-topbar animate-fade-in${isLoading ? ' is-loading' : ''}`} aria-busy={isLoading}>
      <header className="spg-head">
        <h1>My progress</h1>
        <p>{context || 'Understand your learning, not just your completion.'}</p>
      </header>

      <div className="spg-tabs" role="tablist" aria-label="Progress views">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`spg-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`spg-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={`spg-tab${tab === t.id ? ' is-on' : ''}`}
            onClick={() => setUrl({ tab: t.id })}
            onKeyDown={onTabKey}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && !m ? (
        <SectionState
          tone="err"
          title="Could not load your progress"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {apiErrorMessage(error, 'Please try again in a moment.')}
        </SectionState>
      ) : null}

      {tab === 'overview' ? (
        /* ================================================================ OVERVIEW */
        <div id="spg-panel-overview" role="tabpanel" aria-labelledby="spg-tab-overview" className="spg-panel">
          <section className="spg-card spg-kpis" aria-label="Progress summary">
            <div className="spg-kpi">
              <span className="spg-ic spg-ic--blue" aria-hidden="true"><Icon name="playCircle" size={22} /></span>
              <div className="spg-kpi-body">
                <span className="spg-kpi-l">Chapters watched</span>
                <b className="spg-kpi-v">{w ? `${w.finished}/${w.total}` : '—'}</b>
                <span className="spg-kpi-s">{w?.total ? `${w.percent}% of published chapters` : 'No chapters published yet'}</span>
                {w?.total ? <span className="spg-meter" role="presentation"><i style={{ width: `${w.percent}%` }} /></span> : null}
              </div>
            </div>
            <div className="spg-kpi">
              <span className="spg-ic spg-ic--orange" aria-hidden="true"><Icon name="clip" size={22} /></span>
              <div className="spg-kpi-body">
                <span className="spg-kpi-l">Assessment score</span>
                <b className={`spg-kpi-v${a?.avg != null ? ` spg-tone--${tone(a.avg)}` : ''}`}>{a?.avg != null ? pct(a.avg) : (m ? '—' : '')}</b>
                <span className="spg-kpi-s">{a?.done ? `Based on ${plural(a.done, 'assessment')}` : 'After your first assessment'}</span>
                {a?.avg != null ? <span className={`spg-band spg-band--${tone(a.avg)}`}>{scoreBand(a.avg).label}</span> : null}
              </div>
            </div>
            <div className="spg-kpi">
              <span className="spg-ic spg-ic--teal" aria-hidden="true"><Icon name="mic" size={22} /></span>
              <div className="spg-kpi-body">
                <span className="spg-kpi-l">Interview practice</span>
                <b className={`spg-kpi-v${interviewKpi.tone ? ` spg-tone--${interviewKpi.tone}` : ''}`}>{interviewKpi.value ?? ''}</b>
                <span className="spg-kpi-s">{interviewKpi.sub}</span>
              </div>
            </div>
          </section>

          <div className="spg-grid">
            <section className="spg-card" aria-labelledby="spg-lr-h">
              <div className="spg-card-h">
                <h2 id="spg-lr-h">Your learning record</h2>
                <p>{subjects.length > 1 ? `${plural(subjects.length, 'subject')} · ${plural(rows.length, 'chapter')}` : (subjects[0]?.name || m?.deptName || 'Your published lectures')}</p>
              </div>

              {focusRow ? (
                <div className="spg-records">
                  <Link className="spg-record" href={classroomHref(focusRow.subjectKey, focusRow.jobId)}>
                    <span className="spg-ic spg-ic--blue" aria-hidden="true"><Icon name="playCircle" size={20} /></span>
                    <span className="spg-record-main"><small>Chapter</small><b>{focusRow.title}</b></span>
                    <StatusPill row={focusRow} />
                    <span className="spg-record-end">{w ? `${w.finished}/${w.total} chapters` : ''}</span>
                  </Link>
                  {latestRow ? (
                    <Link className="spg-record" href={assessmentHref(jobOf(latestRow), latestRow.subjectKey)}>
                      <span className="spg-ic spg-ic--orange" aria-hidden="true"><Icon name="clip" size={20} /></span>
                      <span className="spg-record-main"><small>Latest assessment</small><b>{latestRow.title}</b></span>
                      <ScoreChip score={latest.score} />
                      <span className="spg-record-end spg-textlink">View results <Icon name="arrow" size={14} /></span>
                    </Link>
                  ) : null}
                </div>
              ) : (
                <Empty icon="book" title={isLoading ? 'Loading your learning record…' : 'No lectures yet'}>
                  {isLoading ? null : 'Your chapters appear here once lectures are published for your department.'}
                </Empty>
              )}

              <div className="spg-sub">
                <h3 className="spg-h3-gap">Assessment history</h3>
                {history.length ? (
                  <>
                    <div className="spg-table-wrap">
                      <table className="spg-table">
                        <thead><tr><th>Date</th><th>Chapter</th><th className="num">Score</th><th>Action</th></tr></thead>
                        <tbody>
                          {history.map((h) => {
                            const r = rows.find((x) => x.jobId === h.jobId);
                            return (
                              <tr key={`${h.jobId}-${h.date}`}>
                                <td data-label="Date">{h.label}</td>
                                <td data-label="Chapter"><b>{h.title}</b>{subjects.length > 1 ? <small>{h.subject}</small> : null}</td>
                                <td data-label="Score" className="num"><b className={`spg-tone--${tone(h.score)}`}>{h.score}%</b></td>
                                <td data-label="Action">
                                  <Link className="spg-textlink" href={assessmentHref(jobOf(r || { jobId: h.jobId, title: h.title }), h.subjectKey, { view: 'review' })}>
                                    Review answers <Icon name="arrow" size={14} />
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {history.length > 1 ? (
                      <div className="spg-chart">
                        <PerformanceChart items={m.trend} ariaLabel="Your chapter assessment scores over time" />
                      </div>
                    ) : (
                      <p className="spg-note"><Icon name="info" size={18} /> One completed assessment. More results are needed to show a trend.</p>
                    )}
                  </>
                ) : (
                  <p className="spg-note"><Icon name="info" size={18} /> {isLoading ? 'Loading your scores…' : 'No assessments yet. Finish a lecture to 100% to unlock its assessment.'}</p>
                )}
              </div>
            </section>

            <aside className="spg-card spg-next" aria-labelledby="spg-ns-h">
              <div className="spg-next-tag">
                <span className="spg-next-ic" aria-hidden="true"><Icon name={step.icon} size={24} /></span>
                <span>Recommended next step</span>
              </div>
              <h2 id="spg-ns-h">{isLoading ? 'Reading your progress…' : step.title}</h2>
              {!isLoading ? <p>{step.body}</p> : null}
              {!isLoading ? (
                <Link className="spg-btn spg-btn--accent spg-btn--block" href={step.primary.href}>
                  <Icon name={step.primary.icon} size={18} /> {step.primary.label}
                </Link>
              ) : null}
              {!isLoading && step.links.length ? (
                <ul className="spg-next-links">
                  {step.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href}>
                        <Icon name={l.icon} size={20} /> <span>{l.label}</span> <Icon name="chev" size={16} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </aside>
          </div>

          <section className="spg-card spg-ivstrip" aria-labelledby="spg-ivs-h">
            <span className="spg-ic spg-ic--round" aria-hidden="true"><Icon name="mic" size={22} /></span>
            <div className="spg-ivstrip-main">
              <small id="spg-ivs-h">Interview practice</small>
              {openAssignments[0] ? (
                <>
                  <b>{openAssignments[0].title}</b>
                  <span>{['Assigned by your department', openAssignments[0].department, openAssignments[0].dueShort ? `Due ${openAssignments[0].dueShort}` : null].filter(Boolean).join(' · ')}{openAssignments.length > 1 ? ` · +${openAssignments.length - 1} more` : ''}</span>
                </>
              ) : interviews[0] ? (
                <>
                  <b>{interviews[0].title}</b>
                  <span>{[interviews[0].mode === 'full' ? 'Full interview' : 'Mock interview', interviews[0].date].filter(Boolean).join(' · ')}</span>
                </>
              ) : (
                <>
                  <b>Practise with an AI interviewer</b>
                  <span>A 5-minute mock interview with instant feedback on your answers.</span>
                </>
              )}
            </div>
            {openAssignments[0] ? <span className="spg-pill">Not started</span> : interviews[0] ? <ScoreChip score={interviews[0].score} /> : null}
            {interviews[0] && !openAssignments[0] ? (
              <Link className="spg-btn spg-btn--outline" href={reportHref(interviews[0].id)}>View report</Link>
            ) : null}
            <Link className="spg-btn spg-btn--outline-accent" href={INTERVIEWS}>
              <Icon name="mic" size={16} /> {openAssignments[0] ? `Start ${openAssignments[0].mode.toLowerCase()} interview` : 'Start mock interview'}
            </Link>
          </section>
        </div>
      ) : (
        /* ================================================================ DETAILS */
        <div id="spg-panel-details" role="tabpanel" aria-labelledby="spg-tab-details" className="spg-panel">
          {subjects.length > 1 ? (
            <div className="spg-chips" role="group" aria-label="Subject">
              {subjects.map((s) => (
                <button key={s.key} type="button" className={`spg-chip${subject?.key === s.key ? ' is-on' : ''}`} aria-pressed={subject?.key === s.key} onClick={() => setUrl({ subject: s.key })}>
                  {s.name} <small>{s.watchedCount}/{s.chapterCount}</small>
                </button>
              ))}
            </div>
          ) : null}

          <div className="spg-grid">
            <section className="spg-card" aria-labelledby="spg-subj-h">
              {subject ? (
                <>
                  <div className="spg-subj-h">
                    <span className="spg-ic spg-ic--blue" aria-hidden="true"><Icon name="bookOpen" size={22} /></span>
                    <div>
                      <h2 id="spg-subj-h">{subject.name}</h2>
                      <p>{plural(subject.chapterCount, 'published chapter')}</p>
                    </div>
                    <Link className="spg-btn spg-btn--outline spg-subj-open" href={classroomHref(subject.key)}>Open classroom <Icon name="arrow" size={14} /></Link>
                  </div>

                  <div className="spg-metrics">
                    <div className="spg-metric">
                      <span className="spg-ic spg-ic--blue" aria-hidden="true"><Icon name="playCircle" size={20} /></span>
                      <div>
                        <span className="spg-kpi-l">Learning completion</span>
                        <b className="spg-kpi-v">{pct(subject.completion)}</b>
                        <span className="spg-kpi-s">{subject.watchedCount} of {plural(subject.chapterCount, 'chapter')} watched</span>
                        <span className="spg-meter" role="presentation"><i style={{ width: `${subject.completion || 0}%` }} /></span>
                      </div>
                    </div>
                    <div className="spg-metric">
                      <span className="spg-ic spg-ic--orange" aria-hidden="true"><Icon name="clip" size={20} /></span>
                      <div>
                        <span className="spg-kpi-l">Assessment performance</span>
                        <b className={`spg-kpi-v${subject.avgScore != null ? ` spg-tone--${tone(subject.avgScore)}` : ''}`}>{pct(subject.avgScore)}</b>
                        <span className="spg-kpi-s">{subject.quizDone ? `${plural(subject.quizDone, 'completed assessment')}` : 'No assessments completed yet'}</span>
                        {subject.avgScore != null ? <span className={`spg-band spg-band--${tone(subject.avgScore)}`}>{scoreBand(subject.avgScore).label}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="spg-sub">
                    <h3>Chapter performance</h3>
                    <p className="spg-sub-p">Your progress for each published chapter.</p>
                    <div className="spg-table-wrap">
                      <table className="spg-table">
                        <thead><tr><th>Chapter</th><th>Learning status</th><th>Assessment</th><th>Action</th></tr></thead>
                        <tbody>
                          {subjectRows.map((r) => {
                            const c = chapterAction(r);
                            return (
                              <tr key={r.jobId}>
                                <td data-label="Chapter"><b>{r.title}</b>{r.duration ? <small>{r.duration} lecture</small> : null}</td>
                                <td data-label="Learning status"><StatusPill row={r} /></td>
                                <td data-label="Assessment">{c.cell}</td>
                                <td data-label="Action">
                                  <Link className={`spg-btn spg-btn--sm ${c.action.accent ? 'spg-btn--accent' : 'spg-btn--outline'}`} href={c.action.href}>
                                    {c.action.label} <Icon name="chev" size={14} />
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="spg-sub">
                    <h3>Learning record</h3>
                    <p className="spg-sub-p">A chronological record of your learning activity.</p>
                    {record.length ? (
                      <div className="spg-table-wrap">
                        <table className="spg-table">
                          <thead><tr><th>Date</th><th>Activity</th><th>Result</th></tr></thead>
                          <tbody>
                            {record.map((e) => (
                              <tr key={`${e.kind}-${e.row.jobId}`}>
                                <td data-label="Date">{e.date || '—'}</td>
                                <td data-label="Activity">
                                  <span className="spg-activity"><i className={`spg-dot spg-dot--${e.kind}`} aria-hidden="true" />{e.activity}</span>
                                </td>
                                <td data-label="Result" className={e.kind === 'assessment' ? `spg-tone--${tone(e.row.score)}` : ''}>{e.result}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p className="spg-note"><Icon name="info" size={18} /> Nothing recorded yet.</p>}
                    <p className="spg-note"><Icon name="info" size={18} /> Your score reflects the assessment. Watching a chapter does not measure mastery.</p>
                  </div>
                </>
              ) : (
                <Empty icon="book" title={isLoading ? 'Loading your subjects…' : 'No subjects yet'}>
                  {isLoading ? null : 'Your subjects appear once lectures are published for your department.'}
                </Empty>
              )}
            </section>

            <div className="spg-side">
              <section className="spg-card" aria-labelledby="spg-ar-h">
                <div className="spg-side-h">
                  <span className="spg-ic spg-ic--orange" aria-hidden="true"><Icon name="clip" size={22} /></span>
                  <div>
                    <h2 id="spg-ar-h">Assessment review</h2>
                    {subjectHistory[0] ? (
                      <>
                        <b className={`spg-big spg-tone--${tone(subjectHistory[0].score)}`}>{subjectHistory[0].score}%</b>
                        <p>{subjectHistory.length > 1 ? `Latest of ${plural(subjectHistory.length, 'assessment')}` : 'Based on 1 assessment'}</p>
                      </>
                    ) : <p>No assessments completed in this subject yet.</p>}
                  </div>
                </div>
                {subjectHistory[0] ? (() => {
                  const h = subjectHistory[0];
                  const r = rows.find((x) => x.jobId === h.jobId) || { jobId: h.jobId, title: h.title, subjectKey: h.subjectKey };
                  return (
                    <>
                      <ul className="spg-facts">
                        <li><Icon name="calendar" size={18} /> {h.date}</li>
                        <li><Icon name="doc" size={18} /> {h.title}</li>
                        <li><Icon name="bars" size={18} /> Score: {h.score}%{r.correct ? ` · ${r.correct} correct` : ''}</li>
                      </ul>
                      <div className="spg-stack">
                        <Link className="spg-btn spg-btn--accent spg-btn--block" href={assessmentHref(jobOf(r), r.subjectKey)}>View results</Link>
                        <Link className="spg-btn spg-btn--outline spg-btn--block" href={classroomHref(r.subjectKey, r.jobId, 'tutor')}><Icon name="chat" size={18} /> Ask AI tutor</Link>
                      </div>
                    </>
                  );
                })() : (
                  <div className="spg-stack">
                    <Link className="spg-btn spg-btn--outline spg-btn--block" href={subject ? classroomHref(subject.key) : SUBJECTS_PATH}><Icon name="play" size={18} /> Continue learning</Link>
                  </div>
                )}
              </section>

              <section className="spg-card" aria-labelledby="spg-ip-h">
                <div className="spg-side-h">
                  <span className="spg-ic spg-ic--teal" aria-hidden="true"><Icon name="mic" size={22} /></span>
                  <div>
                    <h2 id="spg-ip-h">Interview practice</h2>
                    <p>Your upcoming and completed interview sessions.</p>
                  </div>
                </div>
                {interviewList()}
                {!interviews.length ? (
                  <div className="spg-mini-empty">
                    <span className="spg-ic spg-ic--grey" aria-hidden="true"><Icon name="chat" size={16} /></span>
                    <span><b>No completed interviews</b><small>You haven’t completed any interview sessions yet.</small></span>
                  </div>
                ) : null}
                <Link className="spg-btn spg-btn--outline-accent spg-btn--block" href={INTERVIEWS}><Icon name="mic" size={16} /> Start mock interview</Link>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentProgressPage() {
  return (
    <Suspense fallback={null}>
      <ProgressView />
    </Suspense>
  );
}
