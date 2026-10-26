'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AcademicStructureWorkspace from '@/components/shared/AcademicStructureWorkspace';
import StructureTabs from '@/components/admin/StructureTabs';
import { SectionState } from '@/components/shared/module-ui';
import { useAuth } from '@/hooks/useAuth';

function Workspace() {
  const { tenantId } = useAuth();
  const params = useSearchParams();
  // tenantId comes from browser storage; wait for mount so server and client
  // render the same first HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !tenantId) return <SectionState title="Loading your college…" />;
  return (
    <AcademicStructureWorkspace
      key={tenantId}
      collegeId={tenantId}
      initialDepartment={params.get('department') || ''}
      header={<StructureTabs />}
    />
  );
}

/** College Admin: programmes, semesters, subjects and chapters of their own college. */
export default function CollegeProgrammesPage() {
  return (
    <div className="ad-page">
      <Suspense fallback={<SectionState title="Loading academic structure…" />}>
        <Workspace />
      </Suspense>
    </div>
  );
}
