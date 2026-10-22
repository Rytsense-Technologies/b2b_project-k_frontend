'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { Icon, SectionState } from '@/components/shared/module-ui';
import { eduVideoApi } from '@/lib/api/admin/eduVideo';
import { apiErrorMessage } from '@/lib/api/superadmin/http';

const ICON = {
  uploaded: 'upload',
  sent_for_review: 'send',
  changes_requested: 'edit',
  regenerated: 'refresh',
  changes_dismissed: 'x',
  published: 'tick',
  comment: 'chat',
};
const ROLE = { college_admin: 'College Admin', hod: 'HOD', faculty: 'Faculty', superadmin: 'Super Admin' };

function when(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).replace('Sept', 'Sep');
}

/**
 * Review trail of one chapter video (upload → review → changes → publish),
 * with a comment box for the College Admin / HOD / Faculty on it.
 */
export default function ReviewHistoryModal({ job, canComment = true, onClose }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const jobId = job?.job_id;

  useEffect(() => {
    if (!jobId) return undefined;
    let alive = true;
    setItems(null);
    setError(null);
    eduVideoApi.history(jobId)
      .then((d) => { if (alive) setItems(d?.items || []); })
      .catch((e) => { if (alive) setError(e); });
    return () => { alive = false; };
  }, [jobId]);

  const send = async () => {
    const text = note.trim();
    if (!text) return;
    setSending(true);
    try {
      const d = await eduVideoApi.addComment(jobId, text);
      setItems(d?.items || []);
      setNote('');
      toast.success('Comment added');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not add the comment'));
    } finally {
      setSending(false);
    }
  };

  return (
    <QuirriModal
      open={Boolean(jobId)}
      onClose={onClose}
      title="Review history"
      crumb={job?.chapter_title || job?.source_filename || 'Chapter'}
      footer={(
        <>
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose}>Close</button>
          {canComment ? (
            <div className="right">
              <button type="button" className="sd-btn sd-btn--amber" onClick={send} disabled={sending || !note.trim()}>
                <Icon name="send" size={16} /> {sending ? 'Adding…' : 'Add comment'}
              </button>
            </div>
          ) : null}
        </>
      )}
    >
      <div className="un-form rv-history">
        {error ? <SectionState tone="err" title="Could not load the history">{apiErrorMessage(error, 'Try again.')}</SectionState> : null}
        {!items && !error ? <SectionState title="Loading…" /> : null}
        {items && !items.length ? <SectionState title="No history yet" /> : null}
        {items?.length ? (
          <ol className="rv-list">
            {items.map((it, i) => (
              <li key={`${it.action}-${it.at}-${i}`} className={`rv-item is-${it.action}`}>
                <span className="rv-ic" aria-hidden="true"><Icon name={ICON[it.action] || 'info'} size={16} /></span>
                <div>
                  <b>{it.label}</b>
                  <small>{[it.actor ? `${it.actor}${it.actor_role ? ` · ${ROLE[it.actor_role] || it.actor_role}` : ''}` : null, when(it.at)].filter(Boolean).join(' · ')}</small>
                  {it.note ? <p>{it.note}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : null}
        {canComment ? (
          <label className="fa-review-note" htmlFor="history-comment">
            <span>Add a comment</span>
            <textarea
              id="history-comment"
              className="sd-input"
              rows={2}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Visible to the College Admin, HOD and the subject's faculty."
            />
          </label>
        ) : null}
      </div>
    </QuirriModal>
  );
}
