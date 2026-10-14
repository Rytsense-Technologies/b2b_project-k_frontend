'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import {
  FilterBar,
  Icon,
  KpiRow,
  ModuleBanner,
  ModulePage,
  Pager,
  Panel,
  SearchBox,
  SectionState,
  SegTabs,
  countLabel,
} from '@/components/shared/module-ui';
import ScoreCell from '@/components/superadmin/ScoreCell';
import { Meter, RANGES, minutesLabel } from '@/components/admin/insights';
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const COHORT_TABS = [
  { value: 'all', label: 'All' },
  { value: 'not_started', label: 'Not started' },
  { value: 'practising', label: 'Practising' },
  { value: 'ready', label: 'Ready' },
];

const COHORT_STATUS = {
  not_started: { label: 'Not started', cls: '' },
  practising: { label: 'Practising', cls: 'sp-pill--low' },
  ready: { label: 'Interview ready', cls: 'sp-pill--good' },
};

const STUDENT_PAGE = 20;

function pct(v) {
  return v == null ? '—' : `${v}%`;
}

function dateLabel(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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

/**
 * Learning insights (SOW §6.5.2) - shared by College Admin (whole college,
 * department filter) and HOD / Faculty (their department / subjects).
 *   load({ range, department }) -> college_insights payload
 *   showDepartmentFilter        College Admin only
 *   links                       { reports, interviews } hrefs (null hides)
 */
export default function InsightsView({
  load,
  showDepartmentFilter = true,
  title = 'Analytics',
  lede = 'Completion, assessment performance, Q&A demand and interview readiness across your college.',
  links = { reports: '/admin/reports', interviews: '/admin/interviews' },
  notice = null,
}) {
  const [range, setRange] = useState('last_30_days');
  const [department, setDepartment] = useState('');
  const [qaSubject, setQaSubject] = useState('');
  const [cohortTab, setCohortTab] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);

  const { data: deptData } = useAsyncResource(
    () => (showDepartmentFilter
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

  const qaSubjects = data?.qa_demand || [];
  const qa = qaSubjects.find((s) => s.subject === qaSubject) || qaSubjects[0] || null;

  const cohort = data?.interview_cohort || [];
  const cohortShown = cohortTab === 'all' ? cohort : cohort.filter((r) => r.status === cohortTab);
  const cohortCount = (key) => cohort.filter((r) => r.status === key).length;
  const finalYear = cohort.filter((r) => r.final_year);
  const readyFinal = finalYear.filter((r) => r.status === 'ready').length;

  const needle = studentSearch.trim().toLowerCase();
  const students = (data?.students || []).filter((s) => !needle
    || [s.student, s.email, s.department].some((v) => String(v || '').toLowerCase().includes(needle)));
  const studentRows = students.slice((studentPage - 1) * STUDENT_PAGE, studentPage * STUDENT_PAGE);

  const maxBand = Math.max(1, ...(data?.score_distribution || []).map((b) => b.students));

  return (
    <ModulePage className="ad-page ad-analytics">
      <ModuleBanner
        icon="chart"
        eyebrow="Insights"
        title={title}
        lede={lede}
        chips={(
          <>
            <span className="is-on">{rangeLabel}</span>
            {showDepartmentFilter
              ? <span>{department ? (departments.find((d) => d.id === department)?.name || 'One department') : 'All departments'}</span>
              : (data?.department_name ? <span>{data.department_name}</span> : null)}
          </>
        )}
        actions={links.reports ? (
          <Link className="sd-btn sd-btn--glass" href={links.reports}>
            <Icon name="download" size={16} /> Download reports
          </Link>
        ) : null}
      />

      {notice}

      <FilterBar label="Analytics filters">
        <QuirriSelect ariaLabel="Date range" value={range} onChange={(e) => { setRange(e.target.value); setStudentPage(1); }} options={RANGES} />
        {showDepartmentFilter ? (
          <QuirriSelect
            ariaLabel="Filter by department"
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setStudentPage(1); setQaSubject(''); }}
            placeholder="All departments"
            options={[{ value: '', label: 'All departments' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
          />
        ) : null}
        <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()} disabled={loading}>
          <Icon name="refresh" size={16} /> Refresh
        </button>
      </FilterBar>

      {error ? (
        <SectionState
          tone="err"
          title="Could not load analytics"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
        >
          {apiErrorMessage(error, 'Try again in a moment.')}
        </SectionState>
      ) : null}

      <KpiRow
        label="College learning summary"
        items={[
          { icon: 'users', label: 'Active students', value: kpi(t ? countLabel(t.students) : '—'), sub: t?.pending_students ? `${countLabel(t.pending_students)} still to activate` : 'Signed in at least once' },
          { icon: 'playCircle', label: 'Chapter completion', value: kpi(pct(t?.completion)), sub: t ? `${countLabel(t.chapters_completed)} of ${countLabel(t.chapters_available)} chapter views done` : 'Published chapters watched to the end' },
          { icon: 'target', label: 'Average score', value: kpi(pct(t?.avg_score)), sub: t?.pass_rate != null ? `${t.pass_rate}% of quiz attempts passed` : 'Quizzes and mock interviews' },
          { icon: 'clock', label: 'Watch time', value: kpi(t ? minutesLabel(t.watch_minutes) : '—'), sub: t ? `${countLabel(t.qa)} tutor questions · ${countLabel(t.interviews)} interviews` : rangeLabel },
        ]}
      />

      <Panel title="Department performance" sub={`${rangeLabel} · completion is to date`} bodyClassName={null}>
        {first ? <div className="sp-panel-b"><SectionState title="Loading analytics…" /></div> : null}
        {data && !data.departments.length ? (
          <div className="sp-panel-b"><Empty icon="tree" title="No departments yet">{data.note || 'Add departments under Academic structure.'}</Empty></div>
        ) : null}
        {data?.departments?.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-stack">
              <thead>
                <tr>
                  <th>Department</th>
                  <th className="num">Students</th>
                  <th>Completion</th>
                  <th className="num">Watch time</th>
                  <th className="num">Q&amp;A</th>
                  <th className="num">Avg score</th>
                  <th className="num">Pass rate</th>
                  <th className="num">Interview ready</th>
                </tr>
              </thead>
              <tbody>
                {data.departments.map((d) => (
                  <tr key={d.department_id}>
                    <td><b>{d.department}</b></td>
                    <td className="num" data-label="Students">{countLabel(d.students)}</td>
                    <td data-label="Completion"><Meter value={d.completion} /></td>
                    <td className="num" data-label="Watch time">{minutesLabel(d.watch_minutes)}</td>
                    <td className="num" data-label="Q&A">{countLabel(d.qa)}</td>
                    <td className="num" data-label="Avg score"><ScoreCell value={d.avg_score} /></td>
                    <td className="num" data-label="Pass rate">{pct(d.pass_rate)}</td>
                    <td className="num" data-label="Interview ready">
                      {d.final_year_students ? `${pct(d.interview_ready_pct)} of ${countLabel(d.final_year_students)}` : <span className="sa-muted">No final years</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <div className="pm-grid-2">
        <Panel title="Score distribution" sub="Students by their average score (quizzes + interviews)">
          {data && !data.students.some((s) => s.avg_score != null) ? (
            <Empty icon="chart" title="No scores yet">Scores appear after students take chapter quizzes or mock interviews.</Empty>
          ) : (
            <ul className="ad-dist" aria-label="Score distribution">
              {(data?.score_distribution || []).map((b) => (
                <li key={b.band}>
                  <span className="ad-dist-l">{b.band.replace('-', '–')}%</span>
                  <span className="ad-dist-bar"><i style={{ width: `${(b.students / maxBand) * 100}%` }} /></span>
                  <b>{countLabel(b.students)}</b>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Students who need attention"
          sub="Low scores, behind on chapters, or no activity in this period"
          action={data?.at_risk?.length ? <span className="sp-pill sp-pill--low">{countLabel(data.at_risk.length)}</span> : null}
        >
          {data && !data.at_risk.length ? (
            <Empty icon="tick" title="Nobody flagged">Every active student is keeping up in this period.</Empty>
          ) : (
            <ul className="ad-risk">
              {(data?.at_risk || []).slice(0, 8).map((s) => (
                <li key={s.id}>
                  <div>
                    <b>{s.student}</b>
                    <small>{[s.department, s.email].filter(Boolean).join(' · ')}</small>
                  </div>
                  <ul className="ad-chip-list">
                    {s.reasons.map((r) => <li key={r} className="sp-pill sp-pill--low">{r}</li>)}
                  </ul>
                </li>
              ))}
              {data?.at_risk?.length > 8 ? (
                <li className="ad-risk-more">
                  <small>{countLabel(data.at_risk.length - 8)} more — see Student performance below.</small>
                </li>
              ) : null}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Subjects" sub="Content linked to Academic structure · completion to date" bodyClassName={null}>
        {data && !data.subjects.length ? (
          <div className="sp-panel-b">
            <Empty icon="book" title="No subjects yet">
              Add subjects under Academic structure › Programmes &amp; subjects and link uploaded chapters to them.
            </Empty>
          </div>
        ) : null}
        {data?.subjects?.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-stack">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Department</th>
                  <th className="num">Published chapters</th>
                  <th className="num">Learners</th>
                  <th>Completion</th>
                  <th className="num">Quiz attempts</th>
                  <th className="num">Avg score</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((s) => (
                  <tr key={s.subject_id}>
                    <td><b>{s.subject}</b>{s.code ? <small className="ad-cell-sub">{s.code}</small> : null}</td>
                    <td data-label="Department">{s.department || '—'}</td>
                    <td className="num" data-label="Published chapters">{countLabel(s.published_chapters)}</td>
                    <td className="num" data-label="Learners">{countLabel(s.learners)}</td>
                    <td data-label="Completion"><Meter value={s.completion} /></td>
                    <td className="num" data-label="Quiz attempts">{countLabel(s.attempts)}</td>
                    <td className="num" data-label="Avg score"><ScoreCell value={s.avg_score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Q&A demand"
        sub="Top 10 questions students asked the AI tutor, per subject"
        action={qaSubjects.length > 1 ? (
          <QuirriSelect
            ariaLabel="Subject"
            value={qa?.subject || ''}
            onChange={(e) => setQaSubject(e.target.value)}
            options={qaSubjects.map((s) => ({ value: s.subject, label: `${s.subject} (${countLabel(s.total)})` }))}
          />
        ) : null}
      >
        {data && !qaSubjects.length ? (
          <Empty icon="chat" title="No tutor questions in this period">Questions appear when students ask the AI tutor during a lecture.</Empty>
        ) : null}
        {qa ? (
          <ol className="ad-qa">
            {qa.questions.map((q, i) => (
              <li key={`${q.question}-${i}`}>
                <span className="pm-step-n">{i + 1}</span>
                <div>
                  <b>{q.question}</b>
                  {q.chapter ? <small>{q.chapter}</small> : null}
                </div>
                <span className="sp-pill sp-pill--teal">{countLabel(q.count)}×</span>
              </li>
            ))}
          </ol>
        ) : null}
      </Panel>

      <Panel
        title="Interview readiness"
        sub={finalYear.length
          ? `${countLabel(readyFinal)} of ${countLabel(finalYear.length)} final-year students scored 70% or more in a mock interview`
          : 'Final-year students and anyone who practised a mock interview'}
        action={links.interviews ? <Link className="sp-link" href={links.interviews}>Assignments <Icon name="arrow" size={14} /></Link> : null}
        bodyClassName={null}
      >
        <div className="sp-panel-b ad-panel-tools">
          <SegTabs
            label="Readiness"
            value={cohortTab}
            onChange={setCohortTab}
            options={COHORT_TABS.map((o) => ({ ...o, count: data ? (o.value === 'all' ? cohort.length : cohortCount(o.value)) : null }))}
          />
        </div>
        {data && !cohortShown.length ? (
          <div className="sp-panel-b">
            <Empty icon="mic" title={cohort.length ? 'Nobody in this group' : 'No final-year students yet'}>
              {cohort.length ? 'Pick another group.' : 'Set students’ programme and semester so final years are recognised, or assign a mock interview to any year.'}
            </Empty>
          </div>
        ) : null}
        {cohortShown.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-stack">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Department</th>
                  <th className="num">Mocks</th>
                  <th className="num">Best</th>
                  <th className="num">Latest</th>
                  <th>Work on</th>
                  <th>Last mock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {cohortShown.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.student}</b>
                      <small className="ad-cell-sub">{r.final_year ? 'Final year' : r.year_of_study ? `Year ${r.year_of_study}` : 'Year not set'}</small>
                    </td>
                    <td data-label="Department">{r.department || '—'}</td>
                    <td className="num" data-label="Mocks">{countLabel(r.sessions)}</td>
                    <td className="num" data-label="Best"><ScoreCell value={r.best_score} /></td>
                    <td className="num" data-label="Latest"><ScoreCell value={r.last_score} /></td>
                    <td data-label="Work on">{r.weak_area || <span className="sa-muted">—</span>}</td>
                    <td data-label="Last mock">{r.last_at ? dateLabel(r.last_at) : <span className="sa-muted">Never</span>}</td>
                    <td data-label="Status">
                      <span className={`sp-pill ${COHORT_STATUS[r.status].cls}`}>
                        <i className="un-dot" aria-hidden="true" />{COHORT_STATUS[r.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Student performance"
        sub={`${rangeLabel} · ranked by average score`}
        action={links.reports ? <Link className="sp-link" href={links.reports}>Export <Icon name="arrow" size={14} /></Link> : null}
        bodyClassName={null}
      >
        <div className="sp-panel-b ad-panel-tools">
          <SearchBox
            placeholder="Search student, email or department…"
            value={studentSearch}
            onChange={(e) => { setStudentSearch(e.target.value); setStudentPage(1); }}
          />
        </div>
        {data && !students.length ? (
          <div className="sp-panel-b">
            <Empty icon="users" title={needle ? 'No students match' : 'No active students yet'}>
              {needle ? 'Try another name or email.' : 'Students appear here once they activate their account.'}
            </Empty>
          </div>
        ) : null}
        {studentRows.length ? (
          <>
            <div className="sp-table-wrap">
              <table className="sp-table un-table ad-stack">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Department</th>
                    <th>Completion</th>
                    <th className="num">Watch time</th>
                    <th className="num">Q&amp;A</th>
                    <th className="num">Quizzes</th>
                    <th className="num">Interviews</th>
                    <th className="num">Avg score</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((s) => (
                    <tr key={s.id}>
                      <td><b>{s.student}</b><small className="ad-cell-sub">{s.email}</small></td>
                      <td data-label="Department">{s.department || '—'}</td>
                      <td data-label="Completion"><Meter value={s.completion} /></td>
                      <td className="num" data-label="Watch time">{minutesLabel(s.watch_minutes)}</td>
                      <td className="num" data-label="Q&A">{countLabel(s.qa)}</td>
                      <td className="num" data-label="Quizzes">{countLabel(s.assessments)}</td>
                      <td className="num" data-label="Interviews">{countLabel(s.interviews)}</td>
                      <td className="num" data-label="Avg score"><ScoreCell value={s.avg_score} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={studentPage} pageSize={STUDENT_PAGE} total={students.length} shown={studentRows.length} onPage={setStudentPage} noun="students" />
          </>
        ) : null}
      </Panel>
    </ModulePage>
  );
}
