'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import QuirriModal from '@/components/superadmin/QuirriModal';
import { QuirriControlledField } from '@/components/superadmin/quirri-ui';
import { eduVideoApi, JOB_STATUS } from '@/lib/api/admin/eduVideo';
import { apiErrorMessage } from '@/lib/api/superadmin/http';

/**
 * visual.type → editable visual fields.
 * Source of truth: app/edu_video/schemas.py → Visual docstring.
 * Binding fix: docs/VIDEO_EDITING_INPUT_BINDING_FIX.md (and Downloads handoff).
 *
 * Scene-level topic + narration always shown via SCENE_META_FIELDS.
 * key_idea appended for KEY_IDEA_TYPES only.
 *
 * Nested object lists (cards / branches / table_rows) are editable here as a
 * follow-up to §7 of the binding handoff — not force-fit into plain text lists.
 */
const KEY_IDEA_TYPES = new Set([
  'concept',
  'comparison',
  'process_flow',
  'energy_flow',
  'direction_arrows',
  'waveform',
  'concept_map',
  'quiz',
]);

/** @type {Record<string, Array<{ path: string, label: string, kind?: string }>>} */
const VISUAL_FIELDS_BY_TYPE = {
  title: [
    { path: 'icon', label: 'Icon', kind: 'text' },
    { path: 'title', label: 'Title', kind: 'text' },
    { path: 'subtitle', label: 'Subtitle', kind: 'text' },
    { path: 'tags', label: 'Tags', kind: 'list' },
  ],
  energy_flow: [
    { path: 'input_label', label: 'Input label', kind: 'text' },
    { path: 'output_label', label: 'Output label', kind: 'text' },
  ],
  direction_arrows: [
    { path: 'label', label: 'Label', kind: 'text' },
    { path: 'directions', label: 'Directions', kind: 'list' },
  ],
  waveform: [
    { path: 'label', label: 'Label', kind: 'text' },
    { path: 'flat', label: 'Flat line (DC-style)', kind: 'bool' },
  ],
  comparison: [
    { path: 'left_title', label: 'Left title', kind: 'text' },
    { path: 'left_points', label: 'Left points', kind: 'list' },
    { path: 'right_title', label: 'Right title', kind: 'text' },
    { path: 'right_points', label: 'Right points', kind: 'list' },
  ],
  concept_map: [
    { path: 'root', label: 'Root', kind: 'text' },
    { path: 'branches', label: 'Branches', kind: 'branches' },
  ],
  process_flow: [
    { path: 'steps', label: 'Steps', kind: 'list' },
  ],
  quiz: [
    { path: 'question', label: 'Question', kind: 'multiline' },
    { path: 'options', label: 'Options', kind: 'list' },
    { path: 'correct_index', label: 'Correct option index (0-based)', kind: 'numeric' },
  ],
  recap: [
    { path: 'points', label: 'Points', kind: 'list' },
  ],
  summary: [
    { path: 'points', label: 'Points', kind: 'list' },
  ],
  code: [
    { path: 'code', label: 'Code', kind: 'multiline' },
    { path: 'language', label: 'Language', kind: 'text' },
  ],
  card: [
    { path: 'label', label: 'Label', kind: 'text' },
    { path: 'value', label: 'Value', kind: 'text' },
  ],
  concept: [
    { path: 'title', label: 'Title', kind: 'text' },
    { path: 'label', label: 'Label', kind: 'text' },
    { path: 'value', label: 'Value', kind: 'text' },
    { path: 'caption', label: 'Caption', kind: 'text' },
  ],
  cards: [
    { path: 'title', label: 'Title', kind: 'text' },
    { path: 'cards', label: 'Cards', kind: 'cards' },
  ],
  diagram_cards: [
    { path: 'root', label: 'Root', kind: 'text' },
    { path: 'cards', label: 'Cards', kind: 'cards' },
    { path: 'caption', label: 'Caption', kind: 'text' },
  ],
  waveform_cards: [
    { path: 'label', label: 'Label', kind: 'text' },
    { path: 'flat', label: 'Flat line (DC-style)', kind: 'bool' },
    { path: 'points', label: 'Points', kind: 'list' },
    { path: 'cards', label: 'Cards', kind: 'cards' },
    { path: 'caption', label: 'Caption', kind: 'text' },
  ],
  chart: [
    { path: 'title', label: 'Title', kind: 'text' },
    { path: 'chart_labels', label: 'Chart labels', kind: 'list' },
    { path: 'chart_values', label: 'Chart values', kind: 'numericList' },
    { path: 'caption', label: 'Caption', kind: 'text' },
  ],
  source_image: [
    { path: 'image_path', label: 'Image path', kind: 'readOnly' },
    { path: 'title', label: 'Title', kind: 'readOnly' },
    { path: 'caption', label: 'Caption', kind: 'readOnly' },
  ],
  concept_code: [
    { path: 'title', label: 'Title', kind: 'text' },
    { path: 'explanation', label: 'Explanation', kind: 'multiline' },
    { path: 'points', label: 'Points', kind: 'list' },
    { path: 'code', label: 'Code', kind: 'multiline' },
    { path: 'language', label: 'Language', kind: 'text' },
  ],
  // image_prompt / image_path are pipeline-owned — not exposed (binding handoff §6).
  illustration: [
    { path: 'title', label: 'Title', kind: 'text' },
    { path: 'points', label: 'Points', kind: 'list' },
  ],
  table: [
    { path: 'title', label: 'Title', kind: 'text' },
    { path: 'table_rows', label: 'Table rows', kind: 'table_rows' },
  ],
  execution_trace: [
    { path: 'title', label: 'Title', kind: 'text' },
    { path: 'trace_steps', label: 'Trace steps', kind: 'list' },
  ],
  diagram_3d: [
    { path: 'title', label: 'Title', kind: 'text' },
    { path: 'shape3d', label: 'Shape (cube, coil, sphere, vector_pair)', kind: 'text' },
    { path: 'caption', label: 'Caption', kind: 'text' },
  ],
};

const SCENE_META_FIELDS = [
  { path: 'topic', label: 'Topic', kind: 'text', scope: 'scene' },
  { path: 'narration', label: 'Narration', kind: 'multiline', scope: 'scene' },
];

function fieldsForVisualType(type) {
  // Backend VisualType literal only — no compare/vs/flow aliases (handoff §5.2).
  const normalized = String(type || '').toLowerCase().trim() || 'title';
  const visualFields = (VISUAL_FIELDS_BY_TYPE[normalized] || VISUAL_FIELDS_BY_TYPE.title)
    .map((f) => ({ ...f, scope: 'visual', kind: f.kind || 'text' }));

  const out = [...SCENE_META_FIELDS, ...visualFields];

  if (KEY_IDEA_TYPES.has(normalized)) {
    out.push({ path: 'key_idea', label: 'Key idea', kind: 'text', scope: 'visual' });
  }
  return out;
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

function numberListToText(value) {
  if (Array.isArray(value)) return value.map((v) => String(v ?? '')).join('\n');
  return value == null ? '' : String(value);
}

function textToNumberList(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const n = Number(line);
      return Number.isFinite(n) ? n : line;
    });
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

function ensureVisual(scene) {
  if (!scene.visual || typeof scene.visual !== 'object') {
    scene.visual = {};
  }
  return scene.visual;
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
  const visualType = String(scene?.visual?.type || '').toLowerCase().trim() || 'title';
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
      // Deep clone once — later writes only overwrite fields that have inputs.
      setPlan(data && typeof data === 'object' ? structuredClone(data) : null);
    };

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

  const updateScene = (mutator) => {
    setPlan((prev) => {
      if (!prev?.scenes?.[sceneIndex]) return prev;
      const next = structuredClone(prev);
      mutator(next.scenes[sceneIndex]);
      return next;
    });
  };

  const readSimple = (field) => {
    if (!scene) return '';
    const raw = field.scope === 'scene'
      ? scene[field.path]
      : (scene.visual || {})[field.path];

    if (field.kind === 'list') return listToText(raw);
    if (field.kind === 'numericList') return numberListToText(raw);
    if (field.kind === 'bool') {
      if (raw === true) return 'true';
      if (raw === false) return 'false';
      return '';
    }
    if (field.kind === 'numeric') {
      return raw == null || raw === '' ? '' : String(raw);
    }
    return raw == null ? '' : String(raw);
  };

  const writeSimple = (field, nextValue) => {
    updateScene((targetScene) => {
      let parsed = nextValue;
      if (field.kind === 'list') parsed = textToList(nextValue);
      else if (field.kind === 'numericList') parsed = textToNumberList(nextValue);
      else if (field.kind === 'bool') {
        const v = String(nextValue || '').trim().toLowerCase();
        if (v === 'true' || v === 'yes' || v === '1') parsed = true;
        else if (v === 'false' || v === 'no' || v === '0') parsed = false;
        else parsed = null;
      } else if (field.kind === 'numeric') {
        const n = Number(String(nextValue).trim());
        parsed = Number.isFinite(n) ? n : null;
      }

      if (field.scope === 'scene') {
        targetScene[field.path] = parsed;
      } else {
        ensureVisual(targetScene)[field.path] = parsed;
      }
    });
  };

  const writeCardField = (cardIndex, key, value) => {
    updateScene((targetScene) => {
      const visual = ensureVisual(targetScene);
      const cards = Array.isArray(visual.cards) ? [...visual.cards] : [];
      const card = { ...(cards[cardIndex] || { title: '', points: [] }) };
      if (key === 'points') card.points = textToList(value);
      else card[key] = value;
      cards[cardIndex] = card;
      visual.cards = cards;
    });
  };

  const writeTableRowField = (rowIndex, key, value) => {
    updateScene((targetScene) => {
      const visual = ensureVisual(targetScene);
      const rows = Array.isArray(visual.table_rows) ? [...visual.table_rows] : [];
      const row = { ...(rows[rowIndex] || { label: '', value: '' }) };
      row[key] = value;
      rows[rowIndex] = row;
      visual.table_rows = rows;
    });
  };

  const writeBranchField = (branchIndex, key, value) => {
    updateScene((targetScene) => {
      const visual = ensureVisual(targetScene);
      const branches = Array.isArray(visual.branches) ? [...visual.branches] : [];
      const branch = { ...(branches[branchIndex] || { label: '', children: [] }) };
      if (key === 'children') branch.children = textToList(value);
      else branch[key] = value;
      branches[branchIndex] = branch;
      visual.branches = branches;
    });
  };

  const handlePrimary = async () => {
    if (!jobId || !plan) return;
    setSaving(true);
    try {
      if (isReviewer) {
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

  const renderField = (field) => {
    const key = `${sceneIndex}-${field.scope}-${field.path}`;

    if (field.kind === 'cards') {
      const cards = Array.isArray(scene?.visual?.cards) ? scene.visual.cards : [];
      if (!cards.length) {
        return (
          <div key={key} className="notice info" style={{ marginBottom: 12 }}>
            <div>
              <b>No cards on this slide</b>
              This {visualType} scene has an empty cards list in the plan.
            </div>
          </div>
        );
      }
      return (
        <div key={key} className="edu-plan-groups">
          <div className="edu-plan-groups-h">{field.label}</div>
          {cards.map((card, i) => (
            <div key={`${key}-card-${i}`} className="edu-plan-group">
              <div className="edu-plan-group-h">Card {i + 1}</div>
              <QuirriControlledField
                label="Icon"
                fieldType="lessonText"
                name={`${key}-card-${i}-icon`}
                value={card?.icon ?? ''}
                onChange={(v) => writeCardField(i, 'icon', v)}
                full
                disabled={saving}
              />
              <QuirriControlledField
                label="Title"
                fieldType="lessonText"
                name={`${key}-card-${i}-title`}
                value={card?.title ?? ''}
                onChange={(v) => writeCardField(i, 'title', v)}
                full
                disabled={saving}
              />
              <QuirriControlledField
                label="Points"
                fieldType="lessonText"
                name={`${key}-card-${i}-points`}
                value={listToText(card?.points)}
                onChange={(v) => writeCardField(i, 'points', v)}
                multiline
                rows={3}
                full
                disabled={saving}
              />
              {card?.code != null && card.code !== '' ? (
                <QuirriControlledField
                  label="Code chip"
                  fieldType="lessonText"
                  name={`${key}-card-${i}-code`}
                  value={card.code ?? ''}
                  onChange={(v) => writeCardField(i, 'code', v)}
                  multiline
                  rows={2}
                  full
                  disabled={saving}
                />
              ) : null}
            </div>
          ))}
        </div>
      );
    }

    if (field.kind === 'table_rows') {
      const rows = Array.isArray(scene?.visual?.table_rows) ? scene.visual.table_rows : [];
      if (!rows.length) {
        return (
          <div key={key} className="notice info" style={{ marginBottom: 12 }}>
            <div>
              <b>No table rows on this slide</b>
              This table scene has an empty table_rows list in the plan.
            </div>
          </div>
        );
      }
      return (
        <div key={key} className="edu-plan-groups">
          <div className="edu-plan-groups-h">{field.label}</div>
          {rows.map((row, i) => (
            <div key={`${key}-row-${i}`} className="edu-plan-group">
              <div className="edu-plan-group-h">Row {i + 1}</div>
              <QuirriControlledField
                label="Label"
                fieldType="lessonText"
                name={`${key}-row-${i}-label`}
                value={row?.label ?? ''}
                onChange={(v) => writeTableRowField(i, 'label', v)}
                full
                disabled={saving}
              />
              <QuirriControlledField
                label="Value"
                fieldType="lessonText"
                name={`${key}-row-${i}-value`}
                value={row?.value ?? ''}
                onChange={(v) => writeTableRowField(i, 'value', v)}
                full
                disabled={saving}
              />
            </div>
          ))}
        </div>
      );
    }

    if (field.kind === 'branches') {
      const branches = Array.isArray(scene?.visual?.branches) ? scene.visual.branches : [];
      if (!branches.length) {
        return (
          <div key={key} className="notice info" style={{ marginBottom: 12 }}>
            <div>
              <b>No branches on this slide</b>
              This concept map has an empty branches list in the plan.
            </div>
          </div>
        );
      }
      return (
        <div key={key} className="edu-plan-groups">
          <div className="edu-plan-groups-h">{field.label}</div>
          {branches.map((branch, i) => (
            <div key={`${key}-branch-${i}`} className="edu-plan-group">
              <div className="edu-plan-group-h">Branch {i + 1}</div>
              <QuirriControlledField
                label="Label"
                fieldType="lessonText"
                name={`${key}-branch-${i}-label`}
                value={branch?.label ?? ''}
                onChange={(v) => writeBranchField(i, 'label', v)}
                full
                disabled={saving}
              />
              <QuirriControlledField
                label="Children"
                fieldType="lessonText"
                name={`${key}-branch-${i}-children`}
                value={listToText(branch?.children)}
                onChange={(v) => writeBranchField(i, 'children', v)}
                multiline
                rows={3}
                full
                disabled={saving}
              />
            </div>
          ))}
        </div>
      );
    }

    const multiline = field.kind === 'multiline'
      || field.kind === 'list'
      || field.kind === 'numericList';
    const rows = field.kind === 'list' || field.kind === 'numericList'
      ? 4
      : (field.kind === 'multiline' ? 5 : 1);

    return (
      <QuirriControlledField
        key={key}
        label={field.label}
        fieldType="lessonText"
        name={`scene-${sceneIndex}-${field.path}`}
        value={readSimple(field)}
        onChange={(v) => writeSimple(field, v)}
        multiline={multiline}
        rows={rows}
        full
        disabled={saving || field.kind === 'readOnly'}
        hint={
          field.kind === 'list' || field.kind === 'numericList'
            ? 'One item per line'
            : field.kind === 'bool'
              ? 'Use true or false'
              : field.kind === 'readOnly'
                ? 'Set by the backend — not editable here'
                : undefined
        }
      />
    );
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
                  Only fields for this slide’s visual type are shown — unused slots stay out of the form.
                  Your edits are queued for College Admin even when the video status is already Done.
                </>
              ) : (
                <>
                  <b>Edit slides, then regenerate</b>
                  Apply HOD/Faculty feedback (or your own fixes), then <b>Save &amp; regenerate</b>.
                  Only fields for this slide’s visual type are shown.
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
                const typeLabel = String(s?.visual?.type || 'slide').toLowerCase();
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
                    <span className="sub">
                      {visualType}
                      {' · '}
                      {sceneIndex + 1} / {scenes.length}
                    </span>
                  </div>

                  <div className="edu-plan-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={eduVideoApi.getSceneImageUrl(jobId, sceneIndex)}
                      alt={`Slide ${sceneIndex + 1} preview`}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>

                  {fields.map((field) => renderField(field))}
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
