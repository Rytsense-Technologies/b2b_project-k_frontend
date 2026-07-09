'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import QuirriModal from '@/components/superadmin/QuirriModal';
import {
  QuirriToolbar,
  QuirriBtn,
  QuirriLinkButton,
  QuirriFormGrid,
  QuirriField,
} from '@/components/superadmin/quirri-ui';
import { EMAILS } from '@/lib/mock/superadminData';

export default function EmailsPage() {
  const [modalOpen, setModalOpen] = useState(false);

  const handleAdd = () => {
    toast.success('Verification email sent (mock)');
    setModalOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <QuirriToolbar
        title="Email Management"
        subtitle="Add, verify, and delete platform emails used for reports and alerts."
      >
        <QuirriBtn variant="primary" onClick={() => setModalOpen(true)}>+ Add Email</QuirriBtn>
      </QuirriToolbar>

      <div className="quirri-card quirri-table-wrap">
        <table className="quirri-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Purpose</th>
              <th>Status</th>
              <th>Added By</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {EMAILS.map((row) => (
              <tr key={row.email}>
                <td>{row.email}</td>
                <td>{row.purpose}</td>
                <td><QuirriBadge variant="ok">{row.status}</QuirriBadge></td>
                <td>{row.addedBy}</td>
                <td>{row.created}</td>
                <td>
                  <div className="quirri-actions">
                    <QuirriLinkButton>Edit</QuirriLinkButton>
                    <QuirriLinkButton danger>Delete</QuirriLinkButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <QuirriModal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Email">
        <QuirriFormGrid>
          <QuirriField label="Email Address">
            <input placeholder="name@quirri.ai" />
          </QuirriField>
          <QuirriField label="Purpose">
            <select defaultValue="support">
              <option>Support notifications</option>
              <option>Report delivery</option>
              <option>System alerts</option>
              <option>Billing</option>
            </select>
          </QuirriField>
          <QuirriBtn variant="primary" className="quirri-full" onClick={handleAdd}>
            Add & Send Verification
          </QuirriBtn>
        </QuirriFormGrid>
      </QuirriModal>
    </div>
  );
}
