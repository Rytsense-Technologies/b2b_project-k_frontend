// BACKEND-021: a published chapter is unpublished first (POST /edu_video/jobs/{id}/unpublish), then deleted;
// DELETE answers 409 "Unpublish it first" while it is published.
import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({ refreshSession: vi.fn() }));
vi.mock('@/lib/sessionExpiry', () => ({ handleSessionExpired: vi.fn() }));

const sent = [];
axios.defaults.adapter = async (config) => {
  sent.push({ method: config.method, url: config.url });
  return { status: 200, statusText: 'OK', headers: {}, config, data: { job_id: 'j 1', published: false } };
};

const { eduVideoApi } = await import('@/lib/api/admin/eduVideo');
const { UNPUBLISHED, deleteErrorMessage, unpublishErrorMessage } = await import('./publish');

const fail = (status, detail) => ({ response: { status, data: detail ? { detail } : {} } });

describe('eduVideoApi.unpublish', () => {
  it('posts to the job unpublish route and returns the body', async () => {
    sent.length = 0;
    const res = await eduVideoApi.unpublish('j 1');
    expect(sent).toHaveLength(1);
    expect(sent[0].method).toBe('post');
    expect(sent[0].url).toMatch(/\/edu_video\/jobs\/j%201\/unpublish$/);
    expect(res).toEqual({ job_id: 'j 1', published: false });
  });
});

describe('unpublish messages', () => {
  it('confirms where the chapter went', () => {
    expect(UNPUBLISHED).toMatch(/Students no longer see this chapter/);
  });
  it('shows the API sentence for a 409 and explains one without it', () => {
    expect(unpublishErrorMessage(fail(409, 'This chapter is not published.'))).toBe('This chapter is not published.');
    expect(unpublishErrorMessage(fail(409))).toBe('This chapter is no longer published. Refresh to see its current state.');
    expect(unpublishErrorMessage(fail(400))).toBe('Could not unpublish this chapter.');
  });
});

describe('deleteErrorMessage', () => {
  it('passes the 409 "Unpublish it first" sentence through', () => {
    const detail = 'This chapter is published. Unpublish it first, then delete it.';
    expect(deleteErrorMessage(fail(409, detail))).toBe(detail);
  });
  it('says the same when the 409 has no body', () => {
    expect(deleteErrorMessage(fail(409))).toBe('This chapter is published. Unpublish it first, then delete it.');
  });
  it('keeps the generic message for other failures', () => {
    expect(deleteErrorMessage(fail(400))).toBe('Could not remove this chapter.');
  });
});
