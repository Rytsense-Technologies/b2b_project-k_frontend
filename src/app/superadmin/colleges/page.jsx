'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import QuirriModal from '@/components/superadmin/QuirriModal';
import {
  QuirriToolbar,
  QuirriFilters,
  QuirriBtn,
  QuirriLinkButton,
  QuirriFormGrid,
  QuirriField,
  QuirriPillList,
} from '@/components/superadmin/quirri-ui';
import { COLLEGES, COLLEGE_VIEW_DEPTS } from '@/lib/mock/superadminData';

function AdminRow({ onRemove }) {
  return (
    <div className="quirri-admin-row">
      <QuirriField label="Admin Name">
        <input placeholder="Admin name" />
      </QuirriField>
      <QuirriField label="Email">
        <input placeholder="admin@college.edu" />
      </QuirriField>
      <QuirriField label="Mobile">
        <input placeholder="Mobile" />
      </QuirriField>
      <QuirriBtn variant="danger" onClick={onRemove}>Delete</QuirriBtn>
    </div>
  );
}

export default function CollegesPage() {
  const [collegeModal, setCollegeModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [adminRows, setAdminRows] = useState([0]);

  const addAdminRow = () => setAdminRows((rows) => [...rows, rows.length]);
  const removeAdminRow = (index) => {
    setAdminRows((rows) => rows.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    toast.success('College saved (mock)');
    setCollegeModal(false);
  };

  return (
    <div className="animate-fade-in">
      <QuirriToolbar
        title="College Management"
        subtitle="Create colleges and assign one or more college admins."
      >
        <QuirriBtn variant="primary" onClick={() => setCollegeModal(true)}>
          + New College
        </QuirriBtn>
      </QuirriToolbar>

      <QuirriFilters>
        <input placeholder="Search by college name, code, admin email..." />
        <select defaultValue="">
          <option>All Statuses</option>
          <option>Active</option>
          <option>Inactive</option>
          <option>Suspended</option>
        </select>
        <select defaultValue="">
          <option>All Plans</option>
          <option>Standard</option>
          <option>Premium</option>
        </select>
      </QuirriFilters>

      <div className="quirri-card quirri-table-wrap">
        <table className="quirri-table">
          <thead>
            <tr>
              <th>College Name</th>
              <th>Admins</th>
              <th>Departments</th>
              <th>Students</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {COLLEGES.map((college) => (
              <tr key={college.id}>
                <td>
                  {college.name}
                  <br />
                  <span className="quirri-mini">{college.code} · {college.city}</span>
                </td>
                <td>{college.admins} admins</td>
                <td>{college.departments}</td>
                <td>{college.students}</td>
                <td>{college.plan}</td>
                <td><QuirriBadge variant={college.statusType}>{college.status}</QuirriBadge></td>
                <td>
                  <div className="quirri-actions">
                    <QuirriLinkButton onClick={() => setViewModal(true)}>View</QuirriLinkButton>
                    <QuirriLinkButton onClick={() => setCollegeModal(true)}>Edit</QuirriLinkButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <QuirriModal open={collegeModal} onClose={() => setCollegeModal(false)} title="Add / Edit College" wide>
        <QuirriFormGrid>
          <QuirriField label="College Name">
            <input placeholder="Enter college name" />
          </QuirriField>
          <QuirriField label="College Code">
            <input placeholder="COL-0003" />
          </QuirriField>
          <QuirriField label="City">
            <input />
          </QuirriField>
          <QuirriField label="State">
            <input />
          </QuirriField>
          <QuirriField label="Plan">
            <select defaultValue="standard">
              <option>Standard</option>
              <option>Premium</option>
            </select>
          </QuirriField>
          <QuirriField label="Student Limit">
            <input type="number" placeholder="5000" />
          </QuirriField>
          <QuirriField label="Address" full>
            <textarea rows={3} />
          </QuirriField>
          <div className="quirri-full">
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>College Admins</h3>
            {adminRows.map((key, index) => (
              <AdminRow key={key} onRemove={() => removeAdminRow(index)} />
            ))}
            <br />
            <QuirriBtn variant="light" onClick={addAdminRow}>+ Add Another Admin</QuirriBtn>
          </div>
          <QuirriBtn variant="primary" className="quirri-full" onClick={handleSave}>
            Save College
          </QuirriBtn>
        </QuirriFormGrid>
      </QuirriModal>

      <QuirriModal open={viewModal} onClose={() => setViewModal(false)} title="ABC Engineering College" wide>
        <QuirriPillList items={['8 Departments', '2,340 Students', '3 College Admins', '420 Final Year']} />
        <br />
        <h3 style={{ marginBottom: 12, fontSize: 16 }}>Department Student Count</h3>
        <table className="quirri-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Students</th>
              <th>Final Year</th>
              <th>HOD</th>
              <th>Learning Hours</th>
              <th>Questions</th>
            </tr>
          </thead>
          <tbody>
            {COLLEGE_VIEW_DEPTS.map((row) => (
              <tr key={row.department}>
                <td>{row.department}</td>
                <td>{row.students}</td>
                <td>{row.finalYear}</td>
                <td>{row.hod}</td>
                <td>{row.hours}</td>
                <td>{row.questions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </QuirriModal>
    </div>
  );
}
