'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import PortalHero from '@/components/shared/PortalHero';
import { usersApi } from '@/lib/api/superadmin/users';
import { unwrap, asList } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useAuth } from '@/hooks/useAuth';
import { ROLES } from '@/lib/permissions';

function statusVariant(user) {
  if (user?.is_active === false) return 'red';
  if (user?.is_verified === false) return 'amber';
  return 'green';
}

function userStatusLabel(user) {
  if (user?.is_active === false) return 'Deactivated';
  if (user?.is_verified === false) return 'Pending activation';
  return user?.status || 'Active';
}

function pickTotal(payload, list) {
  if (typeof payload?.total === 'number') return payload.total;
  if (typeof payload?.count === 'number') return payload.count;
  return list.length;
}

export default function AdminDashboardPage() {
  const { user, tenantId } = useAuth();
  const college = user?.college_name || user?.tenant_name || 'your college';

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
    <div className="animate-fade-in">
      <PortalHero
        eyebrow={`College Admin · ${college}`}
        title={college && college !== 'your college' ? `Welcome, ${college}` : 'Welcome'}
        description="Build your academic structure, upload subject material, and track how students learn. Everything you upload routes automatically to the department HOD for review before students see it."
        secondaryHref="/admin/content"
        secondaryLabel="Upload a chapter"
        primaryHref="/admin/students"
        primaryLabel="Add students"
        sideTitle="Getting started"
        sideItems={[
          {
            id: 'structure',
            title: 'Academic structure',
            body: 'Define departments, programmes and subjects before bulk uploads.',
            tone: 'info',
          },
          {
            id: 'content',
            title: 'Upload & content',
            body: 'Chapter material waits for HOD approval before students can see it.',
            tone: 'warning',
          },
        ]}
      />

      <div className="stats c4" style={{ marginTop: 4 }}>
        <div className="stat">
          <div className="k">Students</div>
          <div className="v">{loadingPeople ? '…' : studentTotal.toLocaleString('en-IN')}</div>
          <div className="s">From your college directory</div>
        </div>
        <div className="stat">
          <div className="k">Faculty</div>
          <div className="v">{loadingPeople ? '…' : facultyTotal.toLocaleString('en-IN')}</div>
          <div className="s">Staff accounts in this college</div>
        </div>
        <div className="stat">
          <div className="k">Departments</div>
          <div className="v">—</div>
          <div className="s">Needs EPIC-06</div>
        </div>
        <div className="stat">
          <div className="k">Watch time</div>
          <div className="v">—</div>
          <div className="s">Needs EPIC-19</div>
        </div>
      </div>

      <div className="notice info" style={{ marginBottom: 18 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div>
          <b>Learning metrics not available yet</b>
          HOD review queues, department activity, and watch-time charts connect when EPIC-06 / EPIC-19 are live. No sample numbers are shown.
        </div>
      </div>

      <div className="cols" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-h">
            <h3>Awaiting HOD review</h3>
            <Link className="link" href="/admin/content">Open content →</Link>
          </div>
          <div className="card-sub">Chapters awaiting faculty approval will list here after content RBAC is ready.</div>
          <div className="notice info" style={{ margin: 16 }}>
            <div><b>Empty</b> Content pipeline API not available for College Admin yet.</div>
          </div>
        </div>
        <div className="card">
          <div className="card-h">
            <h3>Department activity</h3>
            <Link className="link" href="/admin/analytics">Analytics →</Link>
          </div>
          <div className="card-sub">Watch time, Q&amp;A, and interviews by department — last 30 days.</div>
          <div className="notice info" style={{ margin: 16 }}>
            <div><b>Empty</b> Analytics endpoints are not live (EPIC-19).</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Recently added students</h3>
          <Link className="link" href="/admin/students">Manage students →</Link>
        </div>
        {studentsError ? (
          <div className="notice err" style={{ margin: 16 }}>
            <div><b>Could not load students</b>{studentsError?.message || 'Please try again.'}</div>
          </div>
        ) : null}
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Department</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {studentsLoading && !students.length ? (
              <tr><td colSpan={3}>Loading students…</td></tr>
            ) : null}
            {!studentsLoading && !students.length ? (
              <tr><td colSpan={3}>No students yet. Add one from the Students page.</td></tr>
            ) : null}
            {students.map((row) => {
              const name = row.name || [row.first_name, row.last_name].filter(Boolean).join(' ') || '—';
              return (
                <tr key={row.id}>
                  <td>
                    <span className="strong">{name}</span>
                    <div className="sub">{row.email}</div>
                  </td>
                  <td className="sub">{row.department || '—'}</td>
                  <td>
                    <QuirriBadge variant={statusVariant(row)}>
                      {userStatusLabel(row)}
                    </QuirriBadge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
