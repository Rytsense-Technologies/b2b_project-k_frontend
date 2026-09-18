'use client';

import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriBtn } from '@/components/superadmin/quirri-ui';

/**
 * Shown when interview-prepare returns role_match.relevant === false
 * (or /start returns 409 resume_role_mismatch).
 */
export default function RoleMismatchDialog({
  open,
  onClose,
  onChangeRole,
  onContinueAnyway,
  roleMatch,
  busy = false,
}) {
  if (!open) return null;

  const selected = roleMatch?.selected_role || 'your selected role';
  const suggested = roleMatch?.suggested_role;
  const domain = roleMatch?.resume_domain;
  const fromResume = roleMatch?.suggested_role_source === 'resume';

  let body;
  if (suggested && fromResume) {
    body = `Your resume looks aligned with ${domain || suggested}, but you chose ${selected}. You can switch roles or continue with ${selected} only (without resume details).`;
  } else if (suggested) {
    body = `This looks like a ${suggested} resume, but you chose ${selected}. You can switch roles or continue with ${selected} only (without resume details).`;
  } else if (domain) {
    body = `Your resume appears closer to ${domain} than to ${selected}. Change the target role, or continue anyway without resume details.`;
  } else {
    body = `Your resume may not match ${selected}. Change the target role, or continue anyway without resume details.`;
  }

  return (
    <QuirriModal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Role may not match your resume"
      crumb="Check before you start"
      footer={(
        <>
          <QuirriBtn type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </QuirriBtn>
          <QuirriBtn type="button" variant="ghost" onClick={onChangeRole} disabled={busy}>
            {suggested ? `Use ${suggested}` : 'Change role'}
          </QuirriBtn>
          <QuirriBtn type="button" variant="primary" onClick={onContinueAnyway} disabled={busy}>
            {busy ? 'Starting…' : 'Continue anyway'}
          </QuirriBtn>
        </>
      )}
    >
      <p style={{ margin: 0, textAlign: 'left', lineHeight: 1.5 }}>{body}</p>
    </QuirriModal>
  );
}
