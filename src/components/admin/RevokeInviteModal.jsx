'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { ConfirmNote } from '@/components/shared/module-ui';
import { usersApi } from '@/lib/api/superadmin/users';
import { apiErrorMessage } from '@/lib/api/superadmin/http';

/**
 * Cancel an invite that was never accepted (POST /users/{id}/revoke-invite).
 * Only for pending accounts - the server refuses anyone who has activated.
 */
export default function RevokeInviteModal({ user, name, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await usersApi.revokeInvite(user.id);
      toast.success(`Invite for ${user.email} cancelled`);
      await onDone();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not cancel the invite'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <QuirriModal
      open={Boolean(user)}
      onClose={() => !busy && onClose()}
      title="Cancel this invite?"
      crumb={user ? `${name} · ${user.email || ''}` : null}
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose} disabled={busy}>Keep invite</button>
          <div className="right">
            <button type="button" className="sd-btn un-btn-danger" onClick={confirm} disabled={busy}>
              {busy ? 'Cancelling…' : 'Cancel invite'}
            </button>
          </div>
        </>
      )}
    >
      <ConfirmNote danger title="Their activation link stops working.">
        This person never signed in, so nothing else is lost. You can add the same email again later.
      </ConfirmNote>
    </QuirriModal>
  );
}
