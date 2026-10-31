'use client';

import { Suspense } from 'react';
import {
  ModulePage,
  SectionState,
  TabNav,
  TabPanel,
} from '@/components/shared/module-ui';
import { useTabParam } from '@/hooks/useUrlState';
import { useFacultyScope } from '@/hooks/useFacultyScope';
import NotificationRules from '@/components/shared/NotificationRules';
import SystemNotificationInbox from '@/components/shared/SystemNotificationInbox';

const SECTIONS = ['messages', 'rules'];

/**
 * Messages Quirri sent this HOD / Faculty member (all 15 catalogue events),
 * plus the email switches: HOD = their department's rules, Faculty = their own preferences.
 */
function FacultyNotificationsView() {
  const { scope } = useFacultyScope();
  const isHod = Boolean(scope?.is_hod) || String(scope?.role || '').toLowerCase() === 'hod';
  const [section, setSection] = useTabParam(SECTIONS, 'messages');

  const sections = [
    { value: 'messages', label: 'Messages' },
    { value: 'rules', label: isHod ? 'Rules' : 'My notifications' },
  ];

  return (
    <ModulePage className="fa-page">
      <TabNav label="Notification sections" idBase="fa-notif" value={section} onChange={setSection} tabs={sections} />
      <TabPanel value="rules" current={section} idBase="fa-notif">
        <NotificationRules canTest={isHod} />
      </TabPanel>
      <TabPanel value="messages" current={section} idBase="fa-notif">
        <SystemNotificationInbox portal="faculty" showReviewFilter />
      </TabPanel>
    </ModulePage>
  );
}

export default function FacultyNotificationsPage() {
  return (
    <Suspense fallback={<SectionState title="Loading notifications…" />}>
      <FacultyNotificationsView />
    </Suspense>
  );
}
