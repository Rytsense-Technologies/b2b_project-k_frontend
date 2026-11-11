import { apiErrorMessage } from '@/lib/api/superadmin/http';

const PUBLISHED = 'Published. Students can now watch this chapter.';
const OPEN_CHANGE_REQUEST = 'This chapter has an open change request. Regenerate the video with the changes, or dismiss the request, before publishing.';

/** Toast after POST /edu_video/jobs/{id}/publish; names the earlier video(s) it took offline. */
export function publishedMessage(res) {
  const n = Array.isArray(res?.unpublished_job_ids) ? res.unpublished_job_ids.length : 0;
  if (!n) return PUBLISHED;
  if (n === 1) return `${PUBLISHED} The previous video for this chapter is now offline.`;
  return `${PUBLISHED} ${n} earlier videos for this chapter are now offline.`;
}

/** 409 = an open change request blocks publishing. */
export function publishErrorMessage(err) {
  if (err?.response?.status === 409) return apiErrorMessage(err, OPEN_CHANGE_REQUEST);
  return apiErrorMessage(err, 'Could not publish this chapter.');
}

export const UNPUBLISHED = 'Unpublished. Students no longer see this chapter; it is back in To review.';
const DELETE_PUBLISHED = 'This chapter is published. Unpublish it first, then delete it.';

/** POST /edu_video/jobs/{id}/unpublish failed; 409 = it is not published any more (or changed meanwhile). */
export function unpublishErrorMessage(err) {
  if (err?.response?.status === 409) {
    return apiErrorMessage(err, 'This chapter is no longer published. Refresh to see its current state.');
  }
  return apiErrorMessage(err, 'Could not unpublish this chapter.');
}

/** DELETE /edu_video/jobs/{id} failed; 409 = a published chapter must be unpublished first (BACKEND-021). */
export function deleteErrorMessage(err, fallback = 'Could not remove this chapter.') {
  if (err?.response?.status === 409) return apiErrorMessage(err, DELETE_PUBLISHED);
  return apiErrorMessage(err, fallback);
}
