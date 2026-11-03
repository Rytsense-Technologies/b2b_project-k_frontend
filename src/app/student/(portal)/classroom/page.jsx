'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SectionState } from '@/components/student/ui';
import { SUBJECTS_PATH } from '@/lib/student/learning';

/** Old bookmark: classroom lives on My subjects (`?subject=&chapter=`). */
export default function StudentClassroomRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(SUBJECTS_PATH);
  }, [router]);
  return <SectionState title="Opening your classroom…" />;
}
