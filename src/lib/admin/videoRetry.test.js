// FUN-002: Retry on a failed chapter re-renders from the saved plan. A job that failed while planning has no plan
// (and no slides), so the server refuses it with 400 "No plan available": the button must not be offered there.
import { describe, expect, it } from 'vitest';
import { canRetryFailedJob, isRegenerating } from './videoRetry';

describe('FUN-002 retry a failed chapter', () => {
  it('offers Retry when the failed job has planned slides', () => {
    expect(canRetryFailedJob({ status: 'FAILED', total_scenes: 7 })).toBe(true);
  });

  it('does not offer Retry when planning itself failed', () => {
    expect(canRetryFailedJob({ status: 'FAILED', total_scenes: 0 })).toBe(false);
    expect(canRetryFailedJob({ status: 'FAILED' })).toBe(false);
  });

  it('is only about failed jobs', () => {
    expect(canRetryFailedJob({ status: 'DONE', total_scenes: 7 })).toBe(false);
  });
});

// FUN-004: since BACKEND-004 the change request stays open while the regenerated video renders, so the chapter
// stays in the College Admin's Change requests queue. The row must say it is rendering instead of offering
// Save & regenerate again (the API answers 400 "only once rendering has finished").
describe('FUN-004 change request while regenerating', () => {
  it('a chapter being rendered is regenerating', () => {
    expect(isRegenerating({ status: 'RENDERING', changes_requested_at: '2026-11-03T05:00:00Z' })).toBe(true);
    expect(isRegenerating({ status: 'PENDING' })).toBe(true);
  });

  it('a finished or failed chapter can be reviewed again', () => {
    expect(isRegenerating({ status: 'DONE' })).toBe(false);
    expect(isRegenerating({ status: 'FAILED' })).toBe(false);
    expect(isRegenerating({})).toBe(false);
  });
});
