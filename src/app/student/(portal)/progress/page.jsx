'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon, SectionState } from '@/components/student/ui';
import { TabNav, TabPanel } from '@/components/shared/module-ui';
import { BANDS, BandPill, MetricList, ModernDonut, TrendChart, bandFor, dataColor } from '@/components/shared/data-viz';
import ScoreRing from '@/components/shared/ScoreRing';
import { subjectColor, subjectTileStyle } from '@/components/student/subjectColor';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useTabParam, useUrlState } from '@/hooks/useUrlState';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { loadStudentHomeData } from '@/components/student/studentHome';
import { assessmentHref, classroomHref, SUBJECTS_PATH } from '@/lib/student/learning';
import { BAND_NONE, BRAND_PRIMARY } from '@/lib/constants/theme';
import '@/styles/student-dashboard.css';
import '@/styles/student-progress.css';

/**
 * My progress — three text tabs in ?tab= (quirri-b2c-student-ui skill, 15 Oct 2026):
 *   Overview     stat cluster · completion by subject (skill rows) · score trend ·
 *                recommended next step (the one orange action)
 *   By subject   subject text tabs · subject card · teal filter bar + chapter rows + pager ·
 *                learning record rows + pager
 *   Assessments  band distribution · stat cluster · history rows + pager
 * White cards on the grey canvas, stacked white rows instead of tables, no orange title rules.
 * Live student APIs only. While loading: skeletons — no CTAs or "nothing yet" copy.
 */

const TEAL = BRAND_PRIMARY;
const PAGE_SIZE = 10;
/** Same hue as subjectColor(), as hex for the chart. Unlinked lectures use teal, never grey. */
const subjectHex = (key) => (String(key || '').startsWith('subject:') ? dataColor(String(key).slice(8), { hex: true }) : BAND_NONE);
const TAB_VALUES = ['overview', 'subject', 'assessments'];

const pct = (n) => (n != null && n !== '' && Number.isFinite(Number(n)) ? `${Math.round(Number(n))}%` : '—');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const jobOf = (row) => ({ job_id: row.jobId, chapter_title: row.title });
const toTime = (iso) => Date.parse(iso || '') || 0;
const idx = (n) => String(n).padStart(2, '0');

const CHAPTER_FILTERS = [
  { value: 'all', label: 'All statuses' },
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
function watchText(row) {
  if (row.watchComplete) return 'Watched';
  if (row.watchPercent > 0) return `${row.watchPercent}% watched`;
  return 'Not started';
}

function Skeleton({ rows = 3, h = 76 }) {
  return (
    <div className="spg-skel" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <span key={i} className="sb-skel" style={{ height: h }} />)}
    </div>
  );
}

const Chev = () => (
  <svg className="sb-row__chev" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
);

function Card({ title, sub, action, children, className = '' }) {
  return (
    <section className={`spg-card ${className}`.trim()}>
      {title ? (
        <div className="spg-card-h">
          <div>
            <h3>{title}</h3>
            {sub ? <p>{sub}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function SecHead({ title, sub, action }) {
  return (
    <div className="spg-sec-h">
      <div>
        <h3>{title}</h3>
        {sub ? <p>{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

function Pager({ page, total, onPage, label }) {
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <nav className="sb-pager" aria-label={label}>
      <span className="sb-pager__info">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(total, page * PAGE_SIZE)} of {total}</span>
      <span className="sb-pager__nav">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span>{page} / {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </span>
    </nav>
  );
}

/** Clamp a 1-based page from the URL and slice the list. */
function paged(list, raw) {
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(raw) || 1));
  return { page, items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}

function chapterAction(row) {
  if (row.quiz === 'done') return { cell: row.score != null ? `${row.score}%` : '—', scored: true, action: { label: 'Review', href: assessmentHref(jobOf(row), row.subjectKey, { view: 'review' }) } };
  if (row.quiz === 'open') return { cell: 'Assessment unlocked', action: { label: 'Take', href: assessmentHref(jobOf(row), row.subjectKey) } };
  if (row.quiz === 'watch_required' || (row.quiz === 'unchecked' && !row.watchComplete)) {
    return { cell: 'Watch to unlock', locked: true, action: { label: row.watchPercent ? 'Resume' : 'Watch', href: classroomHref(row.subjectKey, row.jobId) } };
  }
  return { cell: 'No assessment', action: { label: 'Open', href: classroomHref(row.subjectKey, row.jobId) } };
}

/* ------------------------------------------------------------------ page */
function ProgressView() {
  const [tab, setTab] = useTabParam(TAB_VALUES, 'overview');
  const [url, setUrl] = useUrlState({ subject: '', f: 'all', q: '', p: '1', rp: '1', ap: '1' });
  const [draft, setDraft] = useState({ q: url.q, f: url.f });
  useEffect(() => { setDraft({ q: url.q, f: url.f }); }, [url.q, url.f]);
  const { data: m, loading, error, reload } = useAsyncResource(loadStudentHomeData, []);
  const isLoading = loading && !m;

  const w = m?.watch;
  const a = m?.assessments;
  const rows = useMemo(() => m?.chapterRows || [], [m]);
  const subjects = m?.subjects || [];
  const step = m ? nextStep(m) : null;

  /* every completed assessment, newest first (chapterRows covers all looked-up chapters) */
  const done = useMemo(
    () => rows.filter((r) => r.quiz === 'done' && r.score != null).sort((x, y) => toTime(y.submittedAt) - toTime(x.submittedAt)),
    [rows],
  );
  const bandParts = BANDS.map((b) => ({ key: b.key, label: b.label, value: done.filter((r) => bandFor(r.score) === b.key).length }));
  const doneBest = done.length ? Math.max(...done.map((r) => r.score)) : null;
  /* Quiz trend: one line per subject (subject colours) when every subject has 2+ scores, else one teal line. */
  const trendSubjects = [...new Set((m?.trend || []).map((t) => t.subjectKey))];
  // Series keys stay plain (s0, s1…) — they become SVG gradient ids.
  const quizTrend = (m?.trend || []).map((t) => ({ label: t.label, score: t.score, [`s${trendSubjects.indexOf(t.subjectKey)}`]: t.score }));
  const perSubject = trendSubjects.length > 1
    && trendSubjects.every((k) => (m?.trend || []).filter((t) => t.subjectKey === k).length >= 2);
  const quizSeries = perSubject
    ? trendSubjects.map((k, i) => ({ key: `s${i}`, name: (m?.trend || []).find((t) => t.subjectKey === k)?.subject || 'Subject', color: subjectHex(k) }))
    : [{ key: 'score', name: 'Score', color: TEAL }];

  /* By subject */
  const subject = subjects.find((s) => s.key === url.subject) || subjects[0] || null;
  const subjectRows = subject ? rows.filter((r) => r.subjectKey === subject.key) : [];
  const search = url.q.trim().toLowerCase();
  const shownRows = subjectRows.filter((r) => rowMatches(url.f, r) && (!search || r.title.toLowerCase().includes(search)));
  const counts = Object.fromEntries(CHAPTER_FILTERS.map((f) => [f.value, subjectRows.filter((r) => rowMatches(f.value, r)).length]));
  const record = useMemo(() => {
    const events = [];
    subjectRows.forEach((r) => {
      if (r.publishedAt) events.push({ at: toTime(r.publishedAt), date: r.published, kind: 'lecture', activity: `Lecture published: ${r.title}`, row: r });
      if (r.submittedAt) events.push({ at: toTime(r.submittedAt), date: r.submitted, kind: 'assessment', activity: `Assessment completed: ${r.title}`, row: r });
    });
    return events.sort((x, y) => y.at - x.at);
  }, [subjectRows]);

  const chapterPage = paged(shownRows, url.p);
  const recordPage = paged(record, url.rp);
  const donePage = paged(done, url.ap);

  const filtered = Boolean(url.q || url.f !== 'all');
  const applyFilters = (e) => {
    e?.preventDefault?.();
    setUrl({ q: draft.q.trim(), f: draft.f, p: '1' });
  };
  const clearFilters = () => {
    setDraft({ q: '', f: 'all' });
    setUrl({ q: '', f: 'all', p: '1' });
  };
  const pickSubject = (key) => {
    setDraft({ q: '', f: 'all' });
    setUrl({ subject: key, f: 'all', q: '', p: '1', rp: '1' });
  };

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'subject', label: 'By subject', count: m ? subjects.length : undefined },
    { value: 'assessments', label: 'Assessments', count: m ? done.length : undefined },
  ];

  return (
    <div className={`spg animate-fade-in${isLoading ? ' is-loading' : ''}`} aria-busy={isLoading}>
      {/* College · department is already in the sidebar header; no context line here (QA 20 Oct). */}
      <TabNav tabs={tabs} value={tab} onChange={setTab} label="Progress views" idBase="spg-tab" />

      {error && !m ? (
        <SectionState
          tone="err"
          title="Could not load your progress"
          action={<button type="button" className="text-link spg-linkbtn" onClick={() => reload().catch(() => {})}>Try again</button>}
        >
          {apiErrorMessage(error, 'Please try again in a moment.')}
        </SectionState>
      ) : null}

      {/* ================================================================ OVERVIEW */}
      <TabPanel value="overview" current={tab} idBase="spg-tab">
        <div className="spg-panel">
          <section className="spg-card spg-kpis" aria-label="Progress summary">
            <div className="spg-kpi">
              <b>{w ? `${w.finished}/${w.total}` : '—'}</b>
              <span>Lectures watched</span>
              <small>{w ? (w.total ? `${w.percent}% of published chapters` : 'No chapters published yet') : ' '}</small>
            </div>
            <i className="sb-rule" aria-hidden="true" />
            <div className="spg-kpi">
              <b>{pct(a?.avg)}</b>
              <span>Assessment average</span>
              <small>{a ? (a.done ? <>Based on {plural(a.done, 'assessment')} · <BandPill score={a.avg} /></> : 'After your first assessment') : ' '}</small>
            </div>
          </section>

          <div className="spg-grid">
            <div className="spg-col">
              <Card title="Completion by subject">
                {isLoading ? <Skeleton rows={2} h={52} /> : subjects.length ? (
                  <MetricList
                    label="Completion by subject"
                    items={subjects.map((s) => ({
                      key: s.key,
                      label: s.name,
                      href: `${SUBJECTS_PATH}?s=${encodeURIComponent(s.key)}`,
                      color: subjectColor(s.key),
                      sub: `${s.watchedCount}/${s.chapterCount} watched`,
                      value: s.completion ?? 0,
                      display: `${s.completion ?? 0}%`,
                    }))}
                  />
                ) : <p className="sb-empty">Your subjects appear once lectures are published for your department.</p>}
              </Card>
              <Card title="Assessment scores">
                {isLoading ? <Skeleton rows={1} h={120} /> : quizTrend.length >= 2 ? (
                  <TrendChart data={quizTrend} series={quizSeries} height={200} suffix="%" />
                ) : (
                  <p className="spg-note"><Icon name="info" size={18} /> {quizTrend.length ? 'One completed assessment. Two or more show a trend.' : 'No assessments yet. Finish a lecture to 100% to unlock its assessment.'}</p>
                )}
              </Card>
            </div>

            <aside className="spg-card spg-next" aria-labelledby="spg-ns-h">
              <div className="spg-next-tag">
                <span className="spg-circle" aria-hidden="true"><Icon name={step?.icon || 'target'} size={20} /></span>
                <span>Recommended next step</span>
              </div>
              {step ? (
                <>
                  <h2 id="spg-ns-h">{step.title}</h2>
                  <p>{step.body}</p>
                  <Link className="spg-btn spg-btn--primary" href={step.primary.href}>
                    <Icon name={step.primary.icon} size={16} /> {step.primary.label}
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
              ) : <Skeleton rows={3} h={20} />}
            </aside>
          </div>
        </div>
      </TabPanel>

      {/* ================================================================ BY SUBJECT */}
      <TabPanel value="subject" current={tab} idBase="spg-tab">
        <div className="spg-panel">
          {subjects.length > 1 ? (
            <div
              className="sb-tabs spg-subj-tabs"
              role="tablist"
              aria-label="Subject"
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                e.preventDefault();
                const i = subjects.findIndex((s) => s.key === subject?.key);
                const next = subjects[(i + (e.key === 'ArrowRight' ? 1 : subjects.length - 1)) % subjects.length];
                pickSubject(next.key);
                document.getElementById(`spg-subj-${next.key}`)?.focus();
              }}
            >
              {subjects.map((s) => (
                <button
                  key={s.key}
                  id={`spg-subj-${s.key}`}
                  type="button"
                  role="tab"
                  className="sb-tab"
                  aria-selected={subject?.key === s.key}
                  tabIndex={subject?.key === s.key ? 0 : -1}
                  onClick={() => pickSubject(s.key)}
                >
                  {s.name} <small className="spg-tab-n">{s.watchedCount}/{s.chapterCount}</small>
                </button>
              ))}
            </div>
          ) : null}

          {isLoading ? <Skeleton rows={4} /> : subject ? (
            <>
              <section className="spg-card spg-subj">
                <div className="spg-subj-h">
                  <span className="spg-circle spg-circle--lg" style={subjectTileStyle(subject.key)} aria-hidden="true"><Icon name="bookOpen" size={22} /></span>
                  <div>
                    <h2>{subject.name}</h2>
                    <p>{plural(subject.chapterCount, 'published chapter')}</p>
                  </div>
                  <Link className="spg-btn spg-subj-open" href={`${SUBJECTS_PATH}?s=${encodeURIComponent(subject.key)}`}>Open subject <Icon name="arrow" size={14} /></Link>
                </div>
                <div className="spg-metrics">
                  <div className="spg-metric">
                    <span>Learning completion</span>
                    <div className="spg-metric-row">
                      <ScoreRing score={subject.completion || 0} size="md" tone="progress" suffix="%" label={`Learning completion ${pct(subject.completion)}`} />
                    </div>
                    <small>{subject.watchedCount} of {plural(subject.chapterCount, 'chapter')} watched</small>
                  </div>
                  <div className="spg-metric">
                    <span>Assessment average</span>
                    <div className="spg-metric-row"><b>{pct(subject.avgScore)}</b>{subject.avgScore != null ? <BandPill score={subject.avgScore} /> : null}</div>
                    <small>{subject.quizDone ? plural(subject.quizDone, 'completed assessment') : 'No assessments completed yet'}</small>
                  </div>
                </div>
              </section>

              <section className="spg-sec" aria-label="Chapter performance">
                <SecHead title="Chapter performance" />
                <form className="sb-filterbar" role="search" aria-label="Filter chapters" onSubmit={applyFilters}>
                  <label className="sb-search">
                    <Icon name="search" size={18} />
                    <input type="search" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} placeholder="Search chapters" aria-label="Search chapters" />
                  </label>
                  <select className="sb-select" aria-label="Chapter status" value={draft.f} onChange={(e) => setDraft((d) => ({ ...d, f: e.target.value }))}>
                    {CHAPTER_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label} ({counts[f.value]})</option>)}
                  </select>
                  <div className="sb-actions">
                    <button type="button" className="sb-btn sb-btn--clear" onClick={clearFilters}>Clear</button>
                    <button type="submit" className="sb-btn sb-btn--go">Search</button>
                  </div>
                </form>
                {shownRows.length ? (
                  <>
                    <div className="sb-rows">
                      {chapterPage.items.map((r, i) => {
                        const c = chapterAction(r);
                        return (
                          <Link key={r.jobId} className="sb-row spg-row" href={c.action.href} aria-label={`${r.title}: ${watchText(r)}, ${c.cell}. ${c.action.label}`}>
                            <span className="sb-row__idx">{idx((chapterPage.page - 1) * PAGE_SIZE + i + 1)}</span>
                            <span className="spg-row-main">
                              <span className="sb-row__title">{r.title}</span>
                              <span className="sb-row__sub">
                                <i className={`sb-dot${r.watchComplete ? '' : ' sb-dot--muted'}`} aria-hidden="true" />
                                {[watchText(r), r.duration ? `${r.duration} lecture` : null].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                            <span className={c.scored ? 'sb-row__score' : `spg-row-state${c.locked ? ' is-locked' : ''}`}>
                              {c.locked ? <Icon name="lock" size={14} /> : null}{c.cell}
                            </span>
                            <span className="spg-row-act">{c.action.label}</span>
                            <Chev />
                          </Link>
                        );
                      })}
                    </div>
                    <Pager page={chapterPage.page} total={shownRows.length} onPage={(n) => setUrl({ p: String(n) })} label="Chapter pages" />
                  </>
                ) : (
                  <div className="spg-card">
                    <p className="sb-empty">
                      No chapters match your filters.
                      {filtered ? <button type="button" className="text-link" onClick={clearFilters}>Clear filters</button> : null}
                    </p>
                  </div>
                )}
              </section>

              <section className="spg-sec" aria-label="Learning record">
                <SecHead title="Learning record" />
                {record.length ? (
                  <>
                    <div className="sb-rows">
                      {recordPage.items.map((e) => (
                        <Link
                          key={`${e.kind}-${e.row.jobId}`}
                          className="sb-row spg-row spg-row--record"
                          href={e.kind === 'assessment' ? assessmentHref(jobOf(e.row), e.row.subjectKey, { view: 'review' }) : classroomHref(e.row.subjectKey, e.row.jobId)}
                        >
                          <span className="spg-row-date">{e.date || '—'}</span>
                          <span className="spg-row-main">
                            <span className="sb-row__title">{e.activity}</span>
                            <span className="sb-row__sub">
                              <i className={`sb-dot${e.kind === 'lecture' ? ' sb-dot--muted' : ''}`} aria-hidden="true" />
                              {e.kind === 'assessment' ? 'Assessment' : `Lecture${e.row.duration ? ` · ${e.row.duration}` : ''}`}
                            </span>
                          </span>
                          {e.kind === 'assessment' ? <span className="sb-row__score">{pct(e.row.score)}</span> : <span className="spg-row-state">Published</span>}
                          <Chev />
                        </Link>
                      ))}
                    </div>
                    <Pager page={recordPage.page} total={record.length} onPage={(n) => setUrl({ rp: String(n) })} label="Learning record pages" />
                  </>
                ) : <div className="spg-card"><p className="sb-empty">Nothing recorded yet.</p></div>}
                <p className="spg-note"><Icon name="info" size={18} /> Your score reflects the assessment. Watching a chapter does not measure mastery.</p>
              </section>
            </>
          ) : (
            <div className="spg-card"><p className="sb-empty">No subjects yet. Your subjects appear once lectures are published for your department.</p></div>
          )}
        </div>
      </TabPanel>

      {/* ================================================================ ASSESSMENTS */}
      <TabPanel value="assessments" current={tab} idBase="spg-tab">
        <div className="spg-panel">
          {/* Score bands beside the summary figures (2 columns on desktop, stacked on phone). */}
          <div className="spg-assess-top">
            <Card title="Score bands" sub={m ? plural(done.length, 'completed assessment') : ' '}>
              {isLoading ? <Skeleton rows={1} h={40} /> : <ModernDonut parts={bandParts} total={done.length} unit={done.length === 1 ? 'Assessment' : 'Assessments'} title="Assessment score bands" empty="No completed assessments yet." />}
            </Card>
            <Card title="Assessment summary" className="spg-assess-sum">
              {isLoading ? <Skeleton rows={3} h={56} /> : (
                <div className="spg-sum">
                  <div className="spg-metric"><span>Total</span><b>{done.length}</b></div>
                  <div className="spg-metric"><span>Average</span><div className="spg-metric-row spg-metric-row--flat"><b>{pct(a?.avg)}</b>{a?.avg != null && done.length ? <BandPill score={a.avg} /> : null}</div></div>
                  <div className="spg-metric"><span>Highest</span><b>{pct(doneBest)}</b></div>
                </div>
              )}
            </Card>
          </div>
          <section className="spg-sec" aria-label="Assessment history">
            <SecHead title="Assessment history" />
            {isLoading ? <Skeleton rows={3} /> : done.length ? (
              <>
                <div className="sb-rows">
                  {donePage.items.map((r, i) => (
                    <Link key={r.jobId} className="sb-row spg-row" href={assessmentHref(jobOf(r), r.subjectKey, { view: 'review' })} aria-label={`${r.title}, ${pct(r.score)}: review answers`}>
                      <span className="sb-row__idx">{idx((donePage.page - 1) * PAGE_SIZE + i + 1)}</span>
                      <span className="spg-row-main">
                        <span className="sb-row__title">{r.title}</span>
                        <span className="sb-row__sub">
                          <i className="sb-dot" style={{ background: subjectColor(r.subjectKey) }} aria-hidden="true" />
                          {[r.subject, r.correct ? `${r.correct} correct` : null, r.submitted].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="sb-row__score">{pct(r.score)}</span>
                      <span className="spg-row-act">Review</span>
                      <Chev />
                    </Link>
                  ))}
                </div>
                <Pager page={donePage.page} total={done.length} onPage={(n) => setUrl({ ap: String(n) })} label="Assessment pages" />
              </>
            ) : (
              <div className="spg-card">
                <p className="sb-empty">No assessments yet. Finish a lecture to 100% to unlock its assessment.<Link className="text-link" href={SUBJECTS_PATH}>Go to My subjects</Link></p>
              </div>
            )}
          </section>
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
