'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin/structure/departments', label: 'Departments' },
  { href: '/admin/structure/programmes', label: 'Programmes & subjects' },
];

/** College Admin › Academic structure: switch between the department list
 *  and the programme › semester › subject › chapter workspace. */
export default function StructureTabs() {
  const pathname = usePathname() || '';
  return (
    <nav className="tabs ad-subnav" aria-label="Academic structure">
      {TABS.map((t) => {
        const on = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link key={t.href} href={t.href} className={`tab${on ? ' active' : ''}`} aria-current={on ? 'page' : undefined}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
