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
import { departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { unwrap, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/permissions';

const TONE = { red: 'err', amber: 'low', green: 'good' };

function statusVariant(user) {
  if (user?.is_active === false) return 'red';
  if (user?.is_verified === false) return 'amber';
  return 'green';
}

function userStatusLabel(user) {
  if (user?.is_active === false) return 'Deactivated';
  if (user?.is_verified === false) return 'Pending activation';
  const s = String(user?.status || 'Active').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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

  const { data: deptData, loading: deptLoading } = useAsyncResource(
    () => fetchData(() => departmentsApi.list({ page: 1, pageSize: 1, is_active: true })),
    [tenantId],
  );

  const students = useMemo(() => {
    if (Array.isArray(studentData)) return studentData;
    return asList(studentData?.users || studentData, []);
  }, [studentData]);

  const studentTotal = pickTotal(studentData, students);
  const facultyTotal = pickTotal(
    facultyData,
    Array.isArray(facultyData) ? facultyData : asList(facultyData?.users || facultyData, []),
  );
  const departmentTotal = pickTotal(deptData, asList(deptData, []));

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
            label: 'Faculty',
            value: loadingPeople ? null : countLabel(facultyTotal),
            sub: 'Staff accounts in this college',
          },
          {
            icon: 'tree',
            label: 'Departments',
            value: deptLoading ? null : countLabel(departmentTotal),
            sub: 'Active in your college',
          },
          {
            icon: 'clock',
            label: 'Watch time',
            value: null,
            sub: 'Not tracked yet',
          },
        ]}
      />

      <SectionState title="Learning metrics are not available yet">
        HOD review queues, department activity and watch time appear here once those services are live.
        No sample numbers are shown.
      </SectionState>

      <div className="pm-grid-2">
        <Panel
          title="Awaiting HOD review"
          sub="Chapters waiting for faculty approval"
          action={(
            <Link className="sp-link" href="/admin/content">
              Open content <Icon name="arrow" size={14} />
            </Link>
          )}
        >
          <div className="ad-empty">
            <span className="ad-empty-ic" aria-hidden="true"><Icon name="clock" size={20} /></span>
            <div>
              <b>Nothing to show yet</b>
              <small>The review queue connects when the content pipeline is available to college admins.</small>
            </div>
          </div>
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
          <div className="ad-empty">
            <span className="ad-empty-ic" aria-hidden="true"><Icon name="chart" size={20} /></span>
            <div>
              <b>Nothing to show yet</b>
              <small>Department activity appears when analytics is live.</small>
            </div>
          </div>
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
