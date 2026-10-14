'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PortalHero from '@/components/shared/PortalHero';
import {
  Icon,
  KpiRow,
  Panel,
  SectionState,
  StatusPill,
  initials,
  countLabel,
} from '@/components/shared/module-ui';
import { usersApi } from '@/lib/api/superadmin/users';
import { analyticsApi } from '@/lib/api/analytics';
import { minutesLabel } from '@/components/admin/insights';
import { unwrap, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/permissions';
import { statusVariant, userStatusLabel } from '@/lib/admin/userStatus';

const TONE = { red: 'err', amber: 'low', green: 'good' };

function pickTotal(payload, list) {
  if (typeof payload?.total === 'number') return payload.total;
  if (typeof payload?.count === 'number') return payload.count;
  return list.length;
}

export default function AdminDashboardPage() {
  const { user, tenantId } = useAuth();

  // Auth state hydrates from the store before React can reconcile the
  // server-rendered HTML, so the very first client render already differs
  // from the server's (which has no user yet) - a hydration mismatch, not a
  // data bug. Rendering the same neutral fallback until after mount keeps
  // the first paint identical on both sides; the real name swaps in right
  // after, same as any other client-only personalization.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const college = mounted ? (user?.college_name || user?.tenant_name || 'your college') : 'your college';

  const { data: studentData, loading: studentsLoading, error: studentsError } = useAsyncResource(async () => {
    const res = await usersApi.getUsers({
      page: 1,
      limit: 8,
      role: ROLES.STUDENT,
      tenantId: tenantId || undefined,
    });
    return unwrap(res);
  }, [tenantId]);

  const { data: facultyData, loading: facultyLoading } = useAsyncResource(async () => {
    const res = await usersApi.getUsers({
      page: 1,
      limit: 1,
      role: ROLES.FACULTY,
      tenantId: tenantId || undefined,
    });
    return unwrap(res);
  }, [tenantId]);

  // Live college overview (last 30 days): departments, watch time, review queue.
  const { data: overview, loading: overviewLoading, error: overviewError } = useAsyncResource(
    () => analyticsApi.college({ range: 'last_30_days' }),
    [tenantId],
  );
  const totals = overview?.totals;
  const queue = overview?.review_queue;
  const activeDepts = (overview?.departments || [])
    .filter((d) => d.students || d.watch_minutes || d.qa || d.interviews)
    .sort((a, b) => (b.watch_minutes - a.watch_minutes) || (b.qa - a.qa));

  const students = useMemo(() => {
    if (Array.isArray(studentData)) return studentData;
    return asList(studentData?.users || studentData, []);
  }, [studentData]);

  const studentTotal = pickTotal(studentData, students);
  const facultyTotal = pickTotal(
    facultyData,
    Array.isArray(facultyData) ? facultyData : asList(facultyData?.users || facultyData, []),
  );

  const loadingPeople = studentsLoading || facultyLoading;

  return (
    <div className="animate-fade-in sp pm-page ad-page ad-dash">
      <PortalHero
        eyebrow={`College admin · ${college}`}
        title={college && college !== 'your college' ? `Welcome, ${college}` : 'Welcome'}
        description="Build your academic structure, upload subject material and track how students learn. Everything you upload goes to the department HOD for review before students see it."
        secondaryHref="/admin/content"
        secondaryLabel="Upload a chapter"
        primaryHref="/admin/students"
        primaryLabel="Add students"
        sideTitle="Getting started"
        sideItems={[
          {
            id: 'structure',
            title: 'Academic structure',
            body: 'Set up departments and HODs before you add students or upload chapters.',
            tone: 'info',
          },
          {
            id: 'content',
            title: 'Upload and content',
            body: 'Chapter videos wait for HOD approval before students can see them.',
            tone: 'warning',
          },
        ]}
      />

      <KpiRow
        label="College summary"
        items={[
          {
            icon: 'users',
            label: 'Students',
            value: loadingPeople ? null : countLabel(studentTotal),
            sub: 'In your college directory',
          },
          {
            icon: 'user',
            label: 'Faculty & HOD',
            value: loadingPeople ? null : countLabel(totals ? totals.faculty : facultyTotal),
            sub: 'Active staff accounts',
          },
          {
            icon: 'tree',
            label: 'Departments',
            value: overviewLoading && !overview ? null : (totals ? countLabel(totals.departments) : '—'),
            sub: 'Active in your college',
          },
          {
            icon: 'clock',
            label: 'Watch time',
            value: overviewLoading && !overview ? null : (totals ? minutesLabel(totals.watch_minutes) : '—'),
            sub: totals?.completion != null ? `Last 30 days · ${totals.completion}% chapters completed` : 'Last 30 days',
          },
        ]}
      />

      {overviewError ? (
        <SectionState tone="err" title="Could not load learning activity">
          {overviewError?.message || 'Refresh the page to try again.'}
        </SectionState>
      ) : null}

      <div className="pm-grid-2">
        <Panel
          title="Content review queue"
          sub={queue
            ? `${countLabel(queue.awaiting_you)} waiting for you · ${countLabel(queue.awaiting_hod)} with the HOD · ${countLabel(queue.ready_to_send)} ready to send`
            : 'Chapters on their way to students'}
          action={(
            <Link className="sp-link" href="/admin/content">
              Open content <Icon name="arrow" size={14} />
            </Link>
          )}
        >
          {queue?.items?.length ? (
            <ul className="ad-queue">
              {queue.items.map((j) => (
                <li key={j.job_id}>
                  <span className="sp-row-ic" aria-hidden="true"><Icon name="doc" size={16} /></span>
                  <div>
                    <b>{j.chapter_title}</b>
                    <small>{[j.department, j.since ? new Date(j.since).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null].filter(Boolean).join(' · ')}</small>
                  </div>
                  <span className={`sp-pill ${j.stage === 'awaiting_you' ? 'sp-pill--low' : j.stage === 'ready_to_send' ? 'sp-pill--teal' : ''}`}>
                    {j.stage === 'awaiting_you' ? 'Review plan' : j.stage === 'ready_to_send' ? 'Send to HOD' : 'With HOD'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ad-empty">
              <span className="ad-empty-ic" aria-hidden="true"><Icon name="tick" size={20} /></span>
              <div>
                <b>{overviewLoading && !overview ? 'Loading…' : 'Nothing waiting'}</b>
                <small>Uploaded chapters show here until they are published to students.</small>
              </div>
            </div>
          )}
        </Panel>
        <Panel
          title="Department activity"
          sub="Watch time, Q&A and interviews by department, last 30 days"
          action={(
            <Link className="sp-link" href="/admin/analytics">
              Analytics <Icon name="arrow" size={14} />
            </Link>
          )}
        >
          {activeDepts.length ? (
            <ul className="ad-queue">
              {activeDepts.slice(0, 5).map((d) => (
                <li key={d.department_id}>
                  <span className="sp-row-ic" aria-hidden="true"><Icon name="tree" size={16} /></span>
                  <div>
                    <b>{d.department}</b>
                    <small>
                      {`${countLabel(d.students)} student${d.students === 1 ? '' : 's'} · ${minutesLabel(d.watch_minutes)} watched · ${countLabel(d.qa)} Q&A · ${countLabel(d.interviews)} interview${d.interviews === 1 ? '' : 's'}`}
                    </small>
                  </div>
                  {d.avg_score != null ? <span className="sp-pill sp-pill--teal">{Math.round(d.avg_score)}% avg</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="ad-empty">
              <span className="ad-empty-ic" aria-hidden="true"><Icon name="chart" size={20} /></span>
              <div>
                <b>{overviewLoading && !overview ? 'Loading…' : 'No activity in the last 30 days'}</b>
                <small>Watch time, tutor questions and interviews show here as students learn.</small>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Recently added students"
        sub="The latest accounts in your college"
        bodyClassName={null}
        action={(
          <Link className="sp-link" href="/admin/students">
            Manage students <Icon name="arrow" size={14} />
          </Link>
        )}
      >
        {studentsError ? (
          <div className="sp-panel-b">
            <SectionState tone="err" title="Could not load students">
              {studentsError?.message || 'Please try again.'}
            </SectionState>
          </div>
        ) : null}
        {studentsLoading && !students.length ? (
          <div className="sp-panel-b"><SectionState title="Loading students…" /></div>
        ) : null}
        {!studentsLoading && !studentsError && !students.length ? (
          <div className="sp-panel-b">
            <SectionState title="No students yet">
              Students you add from the Students page appear here.
            </SectionState>
          </div>
        ) : null}
        {students.length ? (
          <div className="sp-table-wrap">
            <table className="sp-table un-table ad-stack">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((row) => {
                  const name = row.name || [row.first_name, row.last_name].filter(Boolean).join(' ') || '—';
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="pm-person">
                          <span className="pm-av" aria-hidden="true">{initials(name, 'S')}</span>
                          <div>
                            <b>{name}</b>
                            <small>{row.email}</small>
                          </div>
                        </div>
                      </td>
                      <td data-label="Department">{row.department_name || row.department || '—'}</td>
                      <td data-label="Status">
                        <StatusPill active on={userStatusLabel(row)} tone={TONE[statusVariant(row)]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
