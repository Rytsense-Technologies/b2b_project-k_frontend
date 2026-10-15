'use client';

import { ModuleTabs } from '@/components/shared/module-ui';

const TABS = [
  { href: '/admin/structure/departments', label: 'Departments', icon: 'tree' },
  { href: '/admin/structure/programmes', label: 'Programmes & subjects', icon: 'layers' },
];

/** College Admin › Academic structure: route tabs between the department list
 *  and the programme › semester › subject › chapter workspace (recipe v2). */
export default function StructureTabs() {
  return <ModuleTabs tabs={TABS} label="Academic structure" />;
}
