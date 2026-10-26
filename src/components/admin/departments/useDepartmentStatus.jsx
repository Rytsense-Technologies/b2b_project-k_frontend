'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { ConfirmNote, countLabel } from '@/components/shared/module-ui';
import { departmentsApi } from '@/lib/api/superadmin/modules';
import { apiErrorMessage } from '@/lib/api/superadmin/http';
import { isActiveDept } from './departmentModel';

/**
 * Deactivate / reactivate with confirmation (destructive → modal) and the backend's
 * 409 "still has enrolled students" guard → explicit "Archive anyway" step.
 *
 *   const status = useDepartmentStatus({ onChanged: (dept, nowActive) => reload() });
 *   status.request(dept);   // opens the right confirmation
 *   {status.dialogs}
 */
export function useDepartmentStatus({ onChanged }) {
  const [confirmDept, setConfirmDept] = useState(null);
  const [forceDept, setForceDept] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const deactivate = async (dept, force) => {
    setBusyId(dept.id);
    try {
      await departmentsApi.deactivate(dept.id, { force });
      toast.success(force ? 'Department archived. Student records are kept.' : 'Department deactivated');
      setConfirmDept(null);
      setForceDept(null);
      onChanged?.(dept, false);
    } catch (err) {
      if (err?.response?.status === 409 && !force) {
        setConfirmDept(null);
        setForceDept(dept);
        return;
      }
      toast.error(apiErrorMessage(err, 'Could not deactivate the department'));
    } finally {
      setBusyId(null);
    }
  };

  const reactivate = async (dept) => {
    setBusyId(dept.id);
    try {
      await departmentsApi.reactivate(dept.id);
      toast.success('Department reactivated');
      setConfirmDept(null);
      onChanged?.(dept, true);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not reactivate the department'));
    } finally {
      setBusyId(null);
    }
  };

  const confirming = confirmDept ? isActiveDept(confirmDept) : false;
  const busy = Boolean(busyId);

  const dialogs = (
    <>
      <QuirriModal
        open={Boolean(confirmDept)}
        onClose={() => { if (!busy) setConfirmDept(null); }}
        title={confirming ? 'Deactivate department?' : 'Reactivate department?'}
        crumb={confirmDept ? [confirmDept.name, confirmDept.code].filter(Boolean).join(' · ') : null}
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setConfirmDept(null)} disabled={busy}>
              Cancel
            </button>
            <div className="right">
              <button
                type="button"
                className={`sd-btn ${confirming ? 'un-btn-danger' : 'sd-btn--teal'}`}
                disabled={busy}
                onClick={() => (confirming ? deactivate(confirmDept, false) : reactivate(confirmDept))}
              >
                {busy ? 'Updating…' : confirming ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </>
        )}
      >
        {confirmDept ? (
          <ConfirmNote
            danger={confirming}
            title={confirming ? 'This is a soft delete.' : 'The department becomes active again.'}
          >
            {confirming
              ? `${confirmDept.name} is hidden from active lists and pickers. Its records are kept and you can reactivate it at any time.`
              : `${confirmDept.name} appears in active lists again and can take new students and staff.`}
          </ConfirmNote>
        ) : null}
      </QuirriModal>

      <QuirriModal
        open={Boolean(forceDept)}
        onClose={() => { if (!busy) setForceDept(null); }}
        title="Archive with enrolled students?"
        crumb={forceDept?.name}
        footer={(
          <>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => setForceDept(null)} disabled={busy}>
              Keep it active
            </button>
            <div className="right">
              <button
                type="button"
                className="sd-btn un-btn-danger"
                disabled={busy}
                onClick={() => forceDept && deactivate(forceDept, true)}
              >
                {busy ? 'Archiving…' : 'Archive anyway'}
              </button>
            </div>
          </>
        )}
      >
        {forceDept ? (
          <ConfirmNote danger title="This department still has enrolled students.">
            {`${forceDept.name} has ${forceDept.student_count != null ? countLabel(forceDept.student_count) : 'enrolled'} student(s). Archiving keeps their records but hides the department from active lists. This action is audited.`}
          </ConfirmNote>
        ) : null}
      </QuirriModal>
    </>
  );

  return { request: setConfirmDept, busyId, dialogs };
}
