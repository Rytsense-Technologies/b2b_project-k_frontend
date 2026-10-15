'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { Icon, SectionState } from '@/components/student/ui';
import { HeadChip, ModuleHead, Panel, SegTabs, TabNav, TabPanel } from '@/components/shared/module-ui';
import { BANDS, BandPill, BarList, Distribution, TrendChart, bandFor, dataColor } from '@/components/shared/data-viz';
import ScoreRing from '@/components/shared/ScoreRing';
import { subjectColor, subjectTileStyle } from '@/components/student/subjectColor';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useTabParam, useUrlState } from '@/hooks/useUrlState';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { loadStudentHomeData } from '@/components/student/studentHome';
import { assessmentHref, classroomHref, SUBJECTS_PATH } from '@/lib/student/learning';
import '@/styles/student-progress.css';

/**
 * My progress (redesign spec student.md §7, 14 Oct 2026) — four tabs in ?tab=:
 *   Overview     KPIs (watched ring · assessment average band · interviews) · completion by subject ·
 *                score trend · recommended next step (the one orange action)
 *   By subject   subject chips (subject colour) · chapter table with status filter · learning record
 *   Assessments  band distribution + history table
 *   Interviews   list, score trend, report links, assigned interviews
 * Live student APIs only. While loading: skeletons — no CTAs or "nothing yet" copy.
 */

const INTERVIEWS = '/student/interviews';
/** Single-series trends: teal line, orange markers (design-system §2b Charts). */
const TEAL = '#0E5C6B';
const GREY_HEX = '#BCC1C3';
/** Same hue as subjectColor(), as hex for the chart. */
const subjectHex = (key) => (String(key || '').startsWith('subject:') ? dataColor(String(key).slice(8), { hex: true }) : GREY_HEX);
const TAB_VALUES = ['overview', 'subject', 'assessments', 'interviews'];

const pct = (n) => (n != null && n !== '' && Number.isFinite(Number(n)) ? `${Math.round(Number(n))}%` : '—');
/** Interview scores read "41/100"; quiz scores read "41%" (S11). */
const outOf100 = (n) => (n != null && n !== '' && Number.isFinite(Number(n)) ? `${Math.round(Number(n))}/100` : '—');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const reportHref = (id) => `/student/reports/view?session=${encodeURIComponent(id)}`;
const jobOf = (row) => ({ job_id: row.jobId, chapter_title: row.title });
const toTime = (iso) => Date.parse(iso || '') || 0;

const CHAPTER_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'Not started' },
  { value: 'progress', label: 'In progress' },
  { value: 'watched', label: 'Watched' },
  { value: 'ready', label: 'Assessment ready' },
  { value: 'done', label: 'Completed' },
];
/** One status per chapter (S7), so the filter counts add up to All. */
function rowStatus(r) {
  if (r.quiz === 'done') return 'done';
  if (r.quiz === 'open') return 'ready';
  if (r.watchComplete) return 'watched';
  if (r.watchPercent > 0) return 'progress';
  return 'new';
}
function rowMatches(f, r) {
  return f === 'all' || rowStatus(r) === f;
}

/* ------------------------------------------------------------------ next step */
function nextStep(m) {
  const rows = m?.chapterRows || [];
  const latest = m?.trend?.length ? m.trend[m.trend.length - 1] : null;
  const latestRow = latest ? rows.find((r) => r.jobId === latest.jobId) : null;
  const open = rows.find((r) => r.quiz === 'open');
  const watching = rows.find((r) => r.watchPercent > 0 && !r.watchComplete);
  const unwatched = rows.find((r) => r.watchPercent === 0);

  if (latestRow && bandFor(latest.score) !== 'strong') {
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
  if (rows.length && m?.canSelfInterview) {
    return {
      icon: 'mic',
      title: 'Put it into practice',
      body: 'Your lectures and assessments are up to date. A mock interview turns what you learned into answers.',
      primary: { label: 'Start mock interview', icon: 'mic', href: INTERVIEWS },
      links: latestRow ? [{ label: 'Review your last assessment', icon: 'doc', href: assessmentHref(jobOf(latestRow), latestRow.subjectKey, { view: 'review' }) }] : [],
    };
  }
  if (rows.length) {
    return {
      icon: 'tick',
      title: 'You’re up to date',
      body: 'Every published lecture is watched and assessed. Revise any chapter with your AI tutor while you wait for the next one.',
      primary: latestRow
        ? { label: 'Review your last assessment', icon: 'doc', href: assessmentHref(jobOf(latestRow), latestRow.subjectKey, { view: 'review' }) }
        : { label: 'Go to My subjects', icon: 'book', href: SUBJECTS_PATH },
      links: latestRow ? [{ label: 'Ask AI tutor', icon: 'chat', href: classroomHref(latestRow.subjectKey, latestRow.jobId, 'tutor') }] : [],
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
function WatchPill({ row }) {
  if (row.watchComplete) return <span className="spg-pill spg-pill--good"><Icon name="tick" size={14} /> Watched</span>;
  if (row.watchPercent > 0) return <span className="spg-pill spg-pill--teal">{row.watchPercent}% watched</span>;
  return <span className="spg-pill">Not started</span>;
}

function Score({ score, interview = false }) {
  return (
    <span className="spg-score">
      <BandPill score={score} label={score == null ? 'Not scored' : undefined} />
      <b>{score == null ? '—' : <>{Math.round(Number(score))}<small>{interview ? '/100' : '%'}</small></>}</b>
    </span>
  );
}

/** Interview CTA — or, when interviews aren't open for this student, why not (S9). */
function InterviewCta({ m, label }) {
  if (!m) return null;
  if (!m.canSelfInterview) {
    return (
      <p className="spg-lockhint">
        <Icon name="lock" size={16} />
        <span>{m.interviewLockReason || 'AI interviews open in your final year.'} <Link href={INTERVIEWS}>Why it’s locked</Link></span>
      </p>
    );
  }
  return <Link className="sd-btn sd-btn--outline" href={INTERVIEWS}><Icon name="mic" size={16} /> {label}</Link>;
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

function Skeleton({ rows = 3 }) {
  return <div className="spg-skel" aria-hidden="true">{Array.from({ length: rows }, (_, i) => <span key={i} />)}</div>;
}

function chapterAction(row) {
  if (row.quiz === 'done') return { cell: <Score score={row.score} />, action: { label: 'Review', href: assessmentHref(jobOf(row), row.subjectKey, { view: 'review' }) } };
  if (row.quiz === 'open') return { cell: <span className="spg-muted-strong">Unlocked</span>, action: { label: 'Take', href: assessmentHref(jobOf(row), row.subjectKey) } };
  if (row.quiz === 'watch_required' || (row.quiz === 'unchecked' && !row.watchComplete)) {
    return { cell: <span className="spg-muted"><Icon name="lock" size={14} /> Watch to unlock</span>, action: { label: row.watchPercent ? 'Resume' : 'Watch', href: classroomHref(row.subjectKey, row.jobId) } };
  }
  return { cell: <span className="spg-muted">No assessment</span>, action: { label: 'Open', href: classroomHref(row.subjectKey, row.jobId) } };
}

/* ------------------------------------------------------------------ page */
function ProgressView() {
  const [tab, setTab] = useTabParam(TAB_VALUES, 'overview');
  const [url, setUrl] = useUrlState({ subject: '', f: 'all' });
  const { data: m, loading, error, reload } = useAsyncResource(loadStudentHomeData, []);
  const isLoading = loading && !m;

  const w = m?.watch;
  const a = m?.assessments;
  const iv = m?.interviews;
  const rows = useMemo(() => m?.chapterRows || [], [m]);
  const subjects = m?.subjects || [];
  const interviews = m?.interviewRows || [];
  const openAssignments = (m?.assignments || []).filter((x) => x.status === 'Open');
  const step = m ? nextStep(m) : null;

  /* every completed assessment, newest first (chapterRows covers all looked-up chapters) */
  const done = useMemo(
    () => rows.filter((r) => r.quiz === 'done' && r.score != null).sort((x, y) => toTime(y.submittedAt) - toTime(x.submittedAt)),
    [rows],
  );
  const bandParts = BANDS.map((b) => ({ key: b.key, label: b.label, value: done.filter((r) => bandFor(r.score) === b.key).length }));
  /* Quiz trend: one line per subject (subject colours) when every subject has 2+ scores, else one teal line. */
  const trendSubjects = [...new Set((m?.trend || []).map((t) => t.subjectKey))];
  // Series keys stay plain (s0, s1…) — they become SVG gradient ids.
  const quizTrend = (m?.trend || []).map((t) => ({ label: t.label, score: t.score, [`s${trendSubjects.indexOf(t.subjectKey)}`]: t.score }));
  const perSubject = trendSubjects.length > 1
    && trendSubjects.every((k) => (m?.trend || []).filter((t) => t.subjectKey === k).length >= 2);
  const quizSeries = perSubject
    ? trendSubjects.map((k, i) => ({ key: `s${i}`, name: (m?.trend || []).find((t) => t.subjectKey === k)?.subject || 'Subject', color: subjectHex(k) }))
    : [{ key: 'score', name: 'Score', color: TEAL }];
  const ivTrend = interviews.filter((r) => r.score != null).slice(0, 10).reverse().map((r, i) => ({ label: r.date || `#${i + 1}`, score: r.score }));

  /* By subject */
  const subject = subjects.find((s) => s.key === url.subject) || subjects[0] || null;
  const subjectRows = subject ? rows.filter((r) => r.subjectKey === subject.key) : [];
  const shownRows = subjectRows.filter((r) => rowMatches(url.f, r));
  const counts = Object.fromEntries(CHAPTER_FILTERS.map((f) => [f.value, subjectRows.filter((r) => rowMatches(f.value, r)).length]));
  const record = useMemo(() => {
    const events = [];
    subjectRows.forEach((r) => {
      if (r.publishedAt) events.push({ at: toTime(r.publishedAt), date: r.published, kind: 'lecture', activity: `Lecture published: ${r.title}`, row: r });
      if (r.submittedAt) events.push({ at: toTime(r.submittedAt), date: r.submitted, kind: 'assessment', activity: `Assessment completed: ${r.title}`, row: r });
    });
    return events.sort((x, y) => y.at - x.at);
  }, [subjectRows]);

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'subject', label: 'By subject', count: m ? subjects.length : undefined },
    { value: 'assessments', label: 'Assessments', count: m ? done.length : undefined },
    { value: 'interviews', label: 'Interviews', count: m && iv?.total != null ? iv.total : undefined },
  ];

  return (
    <div className={`spg animate-fade-in${isLoading ? ' is-loading' : ''}`} aria-busy={isLoading}>
      {m?.deptName || m?.collegeName ? (
        <ModuleHead chips={<HeadChip icon="building">{[m.deptName, m.collegeName].filter(Boolean).join(' · ')}</HeadChip>} />
      ) : null}

      <TabNav tabs={tabs} value={tab} onChange={setTab} label="Progress views" idBase="spg-tab" />

      {error && !m ? (
        <SectionState
          tone="err"
          title="Could not load your progress"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}><Icon name="refresh" size={16} /> Try again</button>}
        >
          {apiErrorMessage(error, 'Please try again in a moment.')}
        </SectionState>
      ) : null}

      {/* ================================================================ OVERVIEW */}
      <TabPanel value="overview" current={tab} idBase="spg-tab">
        <div className="spg-panel">
          <section className="spg-kpis" aria-label="Progress summary">
            <div className="spg-kpi">
              <span className="spg-kpi-l">Chapters watched</span>
              <div className="spg-kpi-row">
                {w ? <ScoreRing score={w.percent} size={56} tone="progress" suffix="%" label={`${w.percent}% of chapters watched`} /> : <span className="spg-skel-ring" aria-hidden="true" />}
                <b className="spg-kpi-v">{w ? `${w.finished}/${w.total}` : '—'}</b>
              </div>
              <span className="spg-kpi-s">{w ? (w.total ? 'Published chapters' : 'No chapters published yet') : ' '}</span>
            </div>
            <div className="spg-kpi">
              <span className="spg-kpi-l">Assessment average</span>
              <div className="spg-kpi-row">
                <b className="spg-kpi-v">{pct(a?.avg)}</b>
                {a ? <BandPill score={a.avg} label={a.avg == null ? 'No scores yet' : undefined} /> : null}
              </div>
              <span className="spg-kpi-s">{a ? (a.done ? `Based on ${plural(a.done, 'assessment')}` : 'After your first assessment') : ' '}</span>
            </div>
            <div className="spg-kpi">
              <span className="spg-kpi-l">Interviews done</span>
              <div className="spg-kpi-row">
                <b className="spg-kpi-v">{m ? (iv?.total ?? 0) : '—'}</b>
                {iv?.avg != null ? <BandPill score={iv.avg} /> : null}
              </div>
              <span className="spg-kpi-s">{m ? (iv?.avg != null ? `Average ${outOf100(iv.avg)}` : openAssignments.length ? `${plural(openAssignments.length, 'interview')} assigned` : 'No completed interviews') : ' '}</span>
            </div>
          </section>

          <div className="spg-grid">
            <div className="spg-col">
              <Panel title="Completion by subject" sub="Chapters watched in each subject">
                {isLoading ? <Skeleton rows={2} /> : (
                  <BarList
                    label="Completion by subject"
                    max={100}
                    suffix="%"
                    empty="Your subjects appear once lectures are published for your department."
                    items={subjects.map((s) => ({
                      key: s.key, label: s.name, value: s.completion ?? 0, sub: `${s.watchedCount}/${s.chapterCount}`, color: subjectColor(s.key), href: `${SUBJECTS_PATH}?s=${encodeURIComponent(s.key)}`,
                    }))}
                  />
                )}
              </Panel>
              <Panel title="Assessment scores" sub="Your latest chapter assessments over time">
                {isLoading ? <Skeleton rows={2} /> : quizTrend.length >= 2 ? (
                  <TrendChart data={quizTrend} series={quizSeries} height={200} suffix="%" />
                ) : (
                  <p className="spg-note"><Icon name="info" size={18} /> {quizTrend.length ? 'One completed assessment. Two or more show a trend.' : 'No assessments yet. Finish a lecture to 100% to unlock its assessment.'}</p>
                )}
              </Panel>
            </div>

            <aside className="spg-next" aria-labelledby="spg-ns-h">
              <div className="spg-next-tag">
                <span className="spg-next-ic" aria-hidden="true"><Icon name={step?.icon || 'target'} size={22} /></span>
                <span>Recommended next step</span>
              </div>
              {step ? (
                <>
                  <h2 id="spg-ns-h">{step.title}</h2>
                  <p>{step.body}</p>
                  <Link className="sd-btn sd-btn--amber sd-btn--block" href={step.primary.href}>
                    <Icon name={step.primary.icon} size={18} /> {step.primary.label}
                  </Link>
                  {step.links.length ? (
                    <ul className="spg-next-links">
                      {step.links.map((l) => (
                        <li key={l.label}>
                          <Link href={l.href}><Icon name={l.icon} size={18} /> <span>{l.label}</span> <Icon name="chev" size={16} /></Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : <Skeleton rows={3} />}
            </aside>
          </div>
        </div>
      </TabPanel>

      {/* ================================================================ BY SUBJECT */}
      <TabPanel value="subject" current={tab} idBase="spg-tab">
        <div className="spg-panel">
          {subjects.length > 1 ? (
            <div className="spg-chips" role="group" aria-label="Subject">
              {subjects.map((s) => (
                <button key={s.key} type="button" className={`spg-chip${subject?.key === s.key ? ' is-on' : ''}`} aria-pressed={subject?.key === s.key} onClick={() => setUrl({ subject: s.key, f: 'all' })}>
                  <i className="spg-dot" style={{ background: subjectColor(s.key) }} aria-hidden="true" />
                  {s.name} <small>{s.watchedCount}/{s.chapterCount}</small>
                </button>
              ))}
            </div>
          ) : null}

          {isLoading ? <Panel><Skeleton rows={4} /></Panel> : subject ? (
            <>
              <section className="spg-card spg-subj">
                <div className="spg-subj-h">
                  <span className="spg-ic" style={subjectTileStyle(subject.key)} aria-hidden="true"><Icon name="bookOpen" size={22} /></span>
                  <div>
                    <h2>{subject.name}</h2>
                    <p>{plural(subject.chapterCount, 'published chapter')}</p>
                  </div>
                  <Link className="sd-btn sd-btn--outline spg-subj-open" href={`${SUBJECTS_PATH}?s=${encodeURIComponent(subject.key)}`}>Open subject <Icon name="arrow" size={14} /></Link>
                </div>
                <div className="spg-metrics">
                  <div className="spg-metric">
                    <span className="spg-kpi-l">Learning completion</span>
                    <b className="spg-kpi-v">{pct(subject.completion)}</b>
                    <span className="spg-meter" aria-hidden="true"><i style={{ width: `${subject.completion || 0}%`, background: subjectColor(subject.key) }} /></span>
                    <span className="spg-kpi-s">{subject.watchedCount} of {plural(subject.chapterCount, 'chapter')} watched</span>
                  </div>
                  <div className="spg-metric">
                    <span className="spg-kpi-l">Assessment average</span>
                    <div className="spg-kpi-row">
                      <b className="spg-kpi-v">{pct(subject.avgScore)}</b>
                      <BandPill score={subject.avgScore} label={subject.avgScore == null ? 'No scores yet' : undefined} />
                    </div>
                    <span className="spg-kpi-s">{subject.quizDone ? plural(subject.quizDone, 'completed assessment') : 'No assessments completed yet'}</span>
                  </div>
                </div>
              </section>

              <Panel
                title="Chapter performance"
                sub="Your progress for each published chapter"
                toolbar={(
                  <SegTabs label="Chapter status" value={url.f} onChange={(v) => setUrl({ f: v })} options={CHAPTER_FILTERS.map((f) => ({ ...f, count: counts[f.value] }))} />
                )}
                bodyClassName=""
              >
                {shownRows.length ? (
                  <div className="spg-table-wrap">
                    <table className="spg-table">
                      <thead><tr><th>Chapter</th><th>Learning status</th><th>Assessment</th><th><span className="sr-only">Action</span></th></tr></thead>
                      <tbody>
                        {shownRows.map((r) => {
                          const c = chapterAction(r);
                          return (
                            <tr key={r.jobId}>
                              <td data-label="Chapter"><b>{r.title}</b>{r.duration ? <small>{r.duration} lecture</small> : null}</td>
                              <td data-label="Learning status"><WatchPill row={r} /></td>
                              <td data-label="Assessment">{c.cell}</td>
                              <td data-label="Action" className="spg-act">
                                <Link className="sd-btn sd-btn--sm sd-btn--outline" href={c.action.href}>{c.action.label} <Icon name="chev" size={14} /></Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="spg-none">No chapters match this filter.</p>}
              </Panel>

              <Panel title="Learning record" sub="A chronological record of your learning activity" bodyClassName="">
                {record.length ? (
                  <div className="spg-table-wrap">
                    <table className="spg-table">
                      <thead><tr><th>Date</th><th>Activity</th><th>Result</th></tr></thead>
                      <tbody>
                        {record.map((e) => (
                          <tr key={`${e.kind}-${e.row.jobId}`}>
                            <td data-label="Date" className="spg-nowrap">{e.date || '—'}</td>
                            <td data-label="Activity"><span className="spg-activity"><i className={`spg-dot spg-dot--${e.kind}`} aria-hidden="true" />{e.activity}</span></td>
                            <td data-label="Result">
                              {e.kind === 'assessment' ? <Score score={e.row.score} /> : (e.row.duration ? `Duration ${e.row.duration}` : '—')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="spg-none">Nothing recorded yet.</p>}
                <p className="spg-note spg-note--pad"><Icon name="info" size={18} /> Your score reflects the assessment. Watching a chapter does not measure mastery.</p>
              </Panel>
            </>
          ) : (
            <Panel><Empty icon="book" title="No subjects yet">Your subjects appear once lectures are published for your department.</Empty></Panel>
          )}
        </div>
      </TabPanel>

      {/* ================================================================ ASSESSMENTS */}
      <TabPanel value="assessments" current={tab} idBase="spg-tab">
        <div className="spg-panel">
          <Panel title="Score bands" sub={m ? `${plural(done.length, 'completed assessment')}` : ' '}>
            {isLoading ? <Skeleton rows={1} /> : <Distribution parts={bandParts} label="Assessment score bands" empty="No completed assessments yet." />}
          </Panel>
          <Panel title="Assessment history" sub="Newest first — review the answers for any chapter" bodyClassName="">
            {isLoading ? <div className="spg-pad"><Skeleton rows={3} /></div> : done.length ? (
              <div className="spg-table-wrap">
                <table className="spg-table">
                  <thead><tr><th>Date</th><th>Chapter</th><th>Score</th><th><span className="sr-only">Action</span></th></tr></thead>
                  <tbody>
                    {done.map((r) => (
                      <tr key={r.jobId}>
                        <td data-label="Date" className="spg-nowrap">{r.submitted || '—'}</td>
                        <td data-label="Chapter">
                          <b>{r.title}</b>
                          <small><i className="spg-dot" style={{ background: subjectColor(r.subjectKey) }} aria-hidden="true" /> {r.subject}{r.correct ? ` · ${r.correct} correct` : ''}</small>
                        </td>
                        <td data-label="Score"><Score score={r.score} /></td>
                        <td data-label="Action" className="spg-act">
                          <Link className="spg-textlink" href={assessmentHref(jobOf(r), r.subjectKey, { view: 'review' })}>Review answers <Icon name="arrow" size={14} /></Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon="clip" title="No assessments yet" action={<Link className="sd-btn sd-btn--outline sd-btn--sm" href={SUBJECTS_PATH}>Go to My subjects</Link>}>
                Finish a lecture to 100% to unlock its assessment.
              </Empty>
            )}
          </Panel>
        </div>
      </TabPanel>

      {/* ================================================================ INTERVIEWS */}
      <TabPanel value="interviews" current={tab} idBase="spg-tab">
        <div className="spg-panel">
          {isLoading ? <Panel><Skeleton rows={3} /></Panel> : (
            <div className="spg-grid spg-grid--even">
              <Panel title="Interview sessions" sub="Your completed and assigned interviews" action={interviews.length ? <Link className="sd-btn sd-btn--ghost sd-btn--sm" href="/student/reports">All reports <Icon name="chev" size={14} /></Link> : null}>
                {openAssignments.length || interviews.length ? (
                  <ul className="spg-ivlist">
                    {openAssignments.map((x) => (
                      <li key={`as-${x.id}`}>
                        <span className="spg-ic spg-ic--sm" aria-hidden="true"><Icon name="clip" size={18} /></span>
                        <div className="spg-ivlist-main">
                          <b>{x.title}</b>
                          <span>{['Assigned', x.mode, x.dueShort ? `Due ${x.dueShort}` : null].filter(Boolean).join(' · ')}</span>
                        </div>
                        <span className="spg-pill">Not started</span>
                      </li>
                    ))}
                    {interviews.slice(0, 8).map((r) => (
                      <li key={`iv-${r.id}`}>
                        <Link className="spg-ivlink" href={reportHref(r.id)} aria-label={`${r.title}, ${outOf100(r.score)} — open report`}>
                          <span className="spg-ic spg-ic--sm" aria-hidden="true"><Icon name="mic" size={18} /></span>
                          <span className="spg-ivlist-main">
                            <b>{r.title}</b>
                            <span>{[r.mode === 'full' ? 'Full interview' : 'Mock interview', r.date].filter(Boolean).join(' · ')}</span>
                          </span>
                          <Score score={r.score} interview />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty icon="mic" title="No completed interviews">Your interview reports appear here once you complete one.</Empty>
                )}
                <div className="spg-ivcta">
                  {openAssignments.length ? (
                    <Link className="sd-btn sd-btn--outline" href={INTERVIEWS}><Icon name="mic" size={16} /> Start assigned interview</Link>
                  ) : <InterviewCta m={m} label="Start mock interview" />}
                </div>
              </Panel>
              <Panel title="Score trend" sub="Interview scores out of 100">
                {ivTrend.length >= 2 ? (
                  <TrendChart data={ivTrend} series={[{ key: 'score', name: 'Score', color: TEAL }]} height={220} suffix="/100" />
                ) : (
                  <p className="spg-note"><Icon name="info" size={18} /> Two or more scored interviews show a trend.</p>
                )}
              </Panel>
            </div>
          )}
        </div>
      </TabPanel>
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
