'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import {
  Icon,
  KpiRow,
  ModuleHead,
  ModulePage,
  Pager,
  Panel,
  SearchBox,
  SectionState,
  SegTabs,
  TabNav,
  TabPanel,
  countLabel,
  initials,
} from '@/components/shared/module-ui';
import {
  BandPill,
  BarList,
  ColumnChart,
  Distribution,
  RankList,
  bandFor,
  dataColor,
} from '@/components/shared/data-viz';
import { Meter, RANGES, minutesLabel, useTabInView } from '@/components/admin/insights';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { formatPct } from '@/lib/superadmin/format';
import { useTabParam, useUrlSearch, useUrlState } from '@/hooks/useUrlState';

const STUDENT_PAGE = 20;

const COLLEGE_TABS = ['overview', 'departments', 'subjects', 'qa', 'students'];
const DEPARTMENT_TABS = ['overview', 'subjects', 'students', 'qa', 'interviews'];
const TAB_LABELS = {
  overview: 'Overview',
  departments: 'Departments',
  subjects: 'Subjects',
  qa: 'Q&A demand',
  students: 'Students',
  interviews: 'Interviews',
};

/** Design bands (data-viz BANDS) + "no data", keyed as the API's score_bands. */
const BAND_PARTS = [
  { key: 'strong', label: 'Strong (80+)' },
  { key: 'ok', label: 'On track (60–79)' },
  { key: 'focus', label: 'Needs focus (<60)' },
  { key: 'none', label: 'No quizzes yet' },
];

const BAND_FILTERS = [
  { value: '', label: 'All score bands' },
  { value: 'strong', label: 'Strong (80+)' },
  { value: 'ok', label: 'On track (60–79)' },
  { value: 'focus', label: 'Needs focus (<60)' },
  { value: 'none', label: 'No quizzes yet' },
];

/** Cohort status → band colour key (grey / blue / green). */
export const COHORT_PARTS = [
  { status: 'not_started', key: 'none', label: 'Not started' },
  { status: 'practising', key: 'ok', label: 'Practising' },
  { status: 'ready', key: 'strong', label: 'Ready (70%+)' },
];

/** Percentages with one decimal at most, the same as the dashboards and reports. */
/** 20.9 -> "20.9" (one decimal at most, as on the dashboards). */
const oneDecimal = (v) => Number(v).toLocaleString('en-IN', { maximumFractionDigits: 1 });

function pct(v) {
  return v == null || v === '' ? '—' : formatPct(v);
}

/** Q&A subjects come from the lecture's subject; an unlinked upload can leak its file name. */
const FILE_LIKE = /\.(pdf|pptx?|docx?|txt|md|mp4|mov|key|odp)$/i;
function qaSubjectLabel(subject) {
  const s = String(subject || '').trim();
  if (!s || FILE_LIKE.test(s) || /^[0-9a-f-]{32,36}$/i.test(s) || /^(unlinked|unknown|none|null)$/i.test(s)) {
    return 'Not linked to a subject';
  }
  return s;
}

function Empty({ icon, title, children }) {
  return (
    <div className="ad-empty">
      <span className="ad-empty-ic" aria-hidden="true"><Icon name={icon} size={20} /></span>
      <div>
        <b>{title}</b>
        {children ? <small>{children}</small> : null}
      </div>
    </div>
  );
}

function SubjectName({ id, name, code }) {
  return (
    <span className="an-name">
      <i className="dv-dot" style={{ background: dataColor(String(id)) }} aria-hidden="true" />
      <span>
        <b>{name}</b>
        {code ? <small className="ad-cell-sub">{code}</small> : null}
      </span>
    </span>
  );
}

/** One score (quiz average or mock interview average) with its band; "—" when there is none. */
function ScoreCell({ value, pill = true }) {
  if (value == null) return <span className="sa-muted">—</span>;
  return <span className="an-score">{pct(value)}{pill ? <BandPill score={value} /> : null}</span>;
}

function RiskList({ rows, limit, onMore, showDepartment = true }) {
  if (!rows.length) return <Empty icon="tick" title="Nobody flagged">Every active student is keeping up in this period.</Empty>;
  return (
    <ul className="ad-risk">
      {rows.slice(0, limit).map((s) => (
        <li key={s.id}>
          <div className="an-risk-who">
            <span className="pm-av an-av" aria-hidden="true">{initials(s.student, 'S')}</span>
            <div>
              <b>{s.student}</b>
              <small>{[showDepartment ? s.department : null, s.email].filter(Boolean).join(' · ')}</small>
            </div>
          </div>
          <ul className="ad-chip-list">
            {s.reasons.map((r) => (
              <li key={r} className="sp-pill sp-pill--low">{r}</li>
            ))}
          </ul>
        </li>
      ))}
      {rows.length > limit && onMore ? (
        <li className="ad-risk-more">
          <button type="button" className="sp-link an-linkbtn" onClick={onMore}>
            {countLabel(rows.length - limit)} more in Students <Icon name="arrow" size={14} />
          </button>
        </li>
      ) : null}
    </ul>
  );
}

/**
 * Learning insights (SOW §6.5.2) - shared by College Admin (whole college,
 * department filter) and HOD / Faculty (their department / subjects).
 *   load({ range, department }) -> college_insights payload
 *   showDepartmentFilter        College Admin only (Departments tab, department filter / columns)
 *   links                       { reports, interviews } hrefs (null hides)
 *   chips                       scope chips for the module head (the top bar carries title + subtitle)
 */
export default function InsightsView({
  load,
  showDepartmentFilter = true,
  lede = null,
  links = { reports: '/admin/reports', interviews: '/admin/interviews?tab=cohort' },
  chips = null,
  notice = null,
}) {
  const college = showDepartmentFilter;
  const tabs = college ? COLLEGE_TABS : DEPARTMENT_TABS;
  // ?tab= via useTabParam; range / department / Q&A subject in the URL too, so
  // /admin/analytics?tab=departments&department=<id> (dashboard deep links) reopens the same view.
  const [tab, setTab] = useTabParam(tabs, 'overview');
  // Students tab filters live in the URL too (sq = search, band, risk=1, spage), so refresh / Back
  // keep them and the dashboard can link to /admin/analytics?tab=students&risk=1.
  const [url, setUrl] = useUrlState({ range: 'last_30_days', department: '', qa: '', sq: '', band: '', risk: '', spage: '1' });
  const range = RANGES.some((r) => r.value === url.range) ? url.range : 'last_30_days';
  const department = college ? url.department : '';
  useTabInView('an', tab);

  const studentSearch = url.sq;
  const studentBand = BAND_FILTERS.some((b) => b.value === url.band) ? url.band : '';
  const riskOnly = url.risk === '1' ? 'risk' : 'all';
  const studentPage = Math.max(1, Number.parseInt(url.spage, 10) || 1);
  const [searchInput, setSearchInput] = useUrlSearch(studentSearch, (v) => setUrl({ sq: v, spage: '1' }));
  const setStudentPage = (n) => setUrl({ spage: String(n) });
  const setStudentBand = (v) => setUrl({ band: v, spage: '1' });
  const setRiskOnly = (v) => setUrl({ risk: v === 'risk' ? '1' : '', spage: '1' });

  const { data: deptData } = useAsyncResource(
    () => (college
      ? fetchData(() => departmentsApi.list({ is_active: true, page: 1, pageSize: 100 }))
      : Promise.resolve(null)),
    [],
  );
  const departments = useMemo(() => asList(deptData, []), [deptData]);

  const { data, loading, error, reload } = useAsyncResource(
    () => load({ range, department }),
    [range, department],
  );

  const t = data?.totals;
  const rangeLabel = RANGES.find((r) => r.value === range)?.label || '';
  const first = loading && !data;
  const kpi = (v) => (first ? null : v);

  const subjects = data?.subjects || [];
  const deptRows = data?.departments || [];
  const qaSubjects = data?.qa_demand || [];
  const qa = qaSubjects.find((s) => s.subject === url.qa) || qaSubjects[0] || null;
  const cohort = data?.interview_cohort || [];
  const atRisk = data?.at_risk || [];
  const riskIds = useMemo(() => new Set(atRisk.map((r) => r.id)), [atRisk]);

  // Score bands and rankings use each student's QUIZ average, the same number Students > Performance
  // shows; a student with no quizzes counts as "none". The API's score_bands are quiz-based too
  // (college_insights.py); the client count is only a fallback for an older payload.
  const allStudents = data?.students || [];
  const bands = data?.score_bands;
  const bandParts = BAND_PARTS.map((b) => ({
    ...b,
    value: bands ? (bands[b.key] ?? 0) : allStudents.filter((s) => bandFor(s.quiz_avg) === b.key).length,
  }));
  const cohortParts = COHORT_PARTS.map((p) => ({ ...p, value: cohort.filter((r) => r.status === p.status).length }));
  const finalYear = cohort.filter((r) => r.final_year);
  const readyFinal = finalYear.filter((r) => r.status === 'ready').length;

  const needle = studentSearch.trim().toLowerCase();
  const byQuiz = (a, b) => (a.quiz_avg == null) - (b.quiz_avg == null) || (b.quiz_avg ?? 0) - (a.quiz_avg ?? 0)
    || String(a.student).localeCompare(String(b.student));
  const students = (data?.students || []).slice().sort(byQuiz).filter((s) => (!needle
    || [s.student, s.email, s.department].some((v) => String(v || '').toLowerCase().includes(needle)))
    && (!studentBand || bandFor(s.quiz_avg) === studentBand)
    && (riskOnly === 'all' || riskIds.has(s.id)));
  const studentRows = students.slice((studentPage - 1) * STUDENT_PAGE, studentPage * STUDENT_PAGE);
  const scoredStudents = allStudents.filter((s) => s.quiz_avg != null)
    .sort((a, b) => b.quiz_avg - a.quiz_avg || String(a.student).localeCompare(String(b.student)));
  const ranked = scoredStudents.slice(0, 10);
  const bottom = scoredStudents.length > 10 ? scoredStudents.slice(-Math.min(10, scoredStudents.length - 10)) : [];
  // Q&A demand is keyed by subject name; colour it with the subject's id like every other page.
  const subjectIdByName = new Map(subjects.map((s) => [s.subject, String(s.subject_id)]));

  const weakAreas = useMemo(() => {
    const counts = new Map();
    cohort.forEach((r) => { if (r.weak_area) counts.set(r.weak_area, (counts.get(r.weak_area) || 0) + 1); });
    return [...counts].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ key: label, label, value }));
  }, [cohort]);

  // One navigation for both keys (tab has no default in this useUrlState, so it is always written).
  const openQa = (subjectName) => setUrl({ qa: subjectName, tab: 'qa' }, { push: true });
  // Rank rows: who (department for the College Admin) + the quiz / mock split behind the average.
  const rankSub = (s) => [college ? (s.department || s.email) : s.email, s.interview_avg != null ? `Mock ${pct(s.interview_avg)}` : null].filter(Boolean).join(' · ');
  const studentFiltered = Boolean(searchInput.trim() || needle || studentBand || riskOnly !== 'all');
  // Clear unmounts itself: hand focus to the search box (or the first head filter) instead of BODY.
  const focusIn = (selector) => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => document.querySelector(selector)?.focus());
  };
  const clearStudents = () => {
    setSearchInput('');
    setUrl({ sq: '', band: '', risk: '', spage: '1' });
    focusIn('#an-panel-students .pm-panel-tools input, #an-panel-students input[type="search"]');
  };
  const headFiltered = range !== 'last_30_days' || Boolean(department);

  const tabCounts = {
    departments: data ? deptRows.length : null,
    subjects: data ? subjects.length : null,
    qa: data ? qaSubjects.length : null,
    students: data ? data.students.length : null,
    interviews: data ? cohort.length : null,
  };

  const filters = (
    <>
      <QuirriSelect
        ariaLabel="Date range"
        value={range}
        onChange={(e) => setUrl({ range: e.target.value, spage: '1' })}
        options={RANGES}
      />
      {college ? (
        <QuirriSelect
          ariaLabel="Filter by department"
          value={department}
          onChange={(e) => setUrl({ department: e.target.value, qa: '', spage: '1' })}
          placeholder="All departments"
          options={[{ value: '', label: 'All departments' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
        />
      ) : null}
      {headFiltered ? (
        <button
          type="button"
          className="sd-btn sd-btn--ghost sd-btn--sm"
          onClick={() => { setUrl({ range: 'last_30_days', department: '', qa: '', spage: '1' }); focusIn('.an-filters .quirri-dd__trigger'); }}
        >
          Clear
        </button>
      ) : null}
      {links.reports ? (
        <Link className="sd-btn sd-btn--outline" href={links.reports}>
          <Icon name="download" size={16} /> Reports
        </Link>
      ) : null}
    </>
  );

  const loadingState = first ? <SectionState title="Loading analytics…" /> : null;

  return (
    <ModulePage className="ad-page ad-analytics an-page">
      {/* Scope is said once: the department select (College Admin) or the scope chip (HOD / Faculty). */}
      <ModuleHead lede={lede} chips={chips} actions={<div className="an-filters">{filters}</div>} />

      {notice}

      <TabNav
        label="Analytics sections"
        idBase="an"
        value={tab}
        onChange={setTab}
        tabs={tabs.map((v) => ({ value: v, label: TAB_LABELS[v], count: tabCounts[v] ?? undefined }))}
      />

      {error ? (
        <SectionState
          tone="err"
          title="Could not load analytics"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
        >
          {apiErrorMessage(error, 'Try again in a moment.')}
        </SectionState>
      ) : null}

      <TabPanel value="overview" current={tab} idBase="an">
        <KpiRow
          label="Learning summary"
          items={[
            { icon: 'users', label: 'Active students', value: kpi(t ? countLabel(t.students) : '—'), sub: t?.pending_students ? `${countLabel(t.pending_students)} still to activate` : 'Signed in at least once' },
            { icon: 'playCircle', label: 'Chapter completion', value: kpi(pct(t?.completion)), sub: t ? `${countLabel(t.chapters_completed)} of ${countLabel(t.chapters_available)} chapter views done · to date` : 'Published chapters watched to the end · to date' },
            { icon: 'target', label: 'Quiz average', value: kpi(pct(t?.quiz_avg)), sub: t ? (t.quiz_avg == null ? 'No quizzes in this period' : `Pass rate ${pct(t.pass_rate)} (60%+)`) : 'Chapter quizzes' },
            { icon: 'mic', label: 'Mock interview average', value: kpi(pct(t?.interview_avg)), sub: t ? `${countLabel(t.interviews)} mock ${t.interviews === 1 ? 'interview' : 'interviews'}` : 'Mock interviews' },
          ]}
        />
        {loadingState}
        {data ? (
          <div className="dv-grid">
            <Panel title="Students by quiz score" sub={`Each student's quiz average · ${rangeLabel}`}>
              <Distribution parts={bandParts} label="Students by score band" empty="No students yet." />
            </Panel>
            <Panel title="Activity" sub={rangeLabel}>
              <div className="an-facts">
                <div><small>Watch time</small><b>{minutesLabel(t?.watch_minutes)}</b></div>
                <div><small>Tutor questions</small><b>{countLabel(t?.qa)}</b></div>
                <div><small>Quizzes taken</small><b>{countLabel(t?.assessments)}</b></div>
              </div>
            </Panel>
            <Panel
              title={college && !department ? 'Completion by department' : 'Completion by subject'}
              sub={`Published chapters watched to the end · to date · ${college && !department ? 'departments' : 'subjects'} without chapters are left out`}
              action={(
                <button type="button" className="sp-link an-linkbtn" onClick={() => setTab(college && !department ? 'departments' : 'subjects')}>
                  Details <Icon name="arrow" size={14} />
                </button>
              )}
            >
              {college && !department ? (
                <BarList
                  label="Completion by department"
                  max={100}
                  suffix="%"
                  format={oneDecimal}
                  items={deptRows.filter((d) => d.completion != null).map((d) => ({ key: String(d.department_id), label: d.department, value: d.completion, sub: `${countLabel(d.students)} ${d.students === 1 ? 'student' : 'students'}` }))}
                  empty={data.note || 'No department has published chapters yet.'}
                />
              ) : (
                <BarList
                  label="Completion by subject"
                  max={100}
                  suffix="%"
                  format={oneDecimal}
                  items={subjects.filter((s) => s.completion != null).map((s) => ({ key: String(s.subject_id), label: s.subject, value: s.completion, sub: s.code || undefined }))}
                  empty="No subjects with published chapters yet."
                />
              )}
            </Panel>
            <Panel
              title="Students who need attention"
              sub="Low scores, behind on chapters, or no activity in this period"
              action={atRisk.length ? <span className="sp-pill sp-pill--low">{countLabel(atRisk.length)}</span> : null}
            >
              <RiskList rows={atRisk} limit={5} showDepartment={college} onMore={() => { setRiskOnly('risk'); setTab('students'); }} />
            </Panel>
            {college ? (
              <Panel
                className="dv-span-2"
                title="Interview readiness"
                sub={finalYear.length
                  ? `${countLabel(readyFinal)} of ${countLabel(finalYear.length)} final-year students scored 70% or more in a mock interview`
                  : 'Final-year students and anyone who practised a mock interview'}
                action={links.interviews ? <Link className="sp-link" href={links.interviews}>Cohort readiness <Icon name="arrow" size={14} /></Link> : null}
              >
                <Distribution parts={cohortParts} label="Interview readiness" empty="No final-year students or mock interviews yet." />
              </Panel>
            ) : null}
          </div>
        ) : null}
      </TabPanel>

      {college ? (
        <TabPanel value="departments" current={tab} idBase="an">
          {loadingState}
          {data && !deptRows.length ? (
            <SectionState title="No departments yet">{data.note || 'Add departments under Academic structure.'}</SectionState>
          ) : null}
          {deptRows.length ? (
            <>
              <div className="dv-grid">
                <Panel title="Completion" sub="Published chapters watched to the end · to date">
                  <BarList label="Completion by department" max={100} suffix="%" format={oneDecimal}
                    items={deptRows.filter((d) => d.completion != null).map((d) => ({ key: String(d.department_id), label: d.department, value: d.completion }))}
                    empty="No department has published chapters yet." />
                </Panel>
                <Panel title="Quiz average" sub={`Chapter quizzes · ${rangeLabel}`}>
                  <BarList label="Quiz average by department" max={100} suffix="%" colorBy="band" format={oneDecimal}
                    items={deptRows.filter((d) => d.quiz_avg != null).map((d) => ({ key: String(d.department_id), label: d.department, value: d.quiz_avg, sub: `Mock interviews ${pct(d.interview_avg)}` }))}
                    empty="No quizzes in this period." />
                </Panel>
              </div>
              <Panel title="Department performance" sub={`${rangeLabel} · completion is to date`} bodyClassName={null}>
                <div className="sp-table-wrap">
                  <table className="sp-table un-table ad-stack">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th className="num">Students</th>
                        <th>Completion</th>
                        <th className="num">Watch time</th>
                        <th className="num">Q&amp;A</th>
                        <th>Quiz avg</th>
                        <th>Mock avg</th>
                        <th className="num">Pass rate</th>
                        <th className="num">Interview ready</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deptRows.map((d) => (
                        <tr key={d.department_id}>
                          <td><SubjectName id={d.department_id} name={d.department} /></td>
                          <td className="num" data-label="Students">{countLabel(d.students)}</td>
                          <td data-label="Completion"><Meter value={d.completion} color={dataColor(String(d.department_id))} /></td>
                          <td className="num" data-label="Watch time">{minutesLabel(d.watch_minutes)}</td>
                          <td className="num" data-label="Q&A">{countLabel(d.qa)}</td>
                          <td data-label="Quiz avg"><ScoreCell value={d.quiz_avg} /></td>
                          <td data-label="Mock avg"><ScoreCell value={d.interview_avg} pill={false} /></td>
                          <td className="num" data-label="Pass rate">{pct(d.pass_rate)}</td>
                          <td className="num" data-label="Interview ready">
                            {d.final_year_students ? `${pct(d.interview_ready_pct)} of ${countLabel(d.final_year_students)}` : <span className="sa-muted">No final years</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          ) : null}
        </TabPanel>
      ) : null}

      <TabPanel value="subjects" current={tab} idBase="an">
        {loadingState}
        {data && !subjects.length ? (
          <SectionState title="No subjects yet">
            {college
              ? 'Add subjects under Academic structure › Programmes & subjects and link uploaded chapters to them.'
              : 'Subjects appear here once chapters are linked to them.'}
          </SectionState>
        ) : null}
        {subjects.length ? (
          <>
            <div className="dv-grid">
              <Panel title="Completion by subject" sub="Published chapters watched to the end · to date">
                <BarList label="Completion by subject" max={100} suffix="%" format={oneDecimal}
                  items={subjects.filter((s) => s.completion != null).map((s) => ({ key: String(s.subject_id), label: s.subject, value: s.completion }))}
                    empty="No subject has published chapters yet." />
              </Panel>
              <Panel title="Average quiz score" sub={`Chapter quizzes · ${rangeLabel}`}>
                <ColumnChart
                  data={subjects.filter((s) => s.avg_score != null).map((s) => ({ label: s.code || s.subject, value: Math.round(s.avg_score) }))}
                  name="Avg score"
                  colorBy="band"
                  suffix="%"
                  height={200}
                  empty="No quiz attempts in this period."
                />
              </Panel>
            </div>
            <Panel title="Subjects" sub="Select a row to open that subject's top tutor questions (Q&A demand)" bodyClassName={null}>
              <div className="sp-table-wrap">
                <table className="sp-table un-table ad-stack an-click">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      {college ? <th>Department</th> : null}
                      <th className="num">Published chapters</th>
                      <th className="num">Learners</th>
                      <th>Completion</th>
                      <th className="num">Quiz attempts</th>
                      <th>Quiz avg</th>
                      <th className="num">Pass rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s) => (
                      <tr
                        key={s.subject_id}
                        tabIndex={0}
                        onClick={() => openQa(s.subject)}
                        onKeyDown={(e) => { if (e.key === 'Enter') openQa(s.subject); }}
                        aria-label={`${s.subject}: open Q&A demand`}
                      >
                        <td><SubjectName id={s.subject_id} name={s.subject} code={s.code} /></td>
                        {college ? <td data-label="Department">{s.department || '—'}</td> : null}
                        <td className="num" data-label="Published chapters">{countLabel(s.published_chapters)}</td>
                        <td className="num" data-label="Learners">{countLabel(s.learners)}</td>
                        <td data-label="Completion"><Meter value={s.completion} color={dataColor(String(s.subject_id))} /></td>
                        <td className="num" data-label="Quiz attempts">{countLabel(s.attempts)}</td>
                        <td data-label="Quiz avg"><ScoreCell value={s.avg_score} /></td>
                        <td className="num" data-label="Pass rate">{pct(s.pass_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        ) : null}
      </TabPanel>

      <TabPanel value="qa" current={tab} idBase="an">
        {loadingState}
        {data && !qaSubjects.length ? (
          <SectionState title="No tutor questions to group yet">
            Top questions appear once students ask the AI tutor about lecture content in this period.
          </SectionState>
        ) : null}
        {qaSubjects.length ? (
          <div className="dv-grid an-qa">
            <Panel title="Questions by subject" sub={`Tutor questions about lecture content · ${rangeLabel}`}>
              <BarList
                label="Questions by subject"
                items={qaSubjects.map((s) => ({ key: subjectIdByName.get(s.subject) || s.subject, label: qaSubjectLabel(s.subject), value: s.total }))}
              />
            </Panel>
            <Panel
              title="Top 10 questions"
              sub={qa ? qaSubjectLabel(qa.subject) : ''}
              toolbar={qaSubjects.length > 1 ? (
                <QuirriSelect
                  ariaLabel="Subject"
                  value={qa?.subject || ''}
                  onChange={(e) => setUrl({ qa: e.target.value })}
                  options={qaSubjects.map((s) => ({ value: s.subject, label: `${qaSubjectLabel(s.subject)} (${countLabel(s.total)})` }))}
                />
              ) : null}
            >
              <RankList
                label="Top questions"
                showBand={false}
                suffix="×"
                rows={(qa?.questions || []).map((q, i) => ({ key: `${q.question}-${i}`, name: q.question, sub: q.chapter || undefined, value: q.count }))}
                empty="No questions for this subject."
              />
            </Panel>
          </div>
        ) : null}
      </TabPanel>

      <TabPanel value="students" current={tab} idBase="an">
        {loadingState}
        {data ? (
          <>
            <div className="dv-grid">
              <Panel title="Top 10 by quiz average" sub={`Chapter quizzes · ${rangeLabel}`}>
                <RankList
                  label="Top students"
                  suffix="%"
                  format={oneDecimal}
                  rows={ranked.map((s) => ({ key: s.id, name: s.student, sub: rankSub(s), value: s.quiz_avg }))}
                  empty="No scores in this period."
                />
              </Panel>
              <Panel
                title="Lowest quiz averages"
                sub={bottom.length ? `Bottom ${countLabel(bottom.length)} of ${countLabel(scoredStudents.length)} scored students` : 'Shown once more than 10 students have taken quizzes'}
              >
                <RankList
                  label="Lowest scores"
                  suffix="%"
                  format={oneDecimal}
                  start={scoredStudents.length - bottom.length + 1}
                  rows={bottom.map((s) => ({ key: s.id, name: s.student, sub: rankSub(s), value: s.quiz_avg }))}
                  empty="Fewer than 11 students have taken quizzes in this period."
                />
              </Panel>
              <Panel
                title="Students who need attention"
                sub="Low scores, behind on chapters, or no activity"
                action={atRisk.length ? <span className="sp-pill sp-pill--low">{countLabel(atRisk.length)}</span> : null}
              >
                <RiskList rows={atRisk} limit={6} showDepartment={college} onMore={() => setRiskOnly('risk')} />
              </Panel>
            </div>
            <Panel
              title="Student performance"
              sub={`${countLabel(students.length)} ${students.length === 1 ? 'student' : 'students'} · ${rangeLabel} · ranked by quiz average`}
              bodyClassName={null}
              toolbar={(
                <>
                  <SearchBox
                    placeholder={college ? 'Search student, email or department…' : 'Search student or email…'}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <QuirriSelect ariaLabel="Score band" value={studentBand} onChange={(e) => setStudentBand(e.target.value)} options={BAND_FILTERS} />
                  <SegTabs
                    label="Students shown"
                    value={riskOnly}
                    onChange={setRiskOnly}
                    options={[{ value: 'all', label: 'All' }, { value: 'risk', label: 'Need attention', count: atRisk.length }]}
                  />
                  {studentFiltered ? (
                    <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clearStudents}>Clear</button>
                  ) : null}
                </>
              )}
            >
              {!students.length ? (
                <div className="sp-panel-b">
                  <Empty icon="users" title={studentFiltered ? 'No students match' : 'No active students yet'}>
                    {studentFiltered ? 'Change the search or filters, or use Clear.' : 'Students appear here once they activate their account.'}
                  </Empty>
                </div>
              ) : (
                <>
                  <div className="sp-table-wrap">
                    <table className="sp-table un-table ad-stack">
                      <thead>
                        <tr>
                          <th>Student</th>
                          {college ? <th>Department</th> : null}
                          <th>Completion</th>
                          <th className="num">Watch time</th>
                          <th className="num">Q&amp;A</th>
                          <th className="num">Quizzes</th>
                          <th className="num">Interviews</th>
                          <th>Quiz avg</th>
                          <th>Mock avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentRows.map((s) => (
                          <tr key={s.id}>
                            <td><b>{s.student}</b><small className="ad-cell-sub">{s.email}</small></td>
                            {college ? <td data-label="Department">{s.department || '—'}</td> : null}
                            <td data-label="Completion"><Meter value={s.completion} /></td>
                            <td className="num" data-label="Watch time">{minutesLabel(s.watch_minutes)}</td>
                            <td className="num" data-label="Q&A">{countLabel(s.qa)}</td>
                            <td className="num" data-label="Quizzes">{countLabel(s.assessments)}</td>
                            <td className="num" data-label="Interviews">{countLabel(s.interviews)}</td>
                            <td data-label="Quiz avg"><ScoreCell value={s.quiz_avg} /></td>
                            <td data-label="Mock avg"><ScoreCell value={s.interview_avg} pill={false} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pager page={studentPage} pageSize={STUDENT_PAGE} total={students.length} shown={studentRows.length} onPage={setStudentPage} noun="students" />
                </>
              )}
            </Panel>
          </>
        ) : null}
      </TabPanel>

      {!college ? (
        <TabPanel value="interviews" current={tab} idBase="an">
          {loadingState}
          {data ? (
            <div className="dv-grid">
              <Panel
                title="Interview readiness"
                sub={finalYear.length
                  ? `${countLabel(readyFinal)} of ${countLabel(finalYear.length)} final-year students scored 70% or more in a mock interview`
                  : 'Final-year students and anyone who practised a mock interview'}
                action={links.interviews ? <Link className="sp-link" href={links.interviews}>Cohort readiness <Icon name="arrow" size={14} /></Link> : null}
              >
                <Distribution parts={cohortParts} label="Interview readiness" empty="No final-year students or mock interviews yet." />
                {deptRows[0]?.final_year_students ? (
                  <p className="an-note">{pct(deptRows[0].interview_ready_pct)} of final-year students in {data.department_name || 'your department'} are interview ready.</p>
                ) : null}
              </Panel>
              <Panel title="What to work on" sub="Most common weak area across students' mock interviews">
                <BarList label="Weak areas" items={weakAreas} empty="Weak areas appear after students finish a mock interview." />
              </Panel>
            </div>
          ) : null}
        </TabPanel>
      ) : null}
    </ModulePage>
  );
}
