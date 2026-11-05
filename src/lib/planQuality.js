const names = (list) => list.join(', ');

function slideNumbers(sceneIds, scenes) {
  const numbers = sceneIds.map((id) => {
    const at = scenes.findIndex((s) => s?.scene_id === id);
    return at >= 0 ? at + 1 : id;
  });
  return `${numbers.length === 1 ? 'slide' : 'slides'} ${numbers.join(', ')}`;
}

/**
 * Plain sentences for what degraded in a lesson plan (`quality` and `truncated` on the plan,
 * schemas.PlanQuality on the backend). Empty when every step ran, or for a plan older than these fields.
 */
export function planQualityNotes(plan) {
  if (!plan || typeof plan !== 'object') return [];
  const q = plan.quality || {};
  const has = (key) => Array.isArray(q[key]) && q[key].length > 0;
  const scenes = Array.isArray(plan.scenes) ? plan.scenes : [];
  const notes = [];
  if (has('dropped_chapters')) notes.push(`Left out of the video: ${names(q.dropped_chapters)}.`);
  if (has('unplanned_chapters')) notes.push(`Shown as sentences from the document, because the AI could not plan them: ${names(q.unplanned_chapters)}.`);
  if (has('unverified_chapters')) notes.push(`Not fact-checked against the document: ${names(q.unverified_chapters)}.`);
  if (has('coverage_unchecked_chapters')) notes.push(`Coverage could not be measured, because the language differs from the document: ${names(q.coverage_unchecked_chapters)}.`);
  if (has('unsupported_slide_text')) notes.push(`Slide text the document does not support: ${names(q.unsupported_slide_text)}.`);
  if (has('missing_illustrations')) notes.push(`Placeholder instead of an illustration on ${slideNumbers(q.missing_illustrations, scenes)}`);
  if (has('undrawable_slides')) notes.push(`Text the slide font cannot show (it appears as ?) on ${slideNumbers(q.undrawable_slides, scenes)}`);
  if (plan.truncated) notes.push('The document was too long, so the video stops at the length limit.');
  return notes;
}
