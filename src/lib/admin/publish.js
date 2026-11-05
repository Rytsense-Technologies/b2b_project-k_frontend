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
