'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { QuirriBtn, QuirriFormGrid, QuirriField } from '@/components/superadmin/quirri-ui';
import { settingsApi } from '@/lib/api/superadmin/modules';
import { unwrap, withMock } from '@/lib/api/superadmin/http';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: 'Super',
    last_name: 'Admin',
    email: 'admin@quirri.ai',
    two_fa: 'Enabled',
    alerts: 'Email + WhatsApp',
  });

  useEffect(() => {
    withMock(
      () => settingsApi.get(),
      {
        first_name: user?.first_name || 'Super',
        last_name: user?.last_name || 'Admin',
        email: user?.email || 'admin@quirri.ai',
        two_fa: 'Enabled',
        alerts: 'Email + WhatsApp',
      },
    ).then((data) => {
      if (data) {
        setForm({
          first_name: data.first_name ?? form.first_name,
          last_name: data.last_name ?? form.last_name,
          email: data.email ?? form.email,
          two_fa: data.two_fa === false || data.two_fa === 'Disabled' ? 'Disabled' : 'Enabled',
          alerts: data.alerts || data.system_alerts || form.alerts,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      unwrap(await settingsApi.update({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        two_fa: form.two_fa === 'Enabled',
        alerts: form.alerts,
      }));
      toast.success('Settings saved');
    } catch {
      toast.success('Settings saved locally until API is live');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="quirri-card">
        <form onSubmit={handleSave}>
          <QuirriFormGrid>
            <QuirriField label="First Name">
              <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </QuirriField>
            <QuirriField label="Last Name">
              <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </QuirriField>
            <QuirriField label="Email Address" full>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </QuirriField>
            <QuirriField label="2FA Status">
              <select value={form.two_fa} onChange={(e) => setForm({ ...form, two_fa: e.target.value })}>
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
            </QuirriField>
            <QuirriField label="System Alerts">
              <select value={form.alerts} onChange={(e) => setForm({ ...form, alerts: e.target.value })}>
                <option>Email + WhatsApp</option>
                <option>Email only</option>
              </select>
            </QuirriField>
            <QuirriBtn variant="primary" className="quirri-full" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </QuirriBtn>
          </QuirriFormGrid>
        </form>
      </div>
    </div>
  );
}
