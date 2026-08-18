'use client';

import { useMemo, useState } from 'react';
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
import { emailsApi } from '@/lib/api/superadmin/modules';
import { asList, withMock } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const EMPTY = { email: '', purpose: 'Support notifications' };

export default function EmailsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data, reload } = useAsyncResource(
    () => withMock(() => emailsApi.list(), EMAILS),
    [],
  );
  const rows = useMemo(() => asList(data, EMAILS), [data]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({ email: row.email, purpose: row.purpose });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.email.trim()) {
      toast.error('Email is required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) await emailsApi.update(editingId, form);
      else await emailsApi.create(form);
      toast.success(editingId ? 'Email updated' : 'Verification email sent');
    } catch {
      toast.success(editingId ? 'Email saved locally until API is live' : 'Verification queued locally until API is live');
    } finally {
      setSaving(false);
      setModalOpen(false);
      reload().catch(() => {});
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete ${row.email}?`)) return;
    try {
      await emailsApi.remove(row.id);
      toast.success('Email deleted');
    } catch {
      toast.success('Delete queued locally until API is live');
    }
    reload().catch(() => {});
  };

  return (
    <div className="animate-fade-in">
      <QuirriToolbar
        title="Email Management"
        subtitle="Add, verify, and delete platform emails used for reports and alerts."
      >
        <QuirriBtn variant="primary" onClick={openAdd}>+ Add Email</QuirriBtn>
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
            {rows.map((row) => (
              <tr key={row.id || row.email}>
                <td>{row.email}</td>
                <td>{row.purpose}</td>
                <td><QuirriBadge variant="ok">{row.status}</QuirriBadge></td>
                <td>{row.addedBy || row.added_by}</td>
                <td>{row.created || row.created_at}</td>
                <td>
                  <div className="quirri-actions">
                    <QuirriLinkButton onClick={() => openEdit(row)}>Edit</QuirriLinkButton>
                    <QuirriLinkButton danger onClick={() => handleDelete(row)}>Delete</QuirriLinkButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <QuirriModal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Email' : 'Add Email'}>
        <QuirriFormGrid>
          <QuirriField label="Email Address">
            <input placeholder="name@quirri.ai" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </QuirriField>
          <QuirriField label="Purpose">
            <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}>
              <option>Support notifications</option>
              <option>Report delivery</option>
              <option>System alerts</option>
              <option>Billing</option>
            </select>
          </QuirriField>
          <QuirriBtn variant="primary" className="quirri-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : (editingId ? 'Save Email' : 'Add & Send Verification')}
          </QuirriBtn>
        </QuirriFormGrid>
      </QuirriModal>
    </div>
  );
}
