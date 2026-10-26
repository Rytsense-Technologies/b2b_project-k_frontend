'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  DetailDrawer,
  DrawerSection,
  IconButton,
  InfoList,
  KpiRow,
  ModuleHead,
  ModulePage,
  Pager,
  Panel,
  SearchBox,
  SectionState,
  TabNav,
  TabPanel,
  countLabel,
  initials,
} from '@/components/shared/module-ui';
import { BANDS, BandPill, MetricList, ModernDonutCard, bandFor } from '@/components/shared/data-viz';
import ScoreRing from '@/components/shared/ScoreRing';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import { minutesLabel } from '@/components/admin/insights';
import { facultyDirectoryApi } from '@/lib/api/faculty/directory';
import { academicsApi } from '@/lib/api/superadmin/academics';
import { analyticsApi } from '@/lib/api/analytics';
import { mcqApi } from '@/lib/api/mcq';
import { apiErrorMessage, asList, unwrap } from '@/lib/api/superadmin/http';
import { userStatusLabel } from '@/lib/admin/userStatus';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useFacultyScope } from '@/hooks/useFacultyScope';
import { useTabParam, useUrlState } from '@/hooks/useUrlState';
import { scopeChip, ReadOnlyNote, dayLabel, pct } from '@/components/faculty/facultyKit';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending_activation', label: 'Pending activation' },
  { value: 'deactivated', label: 'Deactivated' },
  { value: 'all', label: 'All statuses' },
];
const STATUS_TONE = { active: 'sp-pill--good', pending_activation: 'sp-pill--low', deactivated: 'sp-pill--off' };
const TABS = ['roster', 'performance', 'risk'];

function yearLabel(s) {
  if (s.is_final_year) return 'Final year';
  return s.year_of_study ? `Year ${s.year_of_study}` : 'Year not set';
}

function Score({ value }) {
  if (value == null) return <span className="ad-muted">—</span>;
  return (
    <span className="fa-score">
      <b>{pct(value)}</b>
      <BandPill score={value} />
    </span>
  );
}

function StudentDrawer({ id, onClose, subjectLimited = false }) {
  const { data, loading, error } = useAsyncResource(
    // A malformed ?student= (old or hand-edited link) is "not found" without a request.
    () => (!id ? Promise.resolve(null)
      : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? facultyDirectoryApi.student(id)
        : Promise.reject(Object.assign(new Error('Not found'), { response: { status: 404 } }))),
    [id],
  );
  const [downloading, setDownloading] = useState(null);
  const download = async (jobId) => {
    setDownloading(jobId);
    try {
      await mcqApi.downloadReport(jobId, id);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not download the report'));
    } finally {
      setDownloading(null);
    }
  };
  const m = data?.metrics;
  return (
    <DetailDrawer
      open={Boolean(id)}
      onClose={onClose}
      eyebrow="Student"
      title={data?.name || (loading ? 'Loading…' : error ? 'Student not found' : 'Student')}
      mono={data?.name || null}
      pills={data ? (
        <>
          <span className="sp-pill sp-pill--glass">{data.email}</span>
          <span className={`sp-pill ${STATUS_TONE[data.status] || ''}`}>{userStatusLabel({ status: data.status })}</span>
        </>
      ) : null}
      stats={m ? [
        { label: 'Completion', value: pct(m.completion) },
        { label: 'Quiz average', value: pct(m.quiz_avg) },
        { label: 'Quiz pass rate', value: pct(data.pass_rate) },
      ] : null}
    >
      {error ? (
        <SectionState tone="err" title="Could not load this student">
          {[404, 422].includes(error?.response?.status)
            ? 'This student is not in your scope or no longer exists. Close this panel and pick a student from the list.'
            : apiErrorMessage(error, 'Try again.')}
        </SectionState>
      ) : null}
      {data ? (
        <>
          <DrawerSection title="Placement">
            <InfoList
              items={[
                { label: 'Programme', value: data.program_name || 'Not placed yet' },
                { label: 'Semester', value: data.semester_name || 'Not set' },
                { label: 'Year', value: yearLabel(data) },
                { label: 'Last active', value: dayLabel(data.last_login_at) || 'Never' },
              ]}
            />
          </DrawerSection>
          <DrawerSection title="Learning">
            <InfoList
              items={[
                { label: 'Chapters completed', value: `${countLabel(m.chapters_completed)} of ${countLabel(m.chapters_available)}` },
                { label: 'Watch time', value: minutesLabel(m.watch_minutes) },
                { label: 'Tutor questions', value: countLabel(m.qa) },
                { label: 'Quizzes taken', value: countLabel(data.quizzes.length) },
              ]}
            />
          </DrawerSection>
          <DrawerSection title={`${subjectLimited ? 'Quizzes in your subjects' : 'Chapter quizzes'} (${countLabel(data.quizzes.length)})`}>
            {data.quizzes.length ? (
              <ul className="fa-mini-list">
                {data.quizzes.map((q, i) => (
                  <li key={`${q.chapter}-${q.at}-${i}`}>
                    <div><b>{q.chapter || 'Chapter quiz'}</b><small>{`${q.correct}/${q.total} correct${dayLabel(q.at) ? ` · ${dayLabel(q.at)}` : ''}`}</small></div>
                    <span className="fa-mini-actions">
                      <ScoreRing score={q.score} size="sm" suffix="%" label={`${q.chapter || 'Quiz score'} ${q.score ?? 'no data'}${q.score != null ? '%' : ''}`} />
                      {q.can_download ? (
                        <IconButton
                          icon="download"
                          label={`Download ${q.chapter || 'quiz'} report`}
                          disabled={downloading === q.job_id}
                          onClick={() => download(q.job_id)}
                        />
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="ad-muted">{subjectLimited ? 'No quizzes taken in your subjects yet.' : 'No quizzes taken yet.'}</p>}
          </DrawerSection>
        </>
      ) : null}
    </DetailDrawer>
  );
}

/** Students in scope: roster (server paged), performance and who needs attention (analytics). */
export default function FacultyStudentsPage() {
  const { scope } = useFacultyScope();
  const [tab, setTab] = useTabParam(TABS, 'roster');
  const [url, setUrl] = useUrlState({ q: '', status: 'active', program: '', semester: '', year: '', student: '' });
  const [search, setSearch] = useState(url.q);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { if (search !== url.q) setUrl({ q: search }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  useEffect(() => { setPage(1); }, [url.q, url.status, url.program, url.semester, url.year]);

  // Programme -> Semester options (GET /academics/programs is department-scoped for HOD / Faculty).
  const programs = useAsyncResource(() => academicsApi.listPrograms().then(unwrap), []);
  const programList = useMemo(() => asList(programs.data, []), [programs.data]);
  const semesters = useAsyncResource(
    () => (url.program ? academicsApi.getProgram(url.program).then(unwrap) : Promise.resolve(null)),
    [url.program],
  );
  const semesterList = semesters.data?.semesters || [];
  const maxYears = Math.max(4, ...programList.map((p) => Number(p.duration_years) || 0));

  const status = url.status === 'all' ? '' : url.status;
  const { data, loading, error, reload } = useAsyncResource(
    () => facultyDirectoryApi.students({
      q: url.q, status, programId: url.program, semesterId: url.semester, yearOfStudy: url.year, page, pageSize: PAGE_SIZE,
    }),
    [url.q, status, url.program, url.semester, url.year, page],
  );
  const insights = useAsyncResource(() => analyticsApi.department({}), []);

  const rows = useMemo(() => asList(data, []), [data]);
  const total = data?.total ?? 0;
  const first = loading && !data;
  const filtered = Boolean(url.q || url.status !== 'active' || url.program || url.semester || url.year);
  const clearFilters = () => { setSearch(''); setUrl({ q: '', status: 'active', program: '', semester: '', year: '' }); };
  // Names of the filters that are hiding rows (for the empty state).
  const activeFilters = [
    url.q ? `“${url.q}”` : null,
    url.program ? (programList.find((p) => p.id === url.program)?.name || 'a programme') : null,
    url.semester ? (semesterList.find((x) => x.id === url.semester)?.name || 'a semester') : null,
    url.year ? `Year ${url.year}` : null,
    url.status !== 'active' ? (STATUS_OPTIONS.find((o) => o.value === url.status)?.label || url.status) : null,
  ].filter(Boolean);
  const limited = Boolean(scope && !scope.is_hod && scope.subject_limited);
  const openStudent = (id) => setUrl({ student: id }, { push: true });

  const a = insights.data;
  const aFirst = insights.loading && !a;
  const analyticsStudents = a?.students || [];
  const atRisk = a?.at_risk || [];
  const ranked = analyticsStudents.filter((s) => s.quiz_avg != null)
    .sort((x, y) => y.quiz_avg - x.quiz_avg).slice(0, 10);
  const bandCounts = { strong: 0, ok: 0, focus: 0, none: 0 };
  analyticsStudents.forEach((s) => { bandCounts[bandFor(s.quiz_avg)] += 1; });
  const bandParts = [
    ...BANDS.map((b) => ({ key: b.key, label: b.label, value: bandCounts[b.key] })),
    { key: 'none', label: 'No quizzes yet', value: bandCounts.none },
  ];

  const scopeEmpty = limited
    ? 'Students appear once your College Admin places them in a programme you teach.'
    : 'Students in your department appear here.';

  return (
    <ModulePage className="fa-page">
      <ModuleHead chips={scopeChip(scope)} />

      <ReadOnlyNote scope={scope} what="students" />

      <div className="fa-tabs-fit fa-tabs-fit--3">
      <TabNav
        label="Students"
        idBase="fa-students"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'roster', label: 'Roster', count: data ? total : null },
          { value: 'performance', label: 'Performance' },
          { value: 'risk', label: 'At risk', count: a ? atRisk.length : null },
        ]}
      />
      </div>

      <TabPanel value="roster" current={tab} idBase="fa-students">
        {error ? (
          <SectionState
            tone="err"
            title="Could not load students"
            action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
          >
            {apiErrorMessage(error, 'Please try again.')}
          </SectionState>
        ) : null}
        <Panel
          title={!scope ? 'Students' : limited ? 'Your students' : 'Department students'}
          sub={!data ? null : `${countLabel(total)} student${total === 1 ? '' : 's'}`}
          bodyClassName={null}
          toolbar={(
            <>
              <SearchBox placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {programList.length ? (
                <div className="fa-filter-select">
                  <QuirriSelect
                    ariaLabel="Filter by programme"
                    value={url.program}
                    onChange={(e) => setUrl({ program: e.target.value, semester: '' })}
                    options={[{ value: '', label: 'All programmes' }, ...programList.map((p) => ({ value: p.id, label: p.name }))]}
                  />
                </div>
              ) : null}
              {url.program && semesterList.length ? (
                <div className="fa-filter-select">
                  <QuirriSelect
                    ariaLabel="Filter by semester"
                    value={url.semester}
                    onChange={(e) => setUrl({ semester: e.target.value })}
                    options={[{ value: '', label: 'All semesters' }, ...semesterList.map((s) => ({ value: s.id, label: s.name }))]}
                  />
                </div>
              ) : null}
              <div className="fa-filter-select fa-filter-select--sm">
                <QuirriSelect
                  ariaLabel="Filter by year of study"
                  value={url.year}
                  onChange={(e) => setUrl({ year: e.target.value })}
                  options={[{ value: '', label: 'All years' }, ...Array.from({ length: maxYears }, (_, i) => ({ value: String(i + 1), label: `Year ${i + 1}` }))]}
                />
              </div>
              <div className="fa-filter-select fa-filter-select--sm">
                <QuirriSelect
                  ariaLabel="Filter by account status"
                  value={url.status}
                  onChange={(e) => setUrl({ status: e.target.value })}
                  options={STATUS_OPTIONS}
                />
              </div>
              {filtered ? (
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clearFilters}>
                  Clear
                </button>
              ) : null}
            </>
          )}
        >
          {first ? <div className="sp-panel-b"><SectionState title="Loading students…" /></div> : null}
          {data && !rows.length ? (
            <div className="sp-panel-b">
              <SectionState
                title={filtered ? 'No students match these filters' : 'No students yet'}
                action={filtered ? <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={clearFilters}>Clear filters</button> : null}
              >
                {filtered ? `Filtered by ${activeFilters.join(', ')}.` : scopeEmpty}
              </SectionState>
            </div>
          ) : null}
          {rows.length ? (
            <>
              <div className="sp-table-wrap">
                <table className="sp-table un-table ad-stack fa-click-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Programme</th>
                      <th>Completion</th>
                      <th>Quiz average</th>
                      <th>Tutor questions</th>
                      <th>Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => (
                      <tr key={s.id} onClick={() => openStudent(s.id)}>
                        <td>
                          <button
                            type="button"
                            className="ad-person-btn pm-person"
                            onClick={(e) => { e.stopPropagation(); openStudent(s.id); }}
                          >
                            <span className="pm-av" aria-hidden="true">{initials(s.name, 'S')}</span>
                            <span>
                              <b>{s.name}</b>
                              <small>{s.status === 'active' ? s.email : `${s.email} · ${userStatusLabel({ status: s.status })}`}</small>
                            </span>
                          </button>
                        </td>
                        <td data-label="Programme">
                          <span className="ad-cell-2">
                            <span>{s.program_name || 'Not placed yet'}</span>
                            <small>{[s.semester_name, yearLabel(s)].filter(Boolean).join(' · ')}</small>
                          </span>
                        </td>
                        <td data-label="Completion"><ScoreRing score={s.completion} size="sm" suffix="%" label={`Completion ${s.completion != null ? `${Math.round(s.completion)}%` : 'no data'}`} /></td>
                        <td data-label="Quiz average">
                          <span className="ad-cell-2"><Score value={s.quiz_avg} /><small>{`${countLabel(s.attempt_count)} quiz${s.attempt_count === 1 ? '' : 'zes'}`}</small></span>
                        </td>
                        <td data-label="Tutor questions">{countLabel(s.qa ?? 0)}</td>
                        <td data-label="Last active" className="sa-muted">{dayLabel(s.last_login_at) || 'Never'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={page} pageSize={PAGE_SIZE} total={total} shown={rows.length} onPage={setPage} noun="students" />
            </>
          ) : null}
        </Panel>
      </TabPanel>

      <TabPanel value="performance" current={tab} idBase="fa-students">
        {insights.error ? (
          <SectionState tone="err" title="Could not load performance" action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => insights.reload().catch(() => {})}>Try again</button>}>
            {apiErrorMessage(insights.error, 'Please try again.')}
          </SectionState>
        ) : null}
        {insights.error && !a ? null : (
        <>
        <KpiRow
          label="Performance summary"
          items={[
            { icon: 'users', label: 'Students', value: aFirst ? null : countLabel(a?.totals?.students ?? 0), sub: !scope ? 'In your scope' : limited ? 'In your subjects' : 'In your department' },
            { icon: 'book', label: 'Avg completion', value: aFirst ? null : pct(a?.totals?.completion), sub: 'To date' },
            { icon: 'target', label: 'Quiz average', value: aFirst ? null : pct(a?.totals?.quiz_avg), sub: 'Chapter quizzes, to date' },
            { icon: 'check', label: 'Quiz pass rate', value: aFirst ? null : pct(a?.totals?.pass_rate), sub: 'Of all quiz attempts' },
          ]}
        />
        <div className="dv-grid fa-grid-top">
          <Panel title="Top students">
            {aFirst ? <SectionState title="Loading…" /> : (
              <MetricList
                label="Top students by quiz average"
                suffix="%"
                colorBy="band"
                format={(v) => Math.round(v)}
                empty="No quiz scores yet. Rankings appear once students take chapter quizzes."
                items={ranked.map((s, i) => ({ key: s.id, label: `${i + 1}. ${s.student}`, sub: s.email, value: s.quiz_avg }))}
              />
            )}
          </Panel>
          {aFirst ? (
            <Panel title="Quiz score bands">
              <SectionState title="Loading…" />
            </Panel>
          ) : (
            <ModernDonutCard
              title="Quiz score bands"
              totalLabel="Total students"
              unit="Students"
              parts={bandParts}
              empty="No students in scope yet."
            />
          )}
        </div>
        </>
        )}
      </TabPanel>

      <TabPanel value="risk" current={tab} idBase="fa-students">
        <Panel title="Students who need attention" bodyClassName="">
          {aFirst ? <div className="sp-panel-b"><SectionState title="Loading…" /></div> : null}
          {insights.error ? (
            <div className="sp-panel-b"><SectionState tone="err" title="Could not load">{apiErrorMessage(insights.error, 'Please try again.')}</SectionState></div>
          ) : null}
          {a && !atRisk.length ? (
            <div className="sp-panel-b">
              <SectionState title="No one flagged" />
            </div>
          ) : null}
          {atRisk.length ? (
            <ul className="fa-risk fa-risk--full">
              {atRisk.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => openStudent(s.id)}>
                    <span className="pm-av fa-av" aria-hidden="true">{initials(s.student, 'S')}</span>
                    <span className="sp-row-main">
                      <b>{s.student}</b>
                      <span className="fa-reasons">
                        {s.reasons.map((r) => <span key={r} className="fa-reason">{r}</span>)}
                      </span>
                    </span>
                    <dl className="fa-risk-nums">
                      <div><dt>Completion</dt><dd><ScoreRing score={s.completion} size="sm" suffix="%" label={`Completion ${s.completion != null ? `${Math.round(s.completion)}%` : 'no data'}`} /></dd></div>
                      <div><dt>Quiz average</dt><dd><Score value={s.quiz_avg} /></dd></div>
                      <div><dt>Tutor questions</dt><dd>{countLabel(s.qa ?? 0)}</dd></div>
                    </dl>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
      </TabPanel>

      <StudentDrawer id={url.student || null} onClose={() => setUrl({ student: '' })} subjectLimited={limited} />
    </ModulePage>
  );
}
