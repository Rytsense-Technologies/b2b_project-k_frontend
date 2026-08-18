'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  QuirriToolbar,
  QuirriFilters,
  QuirriBtn,
} from '@/components/superadmin/quirri-ui';
import { DEPARTMENTS } from '@/lib/mock/superadminData';
import { departmentsApi } from '@/lib/api/superadmin/modules';
import { asList, downloadCsv, withMock } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

export default function DepartmentsPage() {
  const [search, setSearch] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');

  const { data, loading } = useAsyncResource(
    () => withMock(() => departmentsApi.list({ search, college, department }), DEPARTMENTS),
    [search, college, department],
  );
  const rows = useMemo(() => asList(data, DEPARTMENTS), [data]);
  const colleges = [...new Set(DEPARTMENTS.map((row) => row.college))];
  const depts = [...new Set(DEPARTMENTS.map((row) => row.department))];

  const handleExport = async () => {
    try {
      await departmentsApi.exportData({ search, college, department });
    } catch {
      downloadCsv('departments.csv', rows, [
        { key: 'college', label: 'College' },
        { key: 'department', label: 'Department' },
        { key: 'hod', label: 'HOD' },
        { key: 'students', label: 'Students' },
        { key: 'finalYear', label: 'Final Year' },
        { key: 'subjects', label: 'Subjects' },
        { key: 'hours', label: 'Learning Hours' },
        { key: 'questions', label: 'Questions' },
        { key: 'interviews', label: 'Interviews' },
      ]);
      toast.success('Exported current table (API export not live yet)');
    }
  };

  return (
    <div className="animate-fade-in">
      <QuirriToolbar
        title="Departments"
        subtitle="View department-wise student count and performance. Departments are created by college admin, Super Admin can view/report."
      >
        <QuirriBtn variant="light" onClick={handleExport}>Export Department Data</QuirriBtn>
      </QuirriToolbar>

      <QuirriFilters>
        <input
          placeholder="Search college, department, HOD..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={college} onChange={(e) => setCollege(e.target.value)}>
          <option value="">All Colleges</option>
          {colleges.map((name) => <option key={name}>{name}</option>)}
        </select>
        <select value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All Departments</option>
          {depts.map((name) => <option key={name}>{name}</option>)}
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
            {loading && !rows.length ? <tr><td colSpan={9}>Loading departments…</td></tr> : null}
            {rows.map((row) => (
              <tr key={row.id || `${row.college}-${row.department}`}>
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
