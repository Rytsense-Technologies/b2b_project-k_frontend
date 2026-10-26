'use client';

import AccountSettings from '@/components/shared/AccountSettings';
import SettingsNotificationsTab from '@/components/shared/SettingsNotificationsTab';

/** College Admin settings: Profile, Security, Notifications (link to the college's rules). Role comes from AccountSettings (useAccountScope). */
const renderNotifications = ({ role }) => <SettingsNotificationsTab role={role} />;

export default function AdminSettingsPage() {
  return (
    <div className="ad-page ad-settings">
      <AccountSettings notificationsTab={renderNotifications} />
    </div>
  );
}
