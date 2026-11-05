// UX-019: a page that asks twice while the first load runs makes one request per URL.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/mcq', () => ({ mcqApi: { myAttempts: vi.fn(), get: vi.fn() } }));

const { mcqApi } = await import('@/lib/api/mcq');
const { loadQuizStates } = await import('./quizStates');

const chapter = { job_id: 'j1', watch_complete: true };

beforeEach(() => {
  vi.mocked(mcqApi.myAttempts).mockReset().mockResolvedValue([]);
  vi.mocked(mcqApi.get).mockReset().mockResolvedValue({ status: 'not_attempted', watch_percent: 100 });
});

describe('loadQuizStates', () => {
  it('shares in-flight requests between overlapping loads', async () => {
    const [a, b] = await Promise.all([loadQuizStates([chapter]), loadQuizStates([chapter])]);
    expect(mcqApi.myAttempts).toHaveBeenCalledTimes(1);
    expect(mcqApi.get).toHaveBeenCalledTimes(1);
    expect(a.get('j1').state).toBe('open');
    expect(b.get('j1').state).toBe('open');
  });

  it('fetches fresh data once the earlier load has finished', async () => {
    await loadQuizStates([chapter]);
    await loadQuizStates([chapter]);
    expect(mcqApi.myAttempts).toHaveBeenCalledTimes(2);
    expect(mcqApi.get).toHaveBeenCalledTimes(2);
  });

  it('does not keep a failed attempts call', async () => {
    vi.mocked(mcqApi.myAttempts).mockRejectedValueOnce(new Error('boom'));
    const first = await loadQuizStates([chapter]);
    expect(first.get('j1').state).toBe('open');
    await loadQuizStates([chapter]);
    expect(mcqApi.myAttempts).toHaveBeenCalledTimes(2);
  });
});
