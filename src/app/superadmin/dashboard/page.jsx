'use client';

import Link from 'next/link';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import {
  QuirriHero,
  QuirriMetricCards,
  QuirriSectionTitle,
} from '@/components/superadmin/quirri-ui';
import { dashboardApi } from '@/lib/api/superadmin/modules';
import { useAsyncResource } from '@/hooks/useAsyncResource';

export default function SuperAdminDashboard() {
  const { data, loading } = useAsyncResource(() => dashboardApi.getOverview({ range: 'last_30_days' }), []);
  const metrics = data?.metrics ?? [];
  const learning = data?.learning_activity ?? [];
  const topColleges = data?.top_colleges ?? [];
  const snapshot = data?.department_snapshot ?? [];

  return (
    <div className="animate-fade-in">
      <QuirriHero
        title="Welcome Super Admin"
        description="Manage colleges, departments, skill courses, reports, and platform activity from one workspace."
      />

      {loading && !data ? <p className="quirri-mini">Loading dashboard…</p> : null}
      <QuirriMetricCards items={metrics} />

      <div className="quirri-grid quirri-two-col" style={{ marginBottom: 20 }}>
        <div className="quirri-card">
          <QuirriSectionTitle
            title="Self Learning Activity & Q&A Performance — Last 30 Days"
            extra="Combined view"
          />
          <table className="quirri-table">
            <thead>
              <tr>
                <th>College</th>
                <th>Self Learning Duration</th>
                <th>Courses Read</th>
                <th>Q&A Questions</th>
                <th>Answer Quality</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {learning.map((row) => (
                <tr key={row.college}>
                  <td>{row.college}</td>
                  <td><b>{row.duration}</b></td>
                  <td>{row.courses}</td>
                  <td>{row.questions}</td>
                  <td>{row.quality}</td>
                  <td><QuirriBadge variant={row.statusType}>{row.status}</QuirriBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="quirri-card">
          <QuirriSectionTitle title="Top Colleges by Usage" extra="Learning + Q&A + Interview" />
          <table className="quirri-table">
            <thead>
              <tr>
                <th>College</th>
                <th>Students</th>
                <th>Total Usage</th>
              </tr>
            </thead>
            <tbody>
              {topColleges.map((row) => (
                <tr key={row.college}>
                  <td>{row.college}</td>
                  <td>{row.students}</td>
                  <td><b>{row.usage}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="quirri-card">
        <QuirriSectionTitle
          title="Department Student Count Snapshot"
          action={
            <Link href="/superadmin/departments" className="quirri-linkbtn">
              View Departments →
            </Link>
          }
        />
        <table className="quirri-table">
          <thead>
            <tr>
              <th>College</th>
              <th>Department</th>
              <th>Students</th>
              <th>Final Year</th>
              <th>Self Learning Hours</th>
              <th>Q&A</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.map((row) => (
              <tr key={`${row.college}-${row.department}`}>
                <td>{row.college}</td>
                <td>{row.department}</td>
                <td>{row.students}</td>
                <td>{row.finalYear}</td>
                <td>{row.hours}</td>
                <td>{row.qa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
