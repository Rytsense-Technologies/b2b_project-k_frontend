import { redirect } from 'next/navigation';

/** Reports moved to their own module — keep old links working. */
export default function LegacyInterviewReportsPage() {
  redirect('/student/reports');
}
