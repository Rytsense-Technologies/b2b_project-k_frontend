import { redirect } from 'next/navigation';

/** Reports moved to their own module — keep old links (?session=) working. */
export default function LegacyInterviewReportPage({ searchParams }) {
  const sid = searchParams?.session || searchParams?.report || '';
  redirect(sid ? `/student/reports/view?session=${encodeURIComponent(sid)}` : '/student/reports');
}
