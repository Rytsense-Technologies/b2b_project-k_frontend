'use client';

import { useEffect, useState } from 'react';
import ReportsWorkspace from '@/components/shared/ReportsWorkspace';
import { useAuth } from '@/hooks/useAuth';

/** College Admin reports (SOW §6.5.2): student / cohort / department / Q&A /
 *  interview reports for their own college, with CSV, Excel and PDF export. */
export default function AdminReportsPage() {
  const { user } = useAuth();
  // The stored profile only exists in the browser; render the neutral label
  // first so server and client HTML match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const collegeName = mounted ? (user?.college_name || user?.tenant_name || '') : '';
  return <ReportsWorkspace scope="college" collegeName={collegeName} />;
}
