'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import { Icon } from '@/components/shared/module-ui';
import { academicsApi } from '@/lib/api/superadmin/academics';
import { eduVideoApi } from '@/lib/api/admin/eduVideo';
import { asList, apiErrorMessage } from '@/lib/api/superadmin/http';
import { fetchData } from '@/lib/api/superadmin/modules';
import { useAsyncResource } from '@/hooks/useAsyncResource';

/**
 * Link existing content (an uploaded chapter video) to an academic-structure
 * chapter - for uploads made before Programmes / Subjects existed. Options are
 * limited to the content's own department.
 */
export default function ChapterLinkModal({ job, onClose, onSaved }) {
  const [programId, setProgramId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: programData, loading: programsLoading } = useAsyncResource(
    () => (job?.department_id
      ? fetchData(() => academicsApi.listPrograms({ department_id: job.department_id }))
      : Promise.resolve(null)),
    [job?.department_id],
  );
  const programs = useMemo(() => asList(programData, []), [programData]);
  const { data: programDetail } = useAsyncResource(
    () => (programId ? fetchData(() => academicsApi.getProgram(programId)) : Promise.resolve(null)),
    [programId],
  );
  const semesters = (programDetail?.semesters || []).filter((s) => s.is_active !== false);
  const { data: subjectData } = useAsyncResource(
    () => (semesterId ? fetchData(() => academicsApi.listSubjects(semesterId)) : Promise.resolve(null)),
    [semesterId],
  );
  const subjects = asList(subjectData, []);
  const { data: chapterData } = useAsyncResource(
    () => (subjectId ? fetchData(() => academicsApi.listChapters(subjectId)) : Promise.resolve(null)),
    [subjectId],
  );
  const chapters = asList(chapterData, []);

  const save = async (nextChapterId) => {
    setSaving(true);
    try {
      await eduVideoApi.setChapter(job.job_id, nextChapterId);
      toast.success(nextChapterId ? 'Linked to the chapter' : 'Chapter link removed');
      await onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update the chapter link'));
    } finally {
      setSaving(false);
    }
  };

  const noProgrammes = !programsLoading && !programs.length;

  return (
    <QuirriModal
      open
      onClose={onClose}
      title="Link to a chapter"
      crumb={job.chapter_title || 'Untitled chapter'}
      wide
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <div className="right">
            {job.chapter_id ? (
              <button type="button" className="sd-btn sd-btn--ghost" onClick={() => save(null)} disabled={saving}>
                Remove link
              </button>
            ) : null}
            <button type="button" className="sd-btn sd-btn--amber" onClick={() => save(chapterId)} disabled={saving || !chapterId}>
              <Icon name="tick" size={16} /> {saving ? 'Saving…' : 'Link chapter'}
            </button>
          </div>
        </>
      )}
    >
      <div className="un-form sa-form">
        <p className="ad-muted">
          {job.chapter_path ? <>Currently linked to <b>{job.chapter_path}</b>. </> : 'Not linked to the academic structure yet. '}
          Linked content appears under its subject in the student classroom, in course order.
        </p>
        {!job.department_id ? (
          <p className="ad-muted">This upload has no department, so it can&apos;t be linked. Re-upload it with a department.</p>
        ) : noProgrammes ? (
          <p className="ad-muted">This department has no programmes yet. Add them under Academic structure first.</p>
        ) : (
          <div className="grid2">
            <QuirriSelect
              id="link-programme"
              label="Programme"
              value={programId}
              onChange={(e) => { setProgramId(e.target.value); setSemesterId(''); setSubjectId(''); setChapterId(''); }}
              placeholder={programsLoading ? 'Loading programmes…' : 'Select programme'}
              disabled={programsLoading}
              options={programs.map((p) => ({ value: p.id, label: p.code ? `${p.name} (${p.code})` : p.name }))}
            />
            <QuirriSelect
              id="link-semester"
              label="Semester"
              value={semesterId}
              onChange={(e) => { setSemesterId(e.target.value); setSubjectId(''); setChapterId(''); }}
              placeholder={programId ? 'Select semester' : 'Select a programme first'}
              disabled={!programId || !semesters.length}
              options={semesters.map((s) => ({ value: s.id, label: s.name }))}
            />
            <QuirriSelect
              id="link-subject"
              label="Subject"
              value={subjectId}
              onChange={(e) => { setSubjectId(e.target.value); setChapterId(''); }}
              placeholder={!semesterId ? 'Select a semester first' : subjects.length ? 'Select subject' : 'No subjects in this semester'}
              disabled={!semesterId || !subjects.length}
              options={subjects.map((s) => ({ value: s.id, label: s.code ? `${s.name} (${s.code})` : s.name }))}
            />
            <QuirriSelect
              id="link-chapter"
              label="Chapter"
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              placeholder={!subjectId ? 'Select a subject first' : chapters.length ? 'Select chapter' : 'No chapters in this subject'}
              disabled={!subjectId || !chapters.length}
              options={chapters.map((c) => ({ value: c.id, label: `${c.position}. ${c.title}` }))}
            />
          </div>
        )}
      </div>
    </QuirriModal>
  );
}
