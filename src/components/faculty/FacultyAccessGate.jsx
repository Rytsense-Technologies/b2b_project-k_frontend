'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import FacultyNotFound from '@/app/faculty/(portal)/not-found';
import { ModulePage, SectionState } from '@/components/shared/module-ui';
import { useFacultyScope } from '@/hooks/useFacultyScope';
import { scopeFailure } from '@/components/faculty/facultyNav';
import { apiErrorMessage } from '@/lib/api/superadmin/http';

/**
 * An HOD / Faculty account with no department can't see anything yet - show
 * one clear screen instead of an error on every page. Settings and
 * Notifications stay reachable (they don't depend on a department).
 * Staff and Reports are HOD-only: Faculty hitting those URLs get the portal 404
 * (same as an unknown path), not the HOD module.
 */
export default function FacultyAccessGate({ children }) {
  const pathname = usePathname() || '';
  const { scope, error, reload } = useFacultyScope();
  const [retrying, setRetrying] = useState(false);
  const failure = scopeFailure(error);
  const exempt = pathname.startsWith('/faculty/settings') || pathname.startsWith('/faculty/notifications');
  const hodOnlyStaff = pathname.startsWith('/faculty/staff');
  const hodOnlyReports = pathname.startsWith('/faculty/reports');

  if (scope && hodOnlyStaff && !scope.can_see_staff) return <FacultyNotFound />;
  if (scope && hodOnlyReports && !scope.can_export_reports) return <FacultyNotFound />;

  const retry = () => {
    if (retrying) return;
    setRetrying(true);
    reload().catch(() => {}).finally(() => setRetrying(false));
  };

  if (failure === 'failed' && !exempt) {
    return (
      <ModulePage className="fa-page">
        <SectionState
          tone="err"
          title="Could not load your department details"
          action={(
            <button type="button" className="sd-btn sd-btn--ghost sd-btn--sm" onClick={retry} aria-disabled={retrying}>
              {retrying ? 'Trying…' : 'Try again'}
            </button>
          )}
        >
          {apiErrorMessage(error, 'Check your connection and try again.')}
        </SectionState>
      </ModulePage>
    );
  }

  if (failure === 'no_department' && !exempt) {
    return (
      <ModulePage className="fa-page">
        <SectionState title="Your account isn't in a department yet">
          Ask your College Admin to add you to a department (Staff &amp; HOD › your name). Once they do, your
          review queue, subjects and students appear here. You can still update your profile under Settings.
        </SectionState>
      </ModulePage>
    );
  }
  return children;
}
