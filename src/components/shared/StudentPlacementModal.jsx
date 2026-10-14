'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import StudentPlacementFields from '@/components/shared/StudentPlacementFields';
import { Icon } from '@/components/shared/module-ui';
import { usersApi } from '@/lib/api/superadmin/users';
import { apiErrorMessage, unwrap } from '@/lib/api/superadmin/http';

function displayName(user) {
  return user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Student';
}

/**
 * Set a student's programme + current semester (SOW §6.3). Used by Super Admin
 * (Users) and College Admin (Students); the server checks the programme belongs
 * to the student's college and department.
 */
export default function StudentPlacementModal({ user, onClose, onSaved }) {
  const [programId, setProgramId] = useState(user.program_id || '');
  const [semesterId, setSemesterId] = useState(user.semester_id || '');
  const [saving, setSaving] = useState(false);
  const change = useCallback(({ program_id: p, semester_id: s }) => {
    setProgramId(p || '');
    setSemesterId(s || '');
  }, []);
  const unchanged = programId === (user.program_id || '') && semesterId === (user.semester_id || '');

  const save = async () => {
    if (programId && !semesterId) {
      toast.error('Pick the current semester too.');
      return;
    }
    setSaving(true);
    try {
      const res = await usersApi.updateUser(user.id, { program_id: programId || null, semester_id: semesterId || null });
      toast.success(programId ? 'Programme and semester saved' : 'Programme cleared');
      await onSaved(unwrap(res));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the programme'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuirriModal
      open
      onClose={onClose}
      title="Programme and semester"
      crumb={`${displayName(user)} · ${user.department_name || user.department || ''}`}
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose}>Cancel</button>
          <div className="right">
            <button type="button" className="sd-btn sd-btn--amber" onClick={save} disabled={saving || unchanged}>
              <Icon name="tick" size={16} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      )}
    >
      <div className="un-form sa-form">
        <StudentPlacementFields
          idPrefix="placement"
          departmentId={user.department_id}
          programId={programId}
          semesterId={semesterId}
          onChange={change}
        />
      </div>
    </QuirriModal>
  );
}
