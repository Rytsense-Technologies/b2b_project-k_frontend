'use client';

import { ConfirmNote } from '@/components/shared/module-ui';

/**
 * Tells an HOD / Faculty member what they are looking at:
 *  - Faculty without subjects: department, view only (until subjects are assigned).
 *  - Faculty with subjects: only those subjects.
 * The HOD sees the whole department, so nothing is shown.
 */
export default function ScopeNotice({ scope, what = 'content' }) {
  if (!scope || scope.is_hod) return null;
  if (scope.read_only) {
    return (
      <ConfirmNote icon="lock" title="View only until you have subjects">
        {`You can see your department's ${what}, but reviewing, publishing and approving unlock once your College Admin assigns you subjects (Staff › Assign subjects).`}
      </ConfirmNote>
    );
  }
  const names = (scope.subjects || []).map((s) => s.name);
  return (
    <ConfirmNote icon="book" title={`Your subjects: ${names.join(', ')}`}>
      {`Showing ${what} for these subjects only. Anything else in ${scope.department_name || 'your department'} is with your HOD.`}
    </ConfirmNote>
  );
}
