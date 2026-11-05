// FE-008: only the newest request may update a list.
import { describe, expect, it } from 'vitest';
import { createLatestRequest } from './latestRequest';

/** Mirrors useAsyncResource.reload around deferred responses. */
function harness() {
  const state = { data: null, loading: false, error: null };
  const latest = createLatestRequest();
  const reload = ({ silent = false } = {}) => {
    let resolve;
    let reject;
    const pending = new Promise((res, rej) => { resolve = res; reject = rej; });
    const ticket = latest.begin(silent);
    if (!silent) state.loading = true;
    const done = pending
      .then((value) => { if (ticket.current()) state.data = value; })
      .catch((err) => { if (!silent && ticket.current()) state.error = err; })
      .finally(() => { if (ticket.finish() && !silent) state.loading = false; });
    return { resolve, reject, done };
  };
  return { state, reload };
}

describe('createLatestRequest', () => {
  it('ignores an older response that lands last', async () => {
    const { state, reload } = harness();
    const a = reload();
    const b = reload();
    b.resolve('filter B');
    await b.done;
    a.resolve('filter A');
    await a.done;
    expect(state.data).toBe('filter B');
    expect(state.loading).toBe(false);
  });

  it('keeps loading on until the newest request settles', async () => {
    const { state, reload } = harness();
    const a = reload();
    const b = reload();
    a.resolve('filter A');
    await a.done;
    expect(state.data).toBe(null);
    expect(state.loading).toBe(true);
    b.resolve('filter B');
    await b.done;
    expect(state.loading).toBe(false);
  });

  it('ignores an older failure', async () => {
    const { state, reload } = harness();
    const a = reload();
    const b = reload();
    b.resolve('filter B');
    await b.done;
    a.reject(new Error('late'));
    await a.done;
    expect(state.error).toBe(null);
  });

  it('a silent poll never supersedes a user reload in flight', async () => {
    const { state, reload } = harness();
    const user = reload();
    const poll = reload({ silent: true });
    poll.resolve('poll');
    await poll.done;
    expect(state.data).toBe(null);
    user.resolve('user');
    await user.done;
    expect(state.data).toBe('user');
    expect(state.loading).toBe(false);
  });

  it('a user reload supersedes a silent poll in flight', async () => {
    const { state, reload } = harness();
    const poll = reload({ silent: true });
    const user = reload();
    user.resolve('user');
    await user.done;
    poll.resolve('poll');
    await poll.done;
    expect(state.data).toBe('user');
  });

  it('the newer of two polls wins', async () => {
    const { state, reload } = harness();
    const old = reload({ silent: true });
    const fresh = reload({ silent: true });
    fresh.resolve('fresh');
    await fresh.done;
    old.resolve('old');
    await old.done;
    expect(state.data).toBe('fresh');
  });
});
