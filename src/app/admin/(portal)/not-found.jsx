'use client';

import Link from 'next/link';
import { Icon, ModulePage } from '@/components/shared/module-ui';
import { usePageHeader } from '@/components/shared/PageHeader';

/** College Admin 404 — keeps the sidebar and top bar, with a way back. */
export default function AdminNotFound() {
  usePageHeader({ title: 'Page not found', subtitle: 'This link may be old or mistyped.', crumbs: [{ label: 'Page not found' }] }, []);
  return (
    <ModulePage className="ad-page">
      {/* b2c skill "Missing detail": centred muted sentence + one teal text link, inside a white card. */}
      <section className="ad-missing" aria-labelledby="ad-missing-t">
        <h2 id="ad-missing-t">We couldn&apos;t find that page</h2>
        <p>It may have moved, or the link is wrong. Use the menu or go back to your dashboard.</p>
        <Link className="text-link ad-missing-link" href="/admin/dashboard">
          <Icon name="back" size={16} /> Back to dashboard
        </Link>
      </section>
    </ModulePage>
  );
}
