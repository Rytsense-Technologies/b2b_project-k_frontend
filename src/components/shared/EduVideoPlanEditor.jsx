'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriControlledField } from '@/components/superadmin/quirri-ui';
import { eduVideoApi, JOB_STATUS } from '@/lib/api/admin/eduVideo';
import { apiErrorMessage } from '@/lib/api/superadmin/http';

/** Visual.type → editable fields shown in the slide editor (matches review screenshots). */
function fieldsForVisualType(type) {
  switch (String(type || '').toLowerCase()) {
    case 'compare':
    case 'comparison':
    case 'vs':
      return [
        { path: 'narration', label: 'Narration', multiline: true, scope: 'scene' },
        { path: 'left_title', label: 'Left title', scope: 'visual' },
        { path: 'right_title', label: 'Right title', scope: 'visual' },
        { path: 'key_idea', label: 'Key idea', scope: 'visual' },
        { path: 'left_points', label: 'Left points', multiline: true, list: true, scope: 'visual' },
        { path: 'right_points', label: 'Right points', multiline: true, list: true, scope: 'visual' },
      ];
    case 'energy_flow':
    case 'flow':
      return [
        { path: 'narration', label: 'Narration', multiline: true, scope: 'scene' },
        { path: 'input_label', label: 'Input label', scope: 'visual' },
        { path: 'output_label', label: 'Output label', scope: 'visual' },
        { path: 'key_idea', label: 'Key idea', scope: 'visual' },
      ];
    case 'illustration':
      return [
        { path: 'topic', label: 'Topic', scope: 'scene' },
        { path: 'narration', label: 'Narration', multiline: true, scope: 'scene' },
        { path: 'title', label: 'Title', scope: 'visual' },
        { path: 'points', label: 'Points', multiline: true, list: true, scope: 'visual' },
      ];
    case 'title':
    default:
      return [
        { path: 'topic', label: 'Topic', scope: 'scene' },
        { path: 'narration', label: 'Narration', multiline: true, scope: 'scene' },
        { path: 'title', label: 'Title', scope: 'visual' },
        { path: 'subtitle', label: 'Subtitle', scope: 'visual' },
        { path: 'tags', label: 'Tags', multiline: true, list: true, scope: 'visual' },
      ];
  }
}

function listToText(value) {
  if (Array.isArray(value)) return value.map((v) => String(v ?? '')).join('\n');
  return value == null ? '' : String(value);
}

function textToList(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function canPersistPlan(job) {
  const status = job?.status;
  return (
    status === JOB_STATUS.AWAITING_REVIEW
    || status === JOB_STATUS.AWAITING_TEACHER_REVIEW
  );
}

function isNotFoundOrNotAllowed(err) {
  const status = err?.response?.status;
  return status === 404 || status === 405 || status === 501;
}

/**
 * @param {'admin' | 'reviewer'} mode
 * - admin: College Admin — Save & regenerate
 * - reviewer: HOD/Faculty — Save & send to admin (no regenerate)
 */
export default function EduVideoPlanEditor({
  open,
  job,
  onClose,
  onSaved,
  mode = 'admin',
}) {
  const isReviewer = mode === 'reviewer';
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [sceneIndex, setSceneIndex] = useState(0);

  const jobId = job?.job_id;
  const scenes = useMemo(
    () => (Array.isArray(plan?.scenes) ? plan.scenes : []),
    [plan],
  );
  const scene = scenes[sceneIndex] || null;
  const visualType = scene?.visual?.type || 'title';
  const fields = useMemo(() => fieldsForVisualType(visualType), [visualType]);
  const legacyEditable = canPersistPlan(job);

  const primaryLabel = isReviewer ? 'Save & send to admin' : 'Save & regenerate';
  const primaryBusy = isReviewer ? 'Sending…' : 'Regenerating…';

  useEffect(() => {
    if (!open || !jobId) return undefined;
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setPlan(null);
    setSceneIndex(0);

    const applyPlan = (data) => {
      if (cancelled) return;
      setPlan(data && typeof data === 'object' ? structuredClone(data) : null);
    };

    // Prefer HOD-edited plan from the Next bridge queue when present.
    if (job?.pending_bridge_plan && typeof job.pending_bridge_plan === 'object') {
      applyPlan(job.pending_bridge_plan);
      setLoading(false);
      return () => { cancelled = true; };
    }

    eduVideoApi.getPlan(jobId)
      .then(applyPlan)
      .catch((err) => {
        if (cancelled) return;
        setLoadError(apiErrorMessage(err, 'Could not load the lesson plan for this chapter.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, jobId, job?.pending_bridge_plan]);

  const readField = (field) => {
    if (!scene) return '';
    if (field.scope === 'scene') {
      const raw = scene[field.path];
      return field.list ? listToText(raw) : (raw ?? '');
    }
    const visual = scene.visual || {};
    const raw = visual[field.path];
    return field.list ? listToText(raw) : (raw ?? '');
  };

  const writeField = (field, nextValue) => {
    setPlan((prev) => {
      if (!prev?.scenes?.[sceneIndex]) return prev;
      const next = structuredClone(prev);
      const targetScene = next.scenes[sceneIndex];
      if (field.scope === 'scene') {
        targetScene[field.path] = field.list ? textToList(nextValue) : nextValue;
      } else {
        targetScene.visual = targetScene.visual || {};
        targetScene.visual[field.path] = field.list ? textToList(nextValue) : nextValue;
      }
      return next;
    });
  };

  const handlePrimary = async () => {
    if (!jobId || !plan) return;
    setSaving(true);
    try {
      if (isReviewer) {
        // FastAPI request-changes when present; otherwise Next.js bridge
        // (eduVideoApi.requestChanges falls back automatically). Do not
        // PUT /plan on DONE — backend rejects it and the toast looked like failure.
        await eduVideoApi.requestChanges(jobId, {
          plan,
          meta: {
            chapter_title: job?.chapter_title || plan?.title || '',
            source_filename: job?.source_filename || '',
            department_name: job?.department_name || '',
            department_id: job?.department_id || null,
            sent_to_hod_at: job?.sent_to_hod_at || null,
          },
        });
        toast.success('Edits sent to your College Admin. They can regenerate the video from these changes.');
      } else {
        // Prefer regenerate endpoint; fall back to legacy putPlan + submit (pre-render only).
        try {
          await eduVideoApi.regenerate(jobId, { plan });
        } catch (err) {
          if (!isNotFoundOrNotAllowed(err)) throw err;
          try {
            await eduVideoApi.putPlan(jobId, plan);
            await eduVideoApi.submit(jobId);
          } catch (legacyErr) {
            const detail = apiErrorMessage(legacyErr, '');
            const blockedOnDone = /awaiting review|current status:\s*done/i.test(detail);
            if (blockedOnDone || isNotFoundOrNotAllowed(legacyErr)) {
              toast.error(
                'Cannot regenerate finished videos yet — backend needs POST …/regenerate '
                + '(or allow PUT /plan + submit on DONE). See docs/BACKEND_EDU_VIDEO_REQUEST_CHANGES.md.',
              );
              return;
            }
            throw legacyErr;
          }
        }
        toast.success('Plan saved. Video regeneration has started.');
      }

      onSaved?.();
      onClose?.();
    } catch (err) {
      const detail = apiErrorMessage(
        err,
        isReviewer
          ? 'Could not save and send edits to your College Admin.'
          : 'Could not save or regenerate this chapter.',
      );
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuirriModal
      open={open}
      onClose={onClose}
      title={job?.chapter_title || plan?.title || 'Edit lesson plan'}
      crumb={job?.source_filename || (isReviewer ? 'HOD / Faculty review' : 'College Admin edit')}
      wide
      footer={(
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrimary}
            disabled={saving || loading || !plan || Boolean(loadError)}
          >
            {saving ? primaryBusy : primaryLabel}
          </button>
        </>
      )}
    >
      {loading ? <div className="card-p">Loading lesson plan…</div> : null}

      {loadError ? (
        <div className="notice err">
          <div>
            <b>Could not open the plan</b>
            {loadError}
          </div>
        </div>
      ) : null}

      {!loading && !loadError && plan ? (
        <>
          <div className="notice info" style={{ marginBottom: 16 }}>
            <div>
                  {isReviewer ? (
                <>
                  <b>Edit slides, then send to College Admin</b>
                  Change the fields you need, then use <b>Save &amp; send to admin</b>.
                  Only the College Admin regenerates the video — you do not re-render here.
                  Your edits are queued for College Admin even when the video status is already Done.
                </>
              ) : (
                <>
                  <b>Edit slides, then regenerate</b>
                  Apply HOD/Faculty feedback (or your own fixes), then <b>Save &amp; regenerate</b>.
                  {!legacyEditable ? (
                    <>
                      {' '}
                      Finished videos need <code>POST …/regenerate</code> on the backend first —
                      see <code>docs/BACKEND_EDU_VIDEO_REQUEST_CHANGES.md</code>.
                    </>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="edu-plan-editor">
            <div className="edu-plan-scenes">
              <div className="edu-plan-scenes-h">
                Slides
                <span className="sub">{scenes.length} total</span>
              </div>
              {scenes.map((s, idx) => {
                const active = idx === sceneIndex;
                const typeLabel = s?.visual?.type || 'slide';
                return (
                  <button
                    key={s.scene_id ?? idx}
                    type="button"
                    className={`edu-plan-scene${active ? ' is-active' : ''}`}
                    onClick={() => setSceneIndex(idx)}
                  >
                    <span className="edu-plan-scene-ix">{idx + 1}/{scenes.length}</span>
                    <span className="edu-plan-scene-t">{s.topic || s.visual?.title || `Slide ${idx + 1}`}</span>
                    <span className="edu-plan-scene-type">{typeLabel}</span>
                  </button>
                );
              })}
            </div>

            <div className="edu-plan-detail">
              {scene ? (
                <>
                  <div className="edu-plan-detail-h">
                    <span>{scene.topic || scene.visual?.title || `Slide ${sceneIndex + 1}`}</span>
                    <span className="sub">{sceneIndex + 1} / {scenes.length}</span>
                  </div>

                  <div className="edu-plan-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={eduVideoApi.getSceneImageUrl(jobId, sceneIndex)}
                      alt={`Slide ${sceneIndex + 1} preview`}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>

                  {fields.map((field) => (
                    <QuirriControlledField
                      key={`${sceneIndex}-${field.scope}-${field.path}`}
                      label={field.label}
                      fieldType="lessonText"
                      name={`scene-${sceneIndex}-${field.path}`}
                      value={readField(field)}
                      onChange={(v) => writeField(field, v)}
                      multiline={Boolean(field.multiline || field.list)}
                      rows={field.list ? 4 : (field.multiline ? 5 : 1)}
                      full
                      disabled={saving}
                    />
                  ))}
                </>
              ) : (
                <div className="notice info">
                  <div>
                    <b>No scenes in this plan</b>
                    Generation may still be writing the script, or the plan is empty.
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </QuirriModal>
  );
}
