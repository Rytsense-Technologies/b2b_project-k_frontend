'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriBadge from '@/components/superadmin/QuirriBadge';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { SearchBox, IconPlus, QuirriRHFField, QuirriSelect, IndiaLocationFields } from '@/components/superadmin/quirri-ui';
import { universitiesApi, fetchData } from '@/lib/api/superadmin/modules';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  universityCreateSchema,
  universityUpdateSchema,
} from '@/lib/validation';
import { INDIA_COUNTRY } from '@/lib/india';

const EMPTY_FORM = {
  name: '',
  code: '',
  country: INDIA_COUNTRY.code,
  state: '',
  district: '',
  city: '',
  pincode: '',
  address: '',
};

const PAGE_SIZE = 25;

function UniversityFormModal({
  open,
  editingId,
  initialValues,
  onClose,
  onSaved,
}) {
  const schema = editingId ? universityUpdateSchema : universityCreateSchema;
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialValues || EMPTY_FORM,
    mode: 'onBlur',
  });

  const [saving, setSaving] = useState(false);

  const onSave = handleSubmit(async (values) => {
    setSaving(true);
    try {
      const location = {
        country: INDIA_COUNTRY.code,
        state: values.state || null,
        district: values.district || null,
        city: values.city || null,
        pincode: values.pincode || null,
        address: values.address || null,
      };
      if (editingId) {
        await universitiesApi.update(editingId, {
          name: values.name,
          ...location,
        });
        toast.success('University updated');
      } else {
        await universitiesApi.create({
          name: values.name,
          code: values.code,
          ...location,
        });
        toast.success('University created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save university'));
    } finally {
      setSaving(false);
    }
  });

  return (
    <QuirriModal
      open={open}
      onClose={onClose}
      title={editingId ? 'Edit university' : 'Add university'}
      crumb="Top level of the academic hierarchy"
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <div className="right">
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save university'}
            </button>
          </div>
        </>
      )}
    >
      <form onSubmit={onSave} noValidate>
        <div className="grid2">
          <QuirriRHFField
            control={control}
            name="name"
            fieldType="institutionName"
            label="University name"
            placeholder="e.g. Anna University"
          />
          <QuirriRHFField
            control={control}
            name="code"
            fieldType="code"
            label="University code"
            placeholder="UNI-0004"
            disabled={Boolean(editingId)}
            hint={
              editingId
                ? 'Code cannot be changed after create (colleges reference it).'
                : 'Must be unique.'
            }
          />
          <IndiaLocationFields control={control} setValue={setValue} />
        </div>
        <QuirriRHFField
          control={control}
          name="address"
          fieldType="address"
          label="Address"
          placeholder="Optional street or campus address"
          full
        />
        {Object.keys(errors).length > 0 ? (
          <div className="hint field-error" role="alert" style={{ marginTop: 8 }}>
            Check the highlighted fields and try again.
          </div>
        ) : null}
        {editingId ? (
          <div className="hint" style={{ marginTop: 4 }}>
            Use Deactivate / Reactivate on the list to change active status (soft delete).
          </div>
        ) : null}
      </form>
    </QuirriModal>
  );
}

export default function UniversitiesPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formDefaults, setFormDefaults] = useState(EMPTY_FORM);
  const [togglingId, setTogglingId] = useState(null);

  const listParams = useMemo(() => {
    const params = { q: search.trim() || undefined, page, page_size: PAGE_SIZE };
    if (activeFilter === 'true') params.is_active = true;
    if (activeFilter === 'false') params.is_active = false;
    return params;
  }, [search, activeFilter, page]);

  const { data, loading, error, reload } = useAsyncResource(
    () => fetchData(() => universitiesApi.list(listParams)),
    [listParams],
  );

  const rows = useMemo(() => asList(data, []), [data]);
  const total = data?.total ?? rows.length;
  const pageSize = data?.page_size ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openCreate = () => {
    setEditingId(null);
    setFormDefaults(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = async (row) => {
    setEditingId(row.id);
    setFormDefaults({
      name: row.name ?? '',
      code: row.code ?? '',
      country: INDIA_COUNTRY.code,
      state: row.state ?? '',
      district: row.district ?? '',
      city: row.city ?? '',
      pincode: row.pincode ?? '',
      address: row.address ?? '',
    });
    setModalOpen(true);
    try {
      const detail = await fetchData(() => universitiesApi.get(row.id));
      if (!detail) return;
      setFormDefaults({
        name: detail.name ?? row.name ?? '',
        code: detail.code ?? row.code ?? '',
        country: INDIA_COUNTRY.code,
        state: detail.state ?? '',
        district: detail.district ?? '',
        city: detail.city ?? '',
        pincode: detail.pincode ?? '',
        address: detail.address ?? '',
      });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load university details. Showing list values.'));
    }
  };

  const handleToggleActive = async (row) => {
    setTogglingId(row.id);
    try {
      if (row.is_active) {
        await universitiesApi.deactivate(row.id);
        toast.success('University deactivated');
      } else {
        await universitiesApi.reactivate(row.id);
        toast.success('University reactivated');
      }
      await reload();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update status'));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="section-head">
        <div>
          <div className="t">Universities</div>
          <div className="d">
            Affiliated universities. Colleges are onboarded beneath a university — this is the top of the academic hierarchy.
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          {IconPlus}
          New University
        </button>
      </div>

      <div className="toolbar">
        <SearchBox
          placeholder="Search university name or code…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <QuirriSelect
          ariaLabel="Filter by status"
          value={activeFilter}
          onChange={(e) => {
            setPage(1);
            setActiveFilter(e.target.value);
          }}
          placeholder="All statuses"
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
      </div>

      {error ? (
        <div className="notice err" style={{ marginBottom: 12 }}>
          <div>
            <b>Could not load universities</b>
            {apiErrorMessage(error, 'Please try again.')}
          </div>
        </div>
      ) : null}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>University</th>
              <th>Code</th>
              <th>Colleges</th>
              <th>Students</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length ? (
              <tr><td colSpan={6}>Loading universities…</td></tr>
            ) : null}
            {!loading && !rows.length ? (
              <tr><td colSpan={6}>No universities found.</td></tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="strong">{row.name}</span>
                  <div className="sub">
                    {[row.city, row.district, row.state, row.pincode].filter(Boolean).join(', ') || '—'}
                  </div>
                </td>
                <td className="num">{row.code}</td>
                <td className="num">{row.college_count == null ? '—' : row.college_count}</td>
                <td className="num">{row.student_count == null ? '—' : row.student_count}</td>
                <td>
                  <QuirriBadge variant={row.is_active ? 'green' : 'red'}>
                    {row.is_active ? 'Active' : 'Inactive'}
                  </QuirriBadge>
                </td>
                <td className="actions">
                  <a
                    onClick={() => openEdit(row)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && openEdit(row)}
                  >
                    Edit
                  </a>
                  <a
                    onClick={() => togglingId !== row.id && handleToggleActive(row)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleToggleActive(row)}
                    style={{ opacity: togglingId === row.id ? 0.5 : 1 }}
                  >
                    {togglingId === row.id
                      ? '…'
                      : row.is_active
                        ? 'Deactivate'
                        : 'Reactivate'}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
            <span className="sub">{total} total · page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <UniversityFormModal
          key={editingId || 'create'}
          open={modalOpen}
          editingId={editingId}
          initialValues={formDefaults}
          onClose={() => setModalOpen(false)}
          onSaved={reload}
        />
      ) : null}
    </div>
  );
}
