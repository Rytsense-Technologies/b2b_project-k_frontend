'use client';

import { useEffect, useMemo } from 'react';
import { QuirriSelect } from '@/components/superadmin/quirri-ui';
import { academicsApi } from '@/lib/api/superadmin/academics';
import { asList } from '@/lib/api/superadmin/http';
import { fetchData } from '@/lib/api/superadmin/modules';
import { useAsyncResource } from '@/hooks/useAsyncResource';

/**
 * Programme + current semester pickers for a student (SOW §5.3 / §6.3).
 * Options come from the academic structure of the given department; both are
 * optional ("Not set"). Changing the programme clears the semester.
 */
export default function StudentPlacementFields({ departmentId, programId, semesterId, onChange, idPrefix = 'placement' }) {
  const { data: programData, loading: programsLoading } = useAsyncResource(
    () => (departmentId
      ? fetchData(() => academicsApi.listPrograms({ department_id: departmentId }))
      : Promise.resolve(null)),
    [departmentId],
  );
  const programs = useMemo(() => asList(programData, []), [programData]);

  const { data: programDetail, loading: semestersLoading } = useAsyncResource(
    () => (programId ? fetchData(() => academicsApi.getProgram(programId)) : Promise.resolve(null)),
    [programId],
  );
  const semesters = useMemo(
    () => (programDetail?.semesters || []).filter((s) => s.is_active !== false),
    [programDetail],
  );

  // A programme from another department (department changed) no longer applies.
  useEffect(() => {
    if (programId && programData && !programs.some((p) => p.id === programId)) {
      onChange({ program_id: '', semester_id: '' });
    }
  }, [programId, programData, programs, onChange]);

  const noProgrammes = departmentId && !programsLoading && !programs.length;

  return (
    <div className="grid2">
      <QuirriSelect
        id={`${idPrefix}-programme`}
        label="Programme"
        value={programId || ''}
        onChange={(e) => onChange({ program_id: e.target.value, semester_id: '' })}
        disabled={!departmentId || programsLoading || noProgrammes}
        placeholder={!departmentId ? 'Select a department first' : programsLoading ? 'Loading programmes…' : noProgrammes ? 'No programmes in this department' : 'Not set'}
        hint={noProgrammes ? 'Add programmes under Academic structure first.' : 'Decides which subjects and chapters the student sees.'}
        options={[{ value: '', label: 'Not set' }, ...programs.map((p) => ({ value: p.id, label: p.code ? `${p.name} (${p.code})` : p.name }))]}
      />
      <QuirriSelect
        id={`${idPrefix}-semester`}
        label="Current semester"
        value={semesterId || ''}
        onChange={(e) => onChange({ program_id: programId, semester_id: e.target.value })}
        disabled={!programId || semestersLoading || !semesters.length}
        placeholder={!programId ? 'Select a programme first' : semestersLoading ? 'Loading semesters…' : 'Select semester'}
        hint="Year of study is worked out from the semester."
        options={semesters.map((s) => ({ value: s.id, label: s.name }))}
      />
    </div>
  );
}
