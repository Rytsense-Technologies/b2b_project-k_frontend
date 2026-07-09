'use client';

import Link from 'next/link';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import {
  QuirriHero,
  QuirriMetricCards,
  QuirriSectionTitle,
  QuirriTable,
  QuirriLinkButton,
} from '@/components/superadmin/quirri-ui';
import {
  DASHBOARD_METRICS,
  LEARNING_ACTIVITY,
  TOP_COLLEGES,
  DEPT_SNAPSHOT,
} from '@/lib/mock/superadminData';

export default function SuperAdminDashboard() {
  return (
    <div className="animate-fade-in">
      <QuirriHero
        title="Welcome Super Admin"
        description="Manage colleges, departments, skill courses, reports, and platform activity from one workspace."
      />

      <QuirriMetricCards items={DASHBOARD_METRICS} />

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
              {LEARNING_ACTIVITY.map((row) => (
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
              {TOP_COLLEGES.map((row) => (
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
            {DEPT_SNAPSHOT.map((row) => (
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
