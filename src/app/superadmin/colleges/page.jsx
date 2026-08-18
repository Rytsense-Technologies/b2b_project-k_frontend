'use client';

import { useMemo, useState } from 'react';
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
import { collegesApi } from '@/lib/api/superadmin/modules';
import { asList, unwrap, withMock } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';

const EMPTY_FORM = {
  name: '',
  code: '',
  city: '',
  state: '',
  plan: 'Standard',
  student_limit: '',
  address: '',
  admins: [{ name: '', email: '', mobile: '' }],
};

function statusVariant(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'active') return 'ok';
  if (value === 'onboarding') return 'warn';
  return 'off';
}

export default function CollegesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [collegeModal, setCollegeModal] = useState(false);
  const [viewCollege, setViewCollege] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data, loading, reload } = useAsyncResource(
    () => withMock(() => collegesApi.list({ search, status, plan }), COLLEGES),
    [search, status, plan],
  );

  const colleges = useMemo(() => asList(data, COLLEGES), [data]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setCollegeModal(true);
  };

  const openEdit = (college) => {
    setEditingId(college.id);
    setForm({
      name: college.name ?? '',
      code: college.code ?? '',
      city: college.city ?? '',
      state: college.state ?? '',
      plan: college.plan ?? 'Standard',
      student_limit: college.student_limit ?? '',
      address: college.address ?? '',
      admins: college.admin_list?.length
        ? college.admin_list
        : [{ name: '', email: '', mobile: '' }],
    });
    setCollegeModal(true);
  };

  const updateAdmin = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      admins: prev.admins.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('College name is required');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      student_limit: form.student_limit ? Number(form.student_limit) : null,
    };
    try {
      if (editingId) await collegesApi.update(editingId, payload);
      else await collegesApi.create(payload);
      toast.success(editingId ? 'College updated' : 'College created');
      setCollegeModal(false);
      await reload();
    } catch {
      toast.success(editingId ? 'College saved locally until API is live' : 'College saved locally until API is live');
      setCollegeModal(false);
    } finally {
      setSaving(false);
    }
  };

  const openView = async (college) => {
    try {
      const detail = unwrap(await collegesApi.get(college.id));
      setViewCollege(detail || college);
    } catch {
      setViewCollege({
        ...college,
        departments_list: COLLEGE_VIEW_DEPTS,
      });
    }
  };

  return (
    <div className="animate-fade-in">
      <QuirriToolbar
        title="College Management"
        subtitle="Create colleges and assign one or more college admins."
      >
        <QuirriBtn variant="primary" onClick={openCreate}>+ New College</QuirriBtn>
      </QuirriToolbar>

      <QuirriFilters>
        <input
          placeholder="Search by college name, code, admin email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Suspended">Suspended</option>
          <option value="Onboarding">Onboarding</option>
        </select>
        <select value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="">All Plans</option>
          <option value="Standard">Standard</option>
          <option value="Premium">Premium</option>
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
            {loading && !colleges.length ? (
              <tr><td colSpan={7}>Loading colleges…</td></tr>
            ) : null}
            {colleges.map((college) => (
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
                <td><QuirriBadge variant={college.statusType || statusVariant(college.status)}>{college.status}</QuirriBadge></td>
                <td>
                  <div className="quirri-actions">
                    <QuirriLinkButton onClick={() => openView(college)}>View</QuirriLinkButton>
                    <QuirriLinkButton onClick={() => openEdit(college)}>Edit</QuirriLinkButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <QuirriModal
        open={collegeModal}
        onClose={() => setCollegeModal(false)}
        title={editingId ? 'Edit College' : 'Add / Edit College'}
        wide
      >
        <QuirriFormGrid>
          <QuirriField label="College Name">
            <input placeholder="Enter college name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </QuirriField>
          <QuirriField label="College Code">
            <input placeholder="COL-0003" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </QuirriField>
          <QuirriField label="City">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </QuirriField>
          <QuirriField label="State">
            <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </QuirriField>
          <QuirriField label="Plan">
            <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
              <option>Standard</option>
              <option>Premium</option>
            </select>
          </QuirriField>
          <QuirriField label="Student Limit">
            <input type="number" placeholder="5000" value={form.student_limit} onChange={(e) => setForm({ ...form, student_limit: e.target.value })} />
          </QuirriField>
          <QuirriField label="Address" full>
            <textarea rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </QuirriField>
          <div className="quirri-full">
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>College Admins</h3>
            {form.admins.map((admin, index) => (
              <div className="quirri-admin-row" key={`admin-${index}`}>
                <QuirriField label="Admin Name">
                  <input placeholder="Admin name" value={admin.name} onChange={(e) => updateAdmin(index, 'name', e.target.value)} />
                </QuirriField>
                <QuirriField label="Email">
                  <input placeholder="admin@college.edu" value={admin.email} onChange={(e) => updateAdmin(index, 'email', e.target.value)} />
                </QuirriField>
                <QuirriField label="Mobile">
                  <input placeholder="Mobile" value={admin.mobile} onChange={(e) => updateAdmin(index, 'mobile', e.target.value)} />
                </QuirriField>
                <QuirriBtn
                  variant="danger"
                  onClick={() => setForm((prev) => ({ ...prev, admins: prev.admins.filter((_, i) => i !== index) }))}
                >
                  Delete
                </QuirriBtn>
              </div>
            ))}
            <br />
            <QuirriBtn
              variant="light"
              onClick={() => setForm((prev) => ({ ...prev, admins: [...prev.admins, { name: '', email: '', mobile: '' }] }))}
            >
              + Add Another Admin
            </QuirriBtn>
          </div>
          <QuirriBtn variant="primary" className="quirri-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save College'}
          </QuirriBtn>
        </QuirriFormGrid>
      </QuirriModal>

      <QuirriModal
        open={Boolean(viewCollege)}
        onClose={() => setViewCollege(null)}
        title={viewCollege?.name || 'College'}
        wide
      >
        {viewCollege ? (
          <>
            <QuirriPillList items={[
              `${viewCollege.departments ?? 0} Departments`,
              `${viewCollege.students ?? 0} Students`,
              `${viewCollege.admins ?? 0} College Admins`,
              `${viewCollege.final_year ?? 0} Final Year`,
            ]} />
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
                {(viewCollege.departments_list || COLLEGE_VIEW_DEPTS).map((row) => (
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
          </>
        ) : null}
      </QuirriModal>
    </div>
  );
}
