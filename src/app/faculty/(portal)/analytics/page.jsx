'use client';

import InsightsView from '@/components/admin/InsightsView';
import { scopeChip, ReadOnlyNote } from '@/components/faculty/facultyKit';
import { ModulePage, SectionState } from '@/components/shared/module-ui';
import { analyticsApi } from '@/lib/api/analytics';
import { useFacultyScope } from '@/hooks/useFacultyScope';

/**
 * HOD: department analytics. Faculty: the students and subjects they teach.
 * Scope is said once (FacultyScopeChip); the full notice is kept only for Faculty without subjects.
 * Nothing renders until scope is known, so Faculty never see department-wide wording first.
 */
export default function FacultyAnalyticsPage() {
  const { scope, error } = useFacultyScope();
  if (error) return <ModulePage className="fa-page"><SectionState tone="err" title="Could not load your access">Refresh the page to try again.</SectionState></ModulePage>;
  if (!scope) return <ModulePage className="fa-page"><SectionState title="Loading analytics…" /></ModulePage>;
  return (
    <InsightsView
      load={analyticsApi.department}
      showDepartmentFilter={false}
      links={{ reports: scope.is_hod ? '/faculty/reports' : null }}
      chips={scopeChip(scope)}
      notice={<ReadOnlyNote scope={scope} what="results" />}
    />
  );
}
