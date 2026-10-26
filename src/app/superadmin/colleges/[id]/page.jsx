'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ModulePage,
  RecordHero,
  TabNav,
  TabPanel,
  KpiRow,
  Panel,
  StatusPill,
  InfoList,
  DangerZone,
  Icon,
  SectionState,
  countLabel,
  initials,
} from '@/components/shared/module-ui';
import { MetricListCard, ModernDonut, ModernDonutCard, BandPill } from '@/components/shared/data-viz';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import {
  collegeStats, adminStatus, CollegeFormModal, StatusConfirm, EMPTY_FORM, NEAR_CAP_PCT,
} from '@/components/superadmin/colleges/collegeParts';
import {
  collegesApi, universitiesApi, departmentsApi, reportsApi, fetchData,
} from '@/lib/api/superadmin/modules';
import { usersApi } from '@/lib/api/superadmin/users';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useUrlState, useTabParam } from '@/hooks/useUrlState';
import { formatCount, formatDate, formatIndianPhone, formatMinutes, formatPct } from '@/lib/superadmin/format';
import { INDIA_COUNTRY } from '@/lib/india';

const TAB_KEYS = ['overview', 'departments', 'admins', 'learning'];

const RANGES = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'this_semester', label: 'This semester' },
  { value: 'all_time', label: 'All time' },
];

function CollegeView() {
  const { id } = useParams();
  const [tab] = useTabParam(TAB_KEYS, 'overview');
  const [url, setUrl] = useUrlState({ range: 'last_30_days' });
  const range = RANGES.some((r) => r.value === url.range) ? url.range : 'last_30_days';
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(null);

  const { data: college, loading, error, reload } = useAsyncResource(
    () => fetchData(() => collegesApi.get(id)),
    [id],
  );
  const { data: deptData, loading: deptLoading, reload: reloadDepts } = useAsyncResource(
    () => fetchData(() => departmentsApi.list({ college_id: id, page: 1, pageSize: 100 })),
    [id],
  );
  const { data: institution } = useAsyncResource(
    () => fetchData(() => reportsApi.preview({ report_type: 'institution', college: id, range, page_size: 1 })),
    [id, range],
  );
  const { data: deptReport, loading: deptReportLoading } = useAsyncResource(
    () => fetchData(() => reportsApi.preview({ report_type: 'department', college: id, range, page_size: 100 })),
    [id, range],
  );
  const { data: uniData } = useAsyncResource(
    () => (editOpen ? fetchData(() => universitiesApi.list({ page: 1, page_size: 100 })) : Promise.resolve(null)),
    [editOpen],
  );

  const departments = useMemo(() => asList(deptData, []), [deptData]);
  const learning = asList(institution?.rows, [])[0] || null;
  const deptRows = useMemo(() => asList(deptReport?.rows, []), [deptReport]);
  const admins = Array.isArray(college?.admins) ? college.admins : [];
  const s = college ? collegeStats(college) : null;

  const handleResend = async (admin) => {
    setResendingEmail(admin.email);
    try {
      await usersApi.resendInvite(admin.email);
      toast.success(`Invite resent to ${admin.email}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not resend the invite'));
    } finally {
      setResendingEmail(null);
    }
  };

  const handleToggle = async () => {
    setBusy(true);
    try {
      if (s.active) {
        await collegesApi.deactivate(id);
        toast.success('College deactivated');
      } else {
        await collegesApi.reactivate(id);
        toast.success('College reactivated');
      }
      setConfirmOpen(false);
      await reload();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update status'));
    } finally {
      setBusy(false);
    }
  };

  if (error && !college) {
    const missing = error?.response?.status === 404;
    return (
      <ModulePage className="sa-page">
        <Link className="sp-link sa-back" href="/superadmin/colleges"><Icon name="back" size={14} /> All colleges</Link>
        <SectionState
          tone="err"
          title={missing ? 'College not found' : 'Could not load this college'}
          action={missing ? (
            <Link className="sd-btn sd-btn--ghost sd-btn--sm" href="/superadmin/colleges">Back to colleges</Link>
          ) : (
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => reload().catch(() => {})}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          )}
        >
          {missing ? 'The link may be wrong, or the college was removed.' : apiErrorMessage(error, 'Please try again.')}
        </SectionState>
      </ModulePage>
    );
  }
  if (loading && !college) {
    return (
      <ModulePage className="sa-page">
        <Link className="sp-link sa-back" href="/superadmin/colleges"><Icon name="back" size={14} /> All colleges</Link>
        <SectionState title="Loading college…" />
      </ModulePage>
    );
  }
  if (!college) return null;

  const pendingAdmins = admins.filter((a) => String(a.status).includes('pending')).length;
  const completion = learning?.completion;
  // Quiz average (reports.py quiz_avg); avg_score only for an older payload without it.
  const quizScore = (r) => (r && 'quiz_avg' in r ? r.quiz_avg : r?.avg_score);
  const avgScore = quizScore(learning);
  const editDefaults = {
    ...EMPTY_FORM,
    name: college.name ?? '',
    code: college.code ?? '',
    country: INDIA_COUNTRY.code,
    state: college.state ?? '',
    district: college.district ?? '',
    city: college.city ?? '',
    pincode: college.pincode ?? '',
    student_seat_cap: college.student_seat_cap ?? '',
    university_id: college.university_id ? String(college.university_id) : '',
  };

  const studentsByDept = departments
    .filter((d) => d.is_active !== false)
    .map((d) => ({ key: String(d.id), label: d.name, sub: d.code || null, value: Number(d.student_count) || 0 }))
    .sort((a, b) => b.value - a.value);
  const learningBars = (pick) => deptRows
    .map((r) => ({ key: String(r.id), label: r.department, value: pick(r) == null ? null : Number(pick(r)) }))
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));

  const setTab = (v) => setUrl({ tab: v === 'overview' ? null : v }, { push: true });

  return (
    <ModulePage className="sa-page">
      <Link className="sp-link sa-back" href="/superadmin/colleges"><Icon name="back" size={14} /> All colleges</Link>

      <RecordHero
        overline={s.university || 'College'}
        title={college.name}
        mono={college.name}
        muted={!s.active}
        meta={(
          <>
            {college.code ? <span className="un-code">{college.code}</span> : null}
            <StatusPill active={s.active} />
            {s.location ? <span className="sa-muted sa-meta-loc"><Icon name="pin" size={13} /> {s.location}</span> : null}
          </>
        )}
        facts={[
          { label: 'Students / seat cap', value: `${formatCount(s.students) || 0} / ${s.cap ? formatCount(s.cap) : '—'}`, tone: s.pct >= NEAR_CAP_PCT ? 'amber' : null },
          { label: 'Departments', value: deptLoading && !deptData ? '…' : countLabel(departments.length) },
          { label: 'Administrators', value: countLabel(admins.length), tone: pendingAdmins ? 'amber' : null },
        ]}
      >
        <div className="sa-record-actions">
          <button type="button" className="sd-btn sd-btn--amber" onClick={() => setEditOpen(true)}>
            <Icon name="edit" size={16} /> Edit college
          </button>
        </div>
      </RecordHero>

      <div className="sa-tabrow">
        <TabNav
          label="College sections"
          idBase="college"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'departments', label: 'Departments', count: deptData ? departments.length : undefined },
            { value: 'admins', label: 'Admins', count: admins.length },
            { value: 'learning', label: 'Learning' },
          ]}
        />
        {tab === 'overview' || tab === 'learning' ? (
          <div className="sa-range">
            <QuirriSelect ariaLabel="Date range" value={range} onChange={(e) => setUrl({ range: e.target.value })} options={RANGES} />
          </div>
        ) : null}
      </div>

      <TabPanel value="overview" current={tab} idBase="college">
        <KpiRow
          label="Learning summary"
          items={[
            { icon: 'tick', label: 'Completion', value: learning ? (completion == null ? '—' : `${completion}%`) : null, sub: learning ? <BandPill score={completion} /> : null },
            { icon: 'chart', label: 'Quiz average', value: learning ? (avgScore == null ? '—' : `${avgScore}%`) : null, sub: learning ? <BandPill score={avgScore} /> : null },
            { icon: 'clock', label: 'Watch time', value: learning ? formatMinutes(learning.watch_minutes || 0) : null },
            { icon: 'chat', label: 'Q&A turns', value: learning ? formatCount(learning.qa || 0) : null, sub: `${formatCount(learning?.assessments || 0)} ${Number(learning?.assessments) === 1 ? 'quiz' : 'quizzes'} taken` },
          ]}
        />
        <div className="dv-grid">
          <Panel title="Details">
            <InfoList
              items={[
                { label: 'University', value: s.university, full: true },
                { label: 'College code', value: college.code },
                { label: 'Student seat cap', value: s.cap ? formatCount(s.cap) : null },
                { label: 'Location', value: s.location, full: true },
                { label: 'Pincode', value: college.pincode },
                { label: 'Onboarded', value: formatDate(college.created_at, null) },
              ]}
            />
          </Panel>
          <Panel
            title="Seat usage"
            className="mdc-card"
            action={s.cap ? <div className="mdc-chip"><small>Seat cap</small><b>{formatCount(s.cap)}</b></div> : null}
          >
            <ModernDonut
              title="Seat usage"
              unit="Seats"
              parts={[
                { key: 'used', label: 'Seats used', value: s.students, tone: s.pct >= NEAR_CAP_PCT ? 'warn' : 'info' },
                { key: 'free', label: 'Seats free', value: Math.max(0, s.cap - s.students), tone: 'neutral' },
              ]}
              empty="No seat cap set for this college."
            />
            {s.pct >= NEAR_CAP_PCT ? (
              <p className="co-warn sa-gap-top"><Icon name="info" size={14} /> Close to the seat cap — new students may be refused.</p>
            ) : null}
          </Panel>
        </div>
        <DangerZone
          title={s.active ? 'Deactivate this college' : 'Reactivate this college'}
          description={s.active
            ? 'Its people can no longer sign in. Nothing is deleted and you can reactivate it at any time.'
            : 'Its people can sign in again with their existing roles.'}
        >
          <button type="button" className={`sd-btn sd-btn--sm ${s.active ? 'sd-btn--danger' : 'sd-btn--outline'}`} onClick={() => setConfirmOpen(true)}>
            {s.active ? 'Deactivate' : 'Reactivate'}
          </button>
        </DangerZone>
      </TabPanel>

      <TabPanel value="departments" current={tab} idBase="college">
        {studentsByDept.length > 1 ? (
          <ModernDonutCard
            title="Students by department"
            totalLabel="Total students"
            unit="Students"
            parts={studentsByDept}
            empty="No students enrolled yet."
          />
        ) : null}
        <Panel
          title="Departments"
          sub={deptData ? `${countLabel(departments.length)} ${departments.length === 1 ? 'department' : 'departments'}` : null}
          bodyClassName={null}
        >
          {deptLoading && !deptData ? <p className="dv-empty sa-pad">Loading departments…</p> : null}
          {deptData && !departments.length ? <p className="dv-empty sa-pad">No departments yet. Add them from Departments.</p> : null}
          {departments.length ? (
            <div className="sp-table-wrap">
              <table className="sp-table un-table sa-table-tight sa-stack">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>HOD</th>
                    <th className="num">Students</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => (
                    <tr key={d.id}>
                      <td><b>{d.name}</b><small className="sa-row-code">{d.code || 'No code'}</small></td>
                      <td data-label="HOD">{d.hod_name || <span className="pm-missing"><Icon name="alert" size={14} /> Not assigned</span>}</td>
                      <td data-label="Students" className="num">{countLabel(d.student_count ?? 0)}</td>
                      <td data-label="Status"><StatusPill active={d.is_active !== false} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {/* Card-head links wrap under the subtitle on phones; the link sits in the card foot instead. */}
          <div className="sa-panel-foot sa-panel-foot--pad">
            <Link className="sp-link" href={`/superadmin/departments?college=${id}`}>Manage departments <Icon name="arrow" size={14} /></Link>
          </div>
        </Panel>
      </TabPanel>

      <TabPanel value="admins" current={tab} idBase="college">
        <Panel
          title="College administrators"
          bodyClassName={null}
        >
          {admins.length ? (
            <ul className="sa-people">
              {admins.map((a) => {
                const st = adminStatus(a.status);
                const pending = String(a.status || '').includes('pending');
                return (
                  <li key={a.id || a.email}>
                    <span className="co-avatar" aria-hidden="true">{initials(a.name || a.email)}</span>
                    <div className="sa-people-main">
                      <b>{a.name || '—'}</b>
                      <small>{[a.email, a.phone_number ? formatIndianPhone(a.phone_number) : null].filter(Boolean).join(' · ')}</small>
                    </div>
                    <span className={`sp-pill ${st.cls}`}>{st.label}</span>
                    {pending && a.email ? (
                      <button
                        type="button"
                        className="sd-btn sd-btn--ghost sd-btn--sm"
                        onClick={() => handleResend(a)}
                        disabled={resendingEmail === a.email}
                      >
                        <Icon name="send" size={14} /> {resendingEmail === a.email ? 'Sending…' : 'Resend invite'}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : <p className="dv-empty sa-pad">No administrators on file.</p>}
          <div className="sa-panel-foot sa-panel-foot--pad">
            <Link className="sp-link" href={`/superadmin/users?tab=staff&role=college_admin&institution=${id}`}>Open in Platform users <Icon name="arrow" size={14} /></Link>
          </div>
        </Panel>
      </TabPanel>

      <TabPanel value="learning" current={tab} idBase="college">
        {deptReportLoading && !deptReport ? <SectionState title="Loading learning data…" /> : (
          <div className="dv-grid">
            <MetricListCard title="Completion by department" items={learningBars((r) => r.completion)} colorBy="band" format={formatPct} empty="No departments with published chapters yet." />
            <MetricListCard title="Quiz average by department" items={learningBars(quizScore)} colorBy="band" format={formatPct} empty="No scored attempts in this range." />
            <MetricListCard title="Q&A by department" items={learningBars((r) => r.qa)} empty="No questions in this range." />
            <MetricListCard title="Watch time by department" items={learningBars((r) => r.watch_minutes)} format={formatMinutes} empty="No watch time in this range." />
          </div>
        )}
      </TabPanel>

      <StatusConfirm
        college={confirmOpen ? college : null}
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleToggle}
      />

      {editOpen ? (
        <CollegeFormModal
          key={`edit-${id}`}
          open={editOpen}
          editingId={id}
          initialValues={editDefaults}
          universities={asList(uniData, [])}
          onClose={() => setEditOpen(false)}
          onSaved={() => { reload().catch(() => {}); reloadDepts().catch(() => {}); }}
        />
      ) : null}
    </ModulePage>
  );
}

export default function CollegeDetailPage() {
  return (
    <Suspense fallback={<SectionState title="Loading college…" />}>
      <CollegeView />
    </Suspense>
  );
}
