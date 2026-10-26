'use client';

import '@/styles/student-settings.css';
import AccountSettings from '@/components/shared/AccountSettings';
import SettingsNotificationsTab from '@/components/shared/SettingsNotificationsTab';

/** Student settings: Profile, Security, Notifications (personal email preferences). Role comes from AccountSettings (useAccountScope). */
const renderNotifications = ({ role }) => <SettingsNotificationsTab role={role} />;

export default function StudentSettingsPage() {
  return <AccountSettings notificationsTab={renderNotifications} />;
}
