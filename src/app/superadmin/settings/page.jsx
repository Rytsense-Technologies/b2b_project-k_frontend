'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { QuirriBtn, QuirriFormGrid, QuirriField } from '@/components/superadmin/quirri-ui';

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    toast.success('Settings saved (mock)');
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="quirri-card">
        <form onSubmit={handleSave}>
          <QuirriFormGrid>
            <QuirriField label="First Name">
              <input defaultValue="Super" />
            </QuirriField>
            <QuirriField label="Last Name">
              <input defaultValue="Admin" />
            </QuirriField>
            <QuirriField label="Email Address" full>
              <input defaultValue="admin@quirri.ai" />
            </QuirriField>
            <QuirriField label="2FA Status">
              <select defaultValue="enabled">
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
            </QuirriField>
            <QuirriField label="System Alerts">
              <select defaultValue="both">
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
