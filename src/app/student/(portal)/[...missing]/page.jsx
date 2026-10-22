import Link from 'next/link';
import { Icon, SectionState } from '@/components/student/ui';

/**
 * Unknown student URLs (old bookmarks such as /student/interviews or /student/reports,
 * removed 20 Oct 2026) stay inside the portal shell instead of the bare Next 404.
 */
export default function StudentPageNotFound() {
  return (
    <SectionState
      title="This page isn’t available"
      action={<Link className="sd-btn sd-btn--ghost sd-btn--sm" href="/student/home"><Icon name="back" size={16} /> Go to Dashboard</Link>}
    >
      The link may be old or the page has moved.
    </SectionState>
  );
}
