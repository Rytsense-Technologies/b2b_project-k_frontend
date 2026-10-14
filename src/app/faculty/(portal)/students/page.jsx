'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DetailDrawer,
  DrawerSection,
  FilterBar,
  Icon,
  IconButton,
  InfoList,
  KpiRow,
  ModuleBanner,
  ModulePage,
  Pager,
  Panel,
  SearchBox,
  SectionState,
  SegTabs,
  countLabel,
  initials,
} from '@/components/shared/module-ui';
import ScoreCell from '@/components/superadmin/ScoreCell';
import ScopeNotice from '@/components/faculty/ScopeNotice';
import { Meter, minutesLabel } from '@/components/admin/insights';
import toast from 'react-hot-toast';
import { facultyDirectoryApi } from '@/lib/api/faculty/directory';
import { mcqApi } from '@/lib/api/mcq';
import { apiErrorMessage, asList } from '@/lib/api/superadmin/http';
import { userStatusLabel } from '@/lib/admin/userStatus';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useFacultyScope } from '@/hooks/useFacultyScope';

const PAGE_SIZE = 25;
const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending_activation', label: 'Pending' },
  { value: 'deactivated', label: 'Deactivated' },
];
const STATUS_TONE = { active: 'sp-pill--good', pending_activation: 'sp-pill--low', deactivated: 'sp-pill--off' };

function day(iso) {
  const d = new Date(iso || '');
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function yearLabel(s) {
  if (s.is_final_year) return 'Final year';
  return s.year_of_study ? `Year ${s.year_of_study}` : 'Year not set';
}

function StudentDrawer({ id, onClose }) {
  const { data, loading, error } = useAsyncResource(
    () => (id ? facultyDirectoryApi.student(id) : Promise.resolve(null)),
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
      title={data?.name || (loading ? 'Loading…' : 'Student')}
      mono={data?.name || null}
      pills={data ? (
        <>
          <span className="sp-pill sp-pill--glass">{data.email}</span>
          <span className={`sp-pill ${STATUS_TONE[data.status] || ''}`}>{userStatusLabel({ status: data.status })}</span>
        </>
      ) : null}
      stats={m ? [
        { label: 'Completion', value: m.completion != null ? `${m.completion}%` : '—' },
        { label: 'Average score', value: m.avg_score != null ? `${m.avg_score}%` : '—' },
      ] : null}
    >
      {error ? <SectionState tone="err" title="Could not load this student">{apiErrorMessage(error, 'Try again.')}</SectionState> : null}
      {data ? (
        <>
          <DrawerSection title="Placement">
            <InfoList
              items={[
                { label: 'Programme', value: data.program_name || 'Not set' },
                { label: 'Semester', value: data.semester_name || 'Not set' },
                { label: 'Year', value: yearLabel(data) },
                { label: 'Last active', value: day(data.last_login_at) || 'Never' },
              ]}
            />
          </DrawerSection>
          <DrawerSection title="Learning">
            <InfoList
              items={[
                { label: 'Chapters completed', value: `${countLabel(m.chapters_completed)} of ${countLabel(m.chapters_available)}` },
                { label: 'Watch time', value: minutesLabel(m.watch_minutes) },
                { label: 'Tutor questions', value: countLabel(m.qa) },
                { label: 'Quiz pass rate', value: data.pass_rate != null ? `${data.pass_rate}%` : '—' },
              ]}
            />
          </DrawerSection>
          <DrawerSection title={`Chapter quizzes (${countLabel(data.quizzes.length)})`}>
            {data.quizzes.length ? (
              <ul className="fa-mini-list">
                {data.quizzes.map((q, i) => (
                  <li key={`${q.chapter}-${q.at}-${i}`}>
                    <div><b>{q.chapter || 'Chapter quiz'}</b><small>{`${q.correct}/${q.total} correct · ${day(q.at) || ''}`}</small></div>
                    <span className="fa-mini-actions">
                      <ScoreCell value={q.score} />
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
            ) : <p className="ad-muted">No quizzes taken yet.</p>}
          </DrawerSection>
          <DrawerSection title={`Mock interviews (${countLabel(data.interviews.length)})`}>
            {data.work_on ? <p className="ad-muted">Work on: <b>{data.work_on}</b></p> : null}
            {data.interviews.length ? (
              <ul className="fa-mini-list">
                {data.interviews.map((r) => (
                  <li key={r.session_id}>
                    <div><b>{r.position || 'Mock interview'}</b><small>{[day(r.at), r.work_on ? `Work on ${r.work_on}` : null].filter(Boolean).join(' · ')}</small></div>
                    <ScoreCell value={r.score} />
                  </li>
                ))}
              </ul>
            ) : <p className="ad-muted">No mock interviews yet.</p>}
          </DrawerSection>
        </>
      ) : null}
    </DetailDrawer>
  );
}

export default function FacultyStudentsPage() {
  const { scope } = useFacultyScope();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  useEffect(() => { setPage(1); }, [search, status]);

  const { data, loading, error, reload } = useAsyncResource(
    () => facultyDirectoryApi.students({ q: search, status, page, pageSize: PAGE_SIZE }),
    [search, status, page],
  );
  const rows = useMemo(() => asList(data, []), [data]);
  const total = data?.total ?? 0;
  const first = loading && !data;
  const filtered = Boolean(search || status);

  return (
    <ModulePage className="fa-page">
      <ModuleBanner
        icon="users"
        eyebrow="Teaching"
        title="Students"
        lede="Your students' chapter completion, quiz scores, tutor questions and mock interviews. Open a student for the full record."
      />

      <ScopeNotice scope={scope} what="students" />

      <KpiRow
        label="Students summary"
        items={[
          { icon: 'users', label: filtered ? 'Matching students' : 'Students', value: first ? null : countLabel(total), sub: scope?.subject_limited ? 'In your subjects' : 'In your department' },
          { icon: 'target', label: 'With quiz scores', value: first ? null : countLabel(data?.summary?.with_scores ?? 0), sub: 'Took at least one chapter quiz' },
          { icon: 'mic', label: 'Final year', value: first ? null : countLabel(data?.summary?.final_year ?? 0), sub: 'Eligible for mock interviews' },
          { icon: 'tree', label: 'Not in a programme', value: first ? null : countLabel(data?.summary?.unplaced ?? 0), sub: 'College Admin places them' },
        ]}
      />

      <FilterBar label="Find students">
        <SearchBox placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <SegTabs label="Status" options={STATUS_TABS} value={status} onChange={setStatus} />
      </FilterBar>

      {error ? (
        <SectionState
          tone="err"
          title="Could not load students"
          action={<button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload()}>Try again</button>}
        >
          {apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      ) : null}

      <Panel title="Your students" sub={`${countLabel(total)} student${total === 1 ? '' : 's'}`} bodyClassName={null}>
        {first ? <div className="sp-panel-b"><SectionState title="Loading students…" /></div> : null}
        {data && !rows.length ? (
          <div className="sp-panel-b">
            <SectionState title={filtered ? 'No students match' : 'No students yet'}>
              {filtered
                ? 'Try another name, email or status.'
                : scope?.subject_limited
                  ? 'Students appear once your College Admin places them in a programme you teach.'
                  : 'Students in your department appear here.'}
            </SectionState>
          </div>
        ) : null}
        {rows.length ? (
          <>
            <div className="sp-table-wrap">
              <table className="sp-table un-table ad-stack">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Programme</th>
                    <th>Completion</th>
                    <th className="num">Quizzes</th>
                    <th className="num">Interviews</th>
                    <th className="num">Avg score</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <button type="button" className="ad-person-btn pm-person" onClick={() => setOpenId(s.id)}>
                          <span className="pm-av" aria-hidden="true">{initials(s.name, 'S')}</span>
                          <span><b>{s.name}</b><small>{s.email}</small></span>
                        </button>
                      </td>
                      <td data-label="Programme">
                        <span className="ad-cell-2">
                          <span>{s.program_name || 'Not set'}</span>
                          <small>{[s.semester_name, yearLabel(s)].filter(Boolean).join(' · ')}</small>
                        </span>
                      </td>
                      <td data-label="Completion"><Meter value={s.completion} /></td>
                      <td className="num" data-label="Quizzes">{countLabel(s.attempt_count)}</td>
                      <td className="num" data-label="Interviews">{countLabel(s.interviews)}</td>
                      <td className="num" data-label="Avg score"><ScoreCell value={s.avg_score} /></td>
                      <td data-label="Status">
                        <span className={`sp-pill ${STATUS_TONE[s.status] || ''}`}><i className="un-dot" aria-hidden="true" />{userStatusLabel({ status: s.status })}</span>
                      </td>
                      <td>
                        <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setOpenId(s.id)}>
                          <Icon name="eye" size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={PAGE_SIZE} total={total} shown={rows.length} onPage={setPage} noun="students" />
          </>
        ) : null}
      </Panel>

      <StudentDrawer id={openId} onClose={() => setOpenId(null)} />
    </ModulePage>
  );
}
