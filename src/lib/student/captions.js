/**
 * Lecture captions (GET /edu_video/captions/{job_id}, WebVTT). A 404 means the video has no
 * captions yet, so the player hides its captions toggle instead of offering an empty track.
 */
export async function probeCaptions(url, fetchImpl = globalThis.fetch) {
  if (!url || typeof fetchImpl !== 'function') return false;
  try {
    const res = await fetchImpl(url, { method: 'GET', credentials: 'include', cache: 'no-store' });
    if (!res?.ok) return false;
    const type = String(res.headers?.get?.('content-type') || '').toLowerCase();
    return type.includes('text/vtt');
  } catch {
    return false;
  }
}

/** Show or hide the video's captions track (the native menu stays in sync). */
export function applyCaptionsMode(video, on) {
  const tracks = video?.textTracks;
  if (!tracks) return;
  for (let i = 0; i < tracks.length; i += 1) {
    const t = tracks[i];
    if (t && (t.kind === 'captions' || t.kind === 'subtitles')) t.mode = on ? 'showing' : 'hidden';
  }
}
