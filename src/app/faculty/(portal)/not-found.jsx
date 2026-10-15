'use client';

import Link from 'next/link';
import { Icon, ModulePage, SectionState } from '@/components/shared/module-ui';

/** HOD / Faculty 404 — keeps the sidebar and top bar (title comes from the layout), with a way back. */
export default function FacultyNotFound() {
  return (
    <ModulePage className="fa-page">
      <SectionState
        title="We couldn't find that page"
        action={(
          <Link className="sd-btn sd-btn--teal sd-btn--sm" href="/faculty/dashboard">
            <Icon name="back" size={16} /> Back to dashboard
          </Link>
        )}
      >
        It may have moved, or the link is wrong. Use the menu on the left or go back to your dashboard.
      </SectionState>
    </ModulePage>
  );
}
