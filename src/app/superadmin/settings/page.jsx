'use client';

import AccountSettings from '@/components/shared/AccountSettings';
import SettingsNotificationsTab from '@/components/shared/SettingsNotificationsTab';

/** Super Admin settings: Profile, Security, Notifications (link to the platform rules). Role comes from AccountSettings (useAccountScope). */
const renderNotifications = ({ role }) => <SettingsNotificationsTab role={role} />;

export default function SuperAdminSettingsPage() {
  return <AccountSettings notificationsTab={renderNotifications} />;
}
