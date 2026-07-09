'use client';

import {
  QuirriToolbar,
  QuirriFilters,
  QuirriBtn,
} from '@/components/superadmin/quirri-ui';
import { DEPARTMENTS } from '@/lib/mock/superadminData';

export default function DepartmentsPage() {
  return (
    <div className="animate-fade-in">
      <QuirriToolbar
        title="Departments"
        subtitle="View department-wise student count and performance. Departments are created by college admin, Super Admin can view/report."
      >
        <QuirriBtn variant="light">Export Department Data</QuirriBtn>
      </QuirriToolbar>

      <QuirriFilters>
        <input placeholder="Search college, department, HOD..." />
        <select defaultValue="">
          <option>All Colleges</option>
          <option>ABC Engineering</option>
          <option>City Arts & Science</option>
        </select>
        <select defaultValue="">
          <option>All Departments</option>
          <option>CSE</option>
          <option>ECE</option>
          <option>B.Com</option>
        </select>
      </QuirriFilters>

      <div className="quirri-card quirri-table-wrap">
        <table className="quirri-table">
          <thead>
            <tr>
              <th>College</th>
              <th>Department</th>
              <th>HOD / Supervisor</th>
              <th>Total Students</th>
              <th>Final Year</th>
              <th>Subjects</th>
              <th>Learning Hours</th>
              <th>Questions Asked</th>
              <th>Interviews</th>
            </tr>
          </thead>
          <tbody>
            {DEPARTMENTS.map((row) => (
              <tr key={`${row.college}-${row.department}`}>
                <td>{row.college}</td>
                <td>{row.department}</td>
                <td>{row.hod}</td>
                <td><b>{row.students}</b></td>
                <td>{row.finalYear}</td>
                <td>{row.subjects}</td>
                <td>{row.hours}</td>
                <td>{row.questions}</td>
                <td>{row.interviews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
