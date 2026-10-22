'use client';

import Link from 'next/link';
import { Icon, ModulePage } from '@/components/shared/module-ui';

/** HOD / Faculty 404 — keeps the sidebar and top bar (title comes from the layout), with a way back. */
export default function FacultyNotFound() {
  return (
    <ModulePage className="fa-page">
      <section className="fa-missing" aria-labelledby="fa-missing-t">
        <b id="fa-missing-t">We couldn&apos;t find that page</b>
        <p>It may have moved, or the link is wrong. Use the menu, or go back to your dashboard.</p>
        <Link href="/faculty/dashboard">
          <Icon name="back" size={16} /> Back to dashboard
        </Link>
      </section>
    </ModulePage>
  );
}
