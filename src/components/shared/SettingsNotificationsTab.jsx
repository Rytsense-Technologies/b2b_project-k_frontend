'use client';

import Link from 'next/link';
import NotificationRules from '@/components/shared/NotificationRules';
import { Icon } from '@/components/shared/module-ui';

/** Roles that manage rules for a wider scope on their portal's Notifications page (Rules tab). */
const MANAGED = {
  superadmin: {
    line: 'Email notifications for the platform are managed on the Notifications page.',
    href: '/superadmin/notifications?tab=rules',
  },
  college_admin: {
    line: 'Email notifications for your college are managed on the Notifications page.',
    href: '/admin/notifications?tab=rules',
  },
  hod: {
    line: 'Email notifications for your department are managed on the Notifications page.',
    href: '/faculty/notifications?tab=rules',
  },
};

/**
 * Settings → Notifications (settings-plan.md § Notifications tab).
 * Faculty / Student: their own email switches. Super Admin / College Admin / HOD: a link to the
 * Rules tab of their Notifications page. `role` = superadmin | college_admin | hod | faculty | student,
 * or null while the HOD / Faculty check is still loading.
 */
export default function SettingsNotificationsTab({ role }) {
  // Same full-width column and card chrome as Profile / Security (as-card, not Panel).
  if (!role) {
    return (
      <div className="as-stack">
        <section className="sp-panel as-card" aria-labelledby="as-notif-h">
          <div className="as-card-h">
            <h2 id="as-notif-h">Email notifications</h2>
            <p>Loading…</p>
          </div>
        </section>
      </div>
    );
  }

  const managed = MANAGED[role];
  if (!managed) {
    return (
      <div className="as-stack">
        <NotificationRules scope="personal" />
      </div>
    );
  }

  return (
    <div className="as-stack">
      <section className="sp-panel as-card" aria-labelledby="as-notif-h">
        <div className="as-card-h">
          <h2 id="as-notif-h">Email notifications</h2>
          <p>{managed.line}</p>
        </div>
        <div className="as-actions as-actions--start">
          <Link className="sd-btn sd-btn--amber" href={managed.href}>
            Open notification rules <Icon name="arrow" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
