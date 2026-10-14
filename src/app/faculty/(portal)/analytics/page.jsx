'use client';

import InsightsView from '@/components/admin/InsightsView';
import ScopeNotice from '@/components/faculty/ScopeNotice';
import { analyticsApi } from '@/lib/api/analytics';
import { useFacultyScope } from '@/hooks/useFacultyScope';

/** HOD: department analytics. Faculty: the students and subjects they teach. */
export default function FacultyAnalyticsPage() {
  const { scope } = useFacultyScope();
  return (
    <InsightsView
      load={analyticsApi.department}
      showDepartmentFilter={false}
      title="Department analytics"
      lede={scope && !scope.is_hod && scope.subject_limited
        ? 'Completion, quiz scores, tutor questions and interview readiness for the students and subjects you teach.'
        : 'Completion, quiz scores, tutor questions and interview readiness across your department.'}
      links={{ reports: scope?.is_hod ? '/faculty/reports' : null, interviews: '/faculty/interviews' }}
      notice={<ScopeNotice scope={scope} what="results" />}
    />
  );
}
