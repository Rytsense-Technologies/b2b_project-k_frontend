'use client';

import '@/styles/student-settings.css';
import AccountSettings from '@/components/shared/AccountSettings';
import NotificationRules from '@/components/shared/NotificationRules';

/** Student settings: Profile, Security, Notifications (personal email preferences). */
const EXTRA_TABS = [
  { id: 'notifications', label: 'Notifications', render: () => <NotificationRules /> },
];

export default function StudentSettingsPage() {
  return <AccountSettings extraTabs={EXTRA_TABS} />;
}
