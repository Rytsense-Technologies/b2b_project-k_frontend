// P4 DECB: publish answers { job_id, published, unpublished_job_ids } and 409 while a change request is open.
import { describe, expect, it } from 'vitest';
import { publishErrorMessage, publishedMessage } from './publish';

describe('publishedMessage', () => {
  it('is the plain message when nothing went offline', () => {
    expect(publishedMessage({ job_id: 'j2', published: true, unpublished_job_ids: [] })).toBe('Published. Students can now watch this chapter.');
    expect(publishedMessage(undefined)).toBe('Published. Students can now watch this chapter.');
  });
  it('tells the reviewer the previous video went offline', () => {
    expect(publishedMessage({ unpublished_job_ids: ['j1'] })).toBe(
      'Published. Students can now watch this chapter. The previous video for this chapter is now offline.',
    );
    expect(publishedMessage({ unpublished_job_ids: ['j0', 'j1'] })).toBe(
      'Published. Students can now watch this chapter. 2 earlier videos for this chapter are now offline.',
    );
  });
});

describe('publishErrorMessage', () => {
  const detail = 'This chapter has an open change request. Regenerate the video with the changes, or dismiss the request, before publishing.';
  it('shows the open change request sentence for a 409', () => {
    expect(publishErrorMessage({ response: { status: 409, data: { detail } } })).toBe(detail);
  });
  it('explains a 409 with no sentence', () => {
    expect(publishErrorMessage({ response: { status: 409, data: {} } })).toBe(
      'This chapter has an open change request. Regenerate the video with the changes, or dismiss the request, before publishing.',
    );
  });
  it('falls back for other errors', () => {
    expect(publishErrorMessage({ response: { status: 400, data: {} } })).toBe('Could not publish this chapter.');
  });
});
