'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriRHFField, QuirriSelect } from '@/components/superadmin/quirri-ui';
import {
  ModulePage,
  ModuleBanner,
  KpiRow,
  FilterBar,
  SegTabs,
  SearchBox,
  Panel,
  StatusPill,
  IconButton,
  FormSection,
  ConfirmNote,
  Icon,
  SectionState,
  countLabel,
} from '@/components/shared/module-ui';
import { collegesApi, departmentsApi, fetchData } from '@/lib/api/superadmin/modules';
import { academicsApi } from '@/lib/api/superadmin/academics';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  MAX_PROGRAMME_SEMESTERS,
  programmeCreateSchema,
  programmeUpdateSchema,
  semesterSchema,
  subjectSchema,
  chapterSchema,
} from '@/lib/validation';

const STATUS_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'all', label: 'All' },
];

const DURATIONS = [1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} year${n > 1 ? 's' : ''}` }));
const PER_YEAR = [
  { value: '1', label: '1 (annual)' },
  { value: '2', label: '2 (semesters)' },
  { value: '3', label: '3 (trimesters)' },
];

/** Empty panel body: Teal 300 outline icon, title, one line. */
function PanelEmpty({ icon, title, children, action = null }) {
  return (
    <div className="sa-empty">
      <span className="sa-empty-ic" aria-hidden="true"><Icon name={icon} size={24} /></span>
      <div>
        <b>{title}</b>
        {children ? <p>{children}</p> : null}
        {action}
      </div>
    </div>
  );
}

function plural(n, word) {
  return `${countLabel(n)} ${word}${n === 1 ? '' : 's'}`;
}

/* ------------------------------------------------------------ programme form */
function ProgrammeModal({ programme, colleges, defaults, fixedCollege = false, onClose, onSaved }) {
  const editing = Boolean(programme);
  const { control, handleSubmit, setValue } = useForm({
    resolver: zodResolver(editing ? programmeUpdateSchema : programmeCreateSchema),
    defaultValues: editing
      ? {
        name: programme.name,
        code: programme.code || '',
        duration_years: String(programme.duration_years),
        semesters_per_year: String(programme.semesters_per_year),
      }
      : {
        college_id: defaults.college || '',
        department_id: defaults.department || '',
        name: '',
        code: '',
        duration_years: '4',
        semesters_per_year: '2',
      },
    mode: 'onBlur',
  });
  const [saving, setSaving] = useState(false);
  const collegeId = useWatch({ control, name: 'college_id' });
  const years = Number(useWatch({ control, name: 'duration_years' })) || 0;
  const perYear = Number(useWatch({ control, name: 'semesters_per_year' })) || 0;
  const total = years * perYear;

  const { data: deptData, loading: deptLoading } = useAsyncResource(
    () => (!editing && collegeId
      ? fetchData(() => departmentsApi.list({ college_id: collegeId, pageSize: 100, is_active: true }))
      : Promise.resolve(null)),
    [editing, collegeId],
  );
  const departments = asList(deptData, []);

  const onSave = handleSubmit(async (values) => {
    setSaving(true);
    try {
      const body = {
        name: values.name,
        code: values.code || null,
        duration_years: Number(values.duration_years),
        semesters_per_year: Number(values.semesters_per_year),
      };
      const saved = editing
        ? await fetchData(() => academicsApi.updateProgram(programme.id, body))
        : await fetchData(() => academicsApi.createProgram({ ...body, department_id: values.department_id }));
      toast.success(editing ? 'Programme updated' : `Programme created with ${plural(total, 'semester')}`);
      onSaved(saved);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the programme'));
    } finally {
      setSaving(false);
    }
  });

  let preview = null;
  if (total > MAX_PROGRAMME_SEMESTERS) {
    preview = `That is ${total} semesters — the limit is ${MAX_PROGRAMME_SEMESTERS}.`;
  } else if (total) {
    preview = editing
      ? (total === programme.planned_semesters
        ? `Keeps Semester 1–${total}.`
        : `Changes the programme to Semester 1–${total}. ${total < programme.planned_semesters ? 'Extra semesters are deactivated if they have no subjects.' : 'Missing semesters are added.'}`)
      : `Creates Semester 1–${total}. You can rename, add or deactivate semesters afterwards.`;
  }

  return (
    <QuirriModal
      open
      onClose={onClose}
      title={editing ? 'Edit programme' : 'New programme'}
      crumb={editing ? `${programme.college_name} · ${programme.department_name}` : 'A programme belongs to one department'}
      wide
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose}>Cancel</button>
          <div className="right">
            <button type="button" className="sd-btn sd-btn--amber" onClick={onSave} disabled={saving}>
              <Icon name="tick" size={16} />
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create programme'}
            </button>
          </div>
        </>
      )}
    >
      <form onSubmit={onSave} noValidate className="un-form sa-form">
        {!editing ? (
          <FormSection n={1} title="Where it belongs" sub={fixedCollege ? 'Pick the department that runs this programme.' : 'Pick the college and the department that runs this programme.'}>
            <div className="grid2">
              {fixedCollege ? null : <Controller
                control={control}
                name="college_id"
                render={({ field, fieldState }) => (
                  <QuirriSelect
                    id="prog-college"
                    label="College"
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e);
                      setValue('department_id', '');
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    error={fieldState.error?.message}
                    placeholder="Select a college"
                    options={colleges.map((c) => ({ value: c.id, label: c.code ? `${c.name} (${c.code})` : c.name }))}
                  />
                )}
              />}
              <Controller
                control={control}
                name="department_id"
                render={({ field, fieldState }) => (
                  <QuirriSelect
                    id="prog-department"
                    label="Department"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    error={fieldState.error?.message}
                    disabled={!collegeId || deptLoading || !departments.length}
                    placeholder={!collegeId ? 'Select a college first' : deptLoading ? 'Loading departments…' : departments.length ? 'Select a department' : 'No departments in this college'}
                    options={departments.map((d) => ({ value: d.id, label: d.code ? `${d.name} (${d.code})` : d.name }))}
                  />
                )}
              />
            </div>
          </FormSection>
        ) : null}

        <FormSection n={editing ? 1 : 2} title="Programme" sub="The name students and staff will see, and an optional short code.">
          <div className="grid2">
            <QuirriRHFField control={control} name="name" fieldType="academicLabel" label="Programme name" placeholder="e.g. B.E. Computer Science" />
            <QuirriRHFField control={control} name="code" fieldType="code" label="Programme code" placeholder="Optional, e.g. BE-CSE" hint="Letters, numbers, underscore, or hyphen." />
          </div>
        </FormSection>

        <FormSection n={editing ? 2 : 3} title="Duration and semesters" sub="Semesters are created from these. You can still edit them one by one.">
          <div className="grid2">
            <Controller
              control={control}
              name="duration_years"
              render={({ field, fieldState }) => (
                <QuirriSelect
                  id="prog-years"
                  label="Duration"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  error={fieldState.error?.message}
                  options={DURATIONS}
                />
              )}
            />
            <Controller
              control={control}
              name="semesters_per_year"
              render={({ field, fieldState }) => (
                <QuirriSelect
                  id="prog-per-year"
                  label="Terms per year"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  error={fieldState.error?.message}
                  options={PER_YEAR}
                />
              )}
            />
          </div>
          {preview ? (
            <p className={`sa-acad-preview${total > MAX_PROGRAMME_SEMESTERS ? ' is-warn' : ''}`}>
              <Icon name="info" size={14} /> {preview}
            </p>
          ) : null}
        </FormSection>
      </form>
    </QuirriModal>
  );
}

/* ------------------------------------------------- one-field forms (sem / subject / chapter) */
const SIMPLE_FORMS = {
  semester: {
    schema: semesterSchema,
    fields: [{ name: 'name', label: 'Semester name', placeholder: 'e.g. Semester 1 (Foundation)' }],
  },
  subject: {
    schema: subjectSchema,
    fields: [
      { name: 'name', label: 'Subject name', placeholder: 'e.g. Engineering Mathematics I' },
      { name: 'code', label: 'Subject code', placeholder: 'Optional, e.g. MA101', fieldType: 'code', hint: 'Letters, numbers, underscore, or hyphen.' },
    ],
  },
  chapter: {
    schema: chapterSchema,
    fields: [{ name: 'title', label: 'Chapter title', placeholder: 'e.g. Matrices and Determinants' }],
  },
};

function SimpleFormModal({ kind, title, crumb, initial, submitLabel, onSubmit, onClose }) {
  const cfg = SIMPLE_FORMS[kind];
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(cfg.schema),
    defaultValues: initial,
    mode: 'onBlur',
  });
  const [saving, setSaving] = useState(false);
  const save = handleSubmit(async (values) => {
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  });
  return (
    <QuirriModal
      open
      onClose={onClose}
      title={title}
      crumb={crumb}
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose}>Cancel</button>
          <div className="right">
            <button type="button" className="sd-btn sd-btn--amber" onClick={save} disabled={saving}>
              <Icon name="tick" size={16} /> {saving ? 'Saving…' : submitLabel}
            </button>
          </div>
        </>
      )}
    >
      <form onSubmit={save} noValidate className="un-form sa-form">
        {cfg.fields.map((f) => (
          <QuirriRHFField
            key={f.name}
            control={control}
            name={f.name}
            fieldType={f.fieldType || 'academicLabel'}
            label={f.label}
            placeholder={f.placeholder}
            hint={f.hint}
            full
          />
        ))}
      </form>
    </QuirriModal>
  );
}

function ToggleModal({ target, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const deactivating = target.active;
  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };
  return (
    <QuirriModal
      open
      onClose={onClose}
      title={`${deactivating ? 'Deactivate' : 'Reactivate'} ${target.noun}?`}
      crumb={target.name}
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <div className="right">
            <button type="button" className={`sd-btn ${deactivating ? 'un-btn-danger' : 'sd-btn--teal'}`} onClick={run} disabled={busy}>
              {busy ? 'Updating…' : deactivating ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        </>
      )}
    >
      <ConfirmNote danger={deactivating} title={deactivating ? 'This is a soft delete.' : `The ${target.noun} becomes active again.`}>
        {deactivating
          ? `${target.name} is hidden from active lists and can't take new content. Everything under it is kept, and you can reactivate it at any time.`
          : `${target.name} appears in active lists again.`}
      </ConfirmNote>
    </QuirriModal>
  );
}

/* ------------------------------------------------------------ subject + chapters */
function SubjectCard({ subject, canEdit, showInactive, openModal, onChanged }) {
  const [open, setOpen] = useState(false);
  const { data, loading, reload } = useAsyncResource(
    () => (open ? fetchData(() => academicsApi.listChapters(subject.id, { include_inactive: showInactive })) : Promise.resolve(null)),
    [open, subject.id, showInactive],
  );
  const chapters = asList(data, []);
  const active = subject.is_active !== false;

  const move = async (index, dir) => {
    const ids = chapters.map((c) => c.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    try {
      await academicsApi.reorderChapters(subject.id, ids);
      await reload();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not reorder chapters'));
    }
  };

  const refresh = async () => {
    await reload();
    onChanged();
  };

  return (
    <li className={`sa-acad-subject${active ? '' : ' is-off'}`}>
      <div className="sa-acad-subject-h">
        <button type="button" className="sa-acad-subject-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className={`sa-acad-caret${open ? ' is-open' : ''}`} aria-hidden="true"><Icon name="chev" size={16} /></span>
          <span className="sa-acad-subject-name">
            <b>{subject.name}</b>
            <small>
              {[
                subject.code,
                plural(subject.chapter_count ?? 0, 'chapter'),
                subject.staff?.length ? `Taught by ${subject.staff.map((p) => p.name).join(', ')}` : 'No teacher assigned',
              ].filter(Boolean).join(' · ')}
            </small>
          </span>
        </button>
        {!active ? <StatusPill active={false} /> : null}
        {canEdit ? (
          <div className="ad-actions">
            <IconButton icon="edit" label={`Edit ${subject.name}`} onClick={() => openModal({ type: 'subject-edit', subject, onDone: refresh })} />
            <IconButton
              icon={active ? 'lock' : 'refresh'}
              danger={active}
              label={`${active ? 'Deactivate' : 'Reactivate'} ${subject.name}`}
              onClick={() => openModal({ type: 'toggle', target: { noun: 'subject', name: subject.name, active, kind: 'subject', id: subject.id }, onDone: onChanged })}
            />
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="sa-acad-chapters">
          {loading && !chapters.length ? <p className="sa-muted">Loading chapters…</p> : null}
          {!loading && !chapters.length ? (
            <p className="sa-muted">No chapters yet. Add the first one to start tagging content to it.</p>
          ) : null}
          {chapters.length ? (
            <ol>
              {chapters.map((c, i) => {
                const cActive = c.is_active !== false;
                return (
                  <li key={c.id} className={cActive ? undefined : 'is-off'}>
                    <span className="sa-acad-pos">{i + 1}</span>
                    <span className="sa-acad-ch-title">
                      <b>{c.title}</b>
                      <small>
                        {c.video_count
                          ? `${plural(c.video_count, 'video')}${c.published_count ? ` · ${countLabel(c.published_count)} published` : ''}`
                          : 'No content yet'}
                      </small>
                    </span>
                    {!cActive ? <StatusPill active={false} /> : null}
                    {canEdit ? (
                      <div className="ad-actions">
                        <span className="sa-rot-up"><IconButton icon="chev" label={`Move ${c.title} up`} disabled={i === 0} onClick={() => move(i, -1)} /></span>
                        <span className="sa-rot-down"><IconButton icon="chev" label={`Move ${c.title} down`} disabled={i === chapters.length - 1} onClick={() => move(i, 1)} /></span>
                        <IconButton icon="edit" label={`Rename ${c.title}`} onClick={() => openModal({ type: 'chapter-edit', chapter: c, onDone: refresh })} />
                        <IconButton
                          icon={cActive ? 'lock' : 'refresh'}
                          danger={cActive}
                          label={`${cActive ? 'Deactivate' : 'Reactivate'} ${c.title}`}
                          onClick={() => openModal({ type: 'toggle', target: { noun: 'chapter', name: c.title, active: cActive, kind: 'chapter', id: c.id }, onDone: refresh })}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : null}
          {canEdit && active ? (
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => openModal({ type: 'chapter-new', subject, onDone: refresh })}>
              <Icon name="plus" size={14} /> Add chapter
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------ page */
/**
 * Programme > Semester > Subject > Chapter workspace (SOW §6.2).
 * Super Admin: every college (college filter). College Admin: pass
 * `collegeId` - the college is fixed and the server scopes every call to it.
 */
export default function AcademicStructureWorkspace({ collegeId: fixedCollegeId = null, initialDepartment = '', header = null }) {
  const fixedCollege = Boolean(fixedCollegeId);
  const [college, setCollege] = useState(fixedCollegeId || '');
  const [department, setDepartment] = useState(initialDepartment || '');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [selectedId, setSelectedId] = useState(null);
  const [semesterId, setSemesterId] = useState(null);
  const [modal, setModal] = useState(null);
  const showInactive = status === 'all';
  const canEdit = true; // Super Admin / College Admin write; the server enforces scope

  useEffect(() => {
    if (fixedCollegeId) setCollege(fixedCollegeId);
  }, [fixedCollegeId]);

  const { data: collegeData } = useAsyncResource(
    () => (fixedCollege ? Promise.resolve(null) : fetchData(() => collegesApi.list({ pageSize: 100 }))),
    [fixedCollege],
  );
  const colleges = useMemo(() => asList(collegeData, []), [collegeData]);

  const { data: deptData } = useAsyncResource(
    () => (college ? fetchData(() => departmentsApi.list({ college_id: college, pageSize: 100 })) : Promise.resolve(null)),
    [college],
  );
  const departments = useMemo(() => asList(deptData, []), [deptData]);

  const scope = { college_id: college, department_id: department };
  const { data: summary, reload: reloadSummary } = useAsyncResource(
    () => fetchData(() => academicsApi.summary(scope)),
    [college, department],
  );
  const { data: programData, loading: programsLoading, error: programsError, reload: reloadPrograms } = useAsyncResource(
    () => fetchData(() => academicsApi.listPrograms({ ...scope, q: search, include_inactive: showInactive })),
    [college, department, search, showInactive],
  );
  const programmes = useMemo(() => asList(programData, []), [programData]);

  useEffect(() => {
    if (!programmes.length) {
      setSelectedId(null);
      return;
    }
    if (!programmes.some((p) => p.id === selectedId)) setSelectedId(programmes[0].id);
  }, [programmes, selectedId]);

  const { data: programme, loading: programmeLoading, reload: reloadProgramme } = useAsyncResource(
    () => (selectedId ? fetchData(() => academicsApi.getProgram(selectedId)) : Promise.resolve(null)),
    [selectedId],
  );
  const semesters = useMemo(
    () => (programme?.semesters || []).filter((s) => showInactive || s.is_active !== false),
    [programme, showInactive],
  );
  useEffect(() => {
    if (!semesters.length) {
      setSemesterId(null);
      return;
    }
    if (!semesters.some((s) => s.id === semesterId)) setSemesterId(semesters[0].id);
  }, [semesters, semesterId]);
  const semester = semesters.find((s) => s.id === semesterId) || null;

  const { data: subjectData, loading: subjectsLoading, reload: reloadSubjects } = useAsyncResource(
    () => (semesterId ? fetchData(() => academicsApi.listSubjects(semesterId, { include_inactive: showInactive })) : Promise.resolve(null)),
    [semesterId, showInactive],
  );
  const subjects = asList(subjectData, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([reloadPrograms(), reloadProgramme(), reloadSubjects(), reloadSummary()]);
  }, [reloadPrograms, reloadProgramme, reloadSubjects, reloadSummary]);

  const close = () => setModal(null);

  const runToggle = async () => {
    const { kind, id, active } = modal.target;
    const body = { is_active: !active };
    try {
      if (kind === 'program') await academicsApi.updateProgram(id, body);
      if (kind === 'semester') await academicsApi.updateSemester(id, body);
      if (kind === 'subject') await academicsApi.updateSubject(id, body);
      if (kind === 'chapter') await academicsApi.updateChapter(id, body);
      toast.success(`${modal.target.name} ${active ? 'deactivated' : 'reactivated'}`);
      const done = modal.onDone;
      close();
      await refreshAll();
      if (done) await done();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update'));
    }
  };

  const submitSimple = (fn, okMessage) => async (values) => {
    try {
      await fn(values);
      toast.success(okMessage);
      const done = modal?.onDone;
      close();
      await refreshAll();
      if (done) await done();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save'));
    }
  };

  const collegeOptions = [{ value: '', label: 'All colleges' }, ...colleges.map((c) => ({ value: c.id, label: c.code ? `${c.name} (${c.code})` : c.name }))];
  const departmentOptions = [{ value: '', label: 'All departments' }, ...departments.map((d) => ({ value: d.id, label: d.name }))];
  const progActive = programme?.is_active !== false;
  const semActive = semester?.is_active !== false;

  return (
    <ModulePage className="sa-page sa-acad">
      {header}
      <ModuleBanner
        icon="tree"
        eyebrow="Academic hierarchy"
        title="Academic structure"
        lede="Programmes, semesters, subjects and chapters under each department. Chapters are what uploaded content and student progress are tagged to."
        chips={(
          <div className="un-hier" aria-label="Hierarchy">
            <span>Department</span><Icon name="chev" size={12} />
            <span className="is-on">Programme</span><Icon name="chev" size={12} />
            <span>Semester</span><Icon name="chev" size={12} />
            <span>Subject</span><Icon name="chev" size={12} />
            <span>Chapter</span>
          </div>
        )}
        actions={(
          <button type="button" className="sd-btn sd-btn--amber" onClick={() => setModal({ type: 'program-new' })}>
            <Icon name="plus" size={16} /> New programme
          </button>
        )}
      />

      <KpiRow
        label="Academic structure summary"
        items={[
          { icon: 'layers', label: 'Programmes', value: summary ? countLabel(summary.programs) : null, sub: 'Active' },
          { icon: 'calendar', label: 'Semesters', value: summary ? countLabel(summary.semesters) : null, sub: 'Across active programmes' },
          { icon: 'book', label: 'Subjects', value: summary ? countLabel(summary.subjects) : null, sub: 'Active' },
          { icon: 'doc', label: 'Chapters', value: summary ? countLabel(summary.chapters) : null, sub: summary ? `${countLabel(summary.chapters_with_content)} with uploaded content` : null },
        ]}
      />

      <FilterBar label="Structure filters">
        <SearchBox placeholder="Search programme name or code…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {fixedCollege ? null : (
          <QuirriSelect
            ariaLabel="Filter by college"
            value={college}
            onChange={(e) => { setCollege(e.target.value); setDepartment(''); }}
            placeholder="All colleges"
            options={collegeOptions}
          />
        )}
        <QuirriSelect
          ariaLabel="Filter by department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder={college ? 'All departments' : 'Pick a college first'}
          disabled={!college}
          options={departmentOptions}
        />
        <SegTabs label="Show" options={STATUS_FILTERS} value={status} onChange={setStatus} />
      </FilterBar>

      {programsError ? (
        <SectionState tone="err" title="Could not load programmes">{apiErrorMessage(programsError, 'Please try again.')}</SectionState>
      ) : null}

      <div className="sa-acad-grid">
        <Panel title="Programmes" sub={programmes.length ? plural(programmes.length, 'programme') : 'Pick one to manage its semesters'} bodyClassName={null}>
          {programmes.length ? (
            <ul className="sa-acad-list" role="listbox" aria-label="Programmes">
              {programmes.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={p.id === selectedId}
                    className={`sa-acad-prog${p.id === selectedId ? ' is-on' : ''}${p.is_active === false ? ' is-off' : ''}`}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <b>{p.name}{p.code ? <span className="un-code">{p.code}</span> : null}</b>
                    <small>{fixedCollege ? p.department_name : `${p.department_name} · ${p.college_name}`}</small>
                    <small>{plural(p.semester_count, 'semester')} · {plural(p.subject_count, 'subject')} · {plural(p.chapter_count, 'chapter')}</small>
                    {p.is_active === false ? <StatusPill active={false} /> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <PanelEmpty
              icon="layers"
              title={programsLoading ? 'Loading programmes…' : search ? 'No programmes match' : 'No programmes yet'}
              action={!programsLoading && !search ? (
                <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={() => setModal({ type: 'program-new' })}>
                  <Icon name="plus" size={14} /> Add a programme
                </button>
              ) : null}
            >
              {programsLoading ? null : search ? 'Try another name or code.' : 'Create a programme under a department to start building semesters, subjects and chapters.'}
            </PanelEmpty>
          )}
        </Panel>

        <Panel
          title={programme ? programme.name : 'Programme'}
          sub={programme ? `${fixedCollege ? '' : `${programme.college_name} · `}${programme.department_name} · ${programme.duration_years} year${programme.duration_years > 1 ? 's' : ''}, ${plural(programme.planned_semesters, 'semester')}` : 'Select a programme on the left'}
          action={programme ? (
            <div className="ad-actions">
              {!progActive ? <StatusPill active={false} /> : null}
              <IconButton icon="edit" label={`Edit ${programme.name}`} onClick={() => setModal({ type: 'program-edit', programme })} />
              <IconButton
                icon={progActive ? 'lock' : 'refresh'}
                danger={progActive}
                label={`${progActive ? 'Deactivate' : 'Reactivate'} ${programme.name}`}
                onClick={() => setModal({ type: 'toggle', target: { noun: 'programme', name: programme.name, active: progActive, kind: 'program', id: programme.id } })}
              />
            </div>
          ) : null}
          bodyClassName={null}
        >
          {!programme ? (
            <PanelEmpty icon="tree" title={programmeLoading ? 'Loading…' : 'Nothing selected'}>
              {programmeLoading ? null : 'Pick or create a programme to see its semesters.'}
            </PanelEmpty>
          ) : (
            <div className="sa-acad-detail">
              <div className="sa-acad-sems" role="tablist" aria-label="Semesters">
                {semesters.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={s.id === semesterId}
                    className={`sa-acad-sem${s.id === semesterId ? ' is-on' : ''}${s.is_active === false ? ' is-off' : ''}`}
                    onClick={() => setSemesterId(s.id)}
                  >
                    {s.name}
                    <small>{plural(s.subject_count, 'subject')}</small>
                  </button>
                ))}
                {progActive ? (
                  <button
                    type="button"
                    className="sa-acad-sem sa-acad-sem--add"
                    onClick={() => setModal({ type: 'semester-new', programme })}
                  >
                    <Icon name="plus" size={14} /> Add semester
                  </button>
                ) : null}
              </div>

              {semester ? (
                <div className="sa-acad-semhead">
                  <div>
                    <b>{semester.name}</b>
                    <small>{plural(semester.subject_count, 'subject')}{!semActive ? ' · inactive' : ''}</small>
                  </div>
                  <div className="ad-actions">
                    <IconButton icon="edit" label={`Rename ${semester.name}`} onClick={() => setModal({ type: 'semester-edit', semester })} />
                    <IconButton
                      icon={semActive ? 'lock' : 'refresh'}
                      danger={semActive}
                      label={`${semActive ? 'Deactivate' : 'Reactivate'} ${semester.name}`}
                      onClick={() => setModal({ type: 'toggle', target: { noun: 'semester', name: semester.name, active: semActive, kind: 'semester', id: semester.id } })}
                    />
                    {semActive && progActive ? (
                      <button type="button" className="sd-btn sd-btn--teal sd-btn--sm" onClick={() => setModal({ type: 'subject-new', semester })}>
                        <Icon name="plus" size={14} /> Add subject
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {semester ? (
                subjects.length ? (
                  <ul className="sa-acad-subjects">
                    {subjects.map((s) => (
                      <SubjectCard
                        key={s.id}
                        subject={s}
                        canEdit={canEdit}
                        showInactive={showInactive}
                        openModal={setModal}
                        onChanged={refreshAll}
                      />
                    ))}
                  </ul>
                ) : (
                  <PanelEmpty icon="book" title={subjectsLoading ? 'Loading subjects…' : `No subjects in ${semester.name} yet`}>
                    {subjectsLoading ? null : 'Add the subjects taught this semester, then their chapters.'}
                  </PanelEmpty>
                )
              ) : (
                <PanelEmpty icon="calendar" title="No semesters">Add a semester to this programme to start adding subjects.</PanelEmpty>
              )}
            </div>
          )}
        </Panel>
      </div>

      {modal?.type === 'program-new' || modal?.type === 'program-edit' ? (
        <ProgrammeModal
          programme={modal.type === 'program-edit' ? modal.programme : null}
          colleges={colleges.filter((c) => c.is_active !== false)}
          defaults={{ college, department }}
          fixedCollege={fixedCollege}
          onClose={close}
          onSaved={async (saved) => {
            close();
            await refreshAll();
            // Select after the list has the new programme, or the "keep a valid
            // selection" effect would snap back to the first one.
            if (saved?.id) setSelectedId(saved.id);
          }}
        />
      ) : null}

      {modal?.type === 'semester-new' ? (
        <SimpleFormModal
          kind="semester"
          title="Add semester"
          crumb={modal.programme.name}
          initial={{ name: `Semester ${(modal.programme.semester_total || 0) + 1}` }}
          submitLabel="Add semester"
          onClose={close}
          onSubmit={submitSimple((v) => academicsApi.addSemester(modal.programme.id, { name: v.name }), 'Semester added')}
        />
      ) : null}
      {modal?.type === 'semester-edit' ? (
        <SimpleFormModal
          kind="semester"
          title="Rename semester"
          crumb={programme?.name}
          initial={{ name: modal.semester.name }}
          submitLabel="Save"
          onClose={close}
          onSubmit={submitSimple((v) => academicsApi.updateSemester(modal.semester.id, { name: v.name }), 'Semester renamed')}
        />
      ) : null}
      {modal?.type === 'subject-new' ? (
        <SimpleFormModal
          kind="subject"
          title="Add subject"
          crumb={`${programme?.name} · ${modal.semester.name}`}
          initial={{ name: '', code: '' }}
          submitLabel="Add subject"
          onClose={close}
          onSubmit={submitSimple((v) => academicsApi.createSubject(modal.semester.id, { name: v.name, code: v.code || null }), 'Subject added')}
        />
      ) : null}
      {modal?.type === 'subject-edit' ? (
        <SimpleFormModal
          kind="subject"
          title="Edit subject"
          crumb={`${programme?.name} · ${semester?.name}`}
          initial={{ name: modal.subject.name, code: modal.subject.code || '' }}
          submitLabel="Save"
          onClose={close}
          onSubmit={submitSimple((v) => academicsApi.updateSubject(modal.subject.id, { name: v.name, code: v.code || null }), 'Subject updated')}
        />
      ) : null}
      {modal?.type === 'chapter-new' ? (
        <SimpleFormModal
          kind="chapter"
          title="Add chapter"
          crumb={modal.subject.name}
          initial={{ title: '' }}
          submitLabel="Add chapter"
          onClose={close}
          onSubmit={submitSimple((v) => academicsApi.createChapter(modal.subject.id, { title: v.title }), 'Chapter added')}
        />
      ) : null}
      {modal?.type === 'chapter-edit' ? (
        <SimpleFormModal
          kind="chapter"
          title="Rename chapter"
          crumb={modal.chapter.title}
          initial={{ title: modal.chapter.title }}
          submitLabel="Save"
          onClose={close}
          onSubmit={submitSimple((v) => academicsApi.updateChapter(modal.chapter.id, { title: v.title }), 'Chapter renamed')}
        />
      ) : null}
      {modal?.type === 'toggle' ? <ToggleModal target={modal.target} onConfirm={runToggle} onClose={close} /> : null}
    </ModulePage>
  );
}
