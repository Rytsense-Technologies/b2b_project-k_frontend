'use client';

import ReportsWorkspace from '@/components/shared/ReportsWorkspace';

/** College Admin reports (SOW §6.5.2): student / cohort / department / Q&A
 *  reports for their own college, with CSV, Excel and PDF export.
 *  The scope chip reads "Your college", as on the other College Admin pages. */
export default function AdminReportsPage() {
  return <ReportsWorkspace scope="college" />;
}
