'use client';

import AccountSettings from '@/components/shared/AccountSettings';
import SettingsNotificationsTab from '@/components/shared/SettingsNotificationsTab';

/** HOD / Faculty settings: Profile, Security, Notifications (HOD: link to the department's rules; Faculty: own email switches). Role comes from AccountSettings (useAccountScope). */
const renderNotifications = ({ role }) => <SettingsNotificationsTab role={role} />;

export default function FacultySettingsPage() {
  return <AccountSettings notificationsTab={renderNotifications} />;
}
