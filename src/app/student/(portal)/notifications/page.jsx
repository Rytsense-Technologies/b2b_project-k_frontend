'use client';

import { ModulePage } from '@/components/shared/module-ui';
import SystemNotificationInbox from '@/components/shared/SystemNotificationInbox';

export default function StudentNotificationsPage() {
  return (
    <ModulePage className="st-page">
      <SystemNotificationInbox
        portal="student"
        emptyTitle="No messages yet"
        emptyBody="You’ll get one when a chapter is published or an assessment opens."
      />
    </ModulePage>
  );
}
