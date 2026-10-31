'use client';

import { usePathname } from 'next/navigation';
import FacultyNotFound from '@/app/faculty/(portal)/not-found';
import { ModulePage, SectionState } from '@/components/shared/module-ui';
import { useFacultyScope } from '@/hooks/useFacultyScope';

/**
 * An HOD / Faculty account with no department can't see anything yet - show
 * one clear screen instead of an error on every page. Settings and
 * Notifications stay reachable (they don't depend on a department).
 * Staff and Reports are HOD-only: Faculty hitting those URLs get the portal 404
 * (same as an unknown path), not the HOD module.
 */
export default function FacultyAccessGate({ children }) {
  const pathname = usePathname() || '';
  const { scope, error } = useFacultyScope();
  const status = error?.response?.status ?? error?.status;
  const detail = String(error?.response?.data?.detail || error?.message || '');
  const noDepartment = status === 400 && /department/i.test(detail);
  const exempt = pathname.startsWith('/faculty/settings') || pathname.startsWith('/faculty/notifications');
  const hodOnlyStaff = pathname.startsWith('/faculty/staff');
  const hodOnlyReports = pathname.startsWith('/faculty/reports');

  if (scope && hodOnlyStaff && !scope.can_see_staff) return <FacultyNotFound />;
  if (scope && hodOnlyReports && !scope.can_export_reports) return <FacultyNotFound />;

  if (noDepartment && !exempt) {
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
