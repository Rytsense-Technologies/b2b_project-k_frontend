'use client';

import Link from 'next/link';
import { Icon, ModulePage, SectionState } from '@/components/shared/module-ui';
import { usePageHeader } from '@/components/shared/PageHeader';

/** College Admin 404 — keeps the sidebar and top bar, with a way back. */
export default function AdminNotFound() {
  usePageHeader({ title: 'Page not found', subtitle: 'This link may be old or mistyped.', crumbs: [{ label: 'Page not found' }] }, []);
  return (
    <ModulePage className="ad-page">
      <SectionState
        title="We couldn't find that page"
        action={(
          <Link className="sd-btn sd-btn--teal sd-btn--sm" href="/admin/dashboard">
            <Icon name="back" size={16} /> Back to dashboard
          </Link>
        )}
      >
        It may have moved, or the link is wrong. Use the menu on the left or go back to your dashboard.
      </SectionState>
    </ModulePage>
  );
}
