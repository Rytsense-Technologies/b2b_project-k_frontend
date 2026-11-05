// AUTH-003: every API client shares one refresh call per tab.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./sessionExpiry', () => ({ handleSessionExpired: vi.fn() }));

const { default: api, refreshSession } = await import('./axios');
const { handleSessionExpired } = await import('./sessionExpiry');

function respond(config, status, data = {}) {
  const response = { status, data, headers: {}, config, statusText: '' };
  if (status < 400) return Promise.resolve(response);
  const err = new Error(`HTTP ${status}`);
  err.config = config;
  err.response = response;
  return Promise.reject(err);
}

let refreshCalls;
let tokenFresh;
let refreshStatus;

beforeEach(() => {
  refreshCalls = 0;
  tokenFresh = false;
  refreshStatus = 200;
  vi.mocked(handleSessionExpired).mockClear();
  api.defaults.adapter = async (config) => {
    if (config.url.includes('/auth/refresh-token')) {
      refreshCalls += 1;
      await new Promise((r) => { setTimeout(r, 5); });
      if (refreshStatus === 200) tokenFresh = true;
      return respond(config, refreshStatus);
    }
    return respond(config, tokenFresh ? 200 : 401, { ok: true });
  };
});

describe('session refresh', () => {
  it('sends one refresh for parallel callers', async () => {
    await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    expect(refreshCalls).toBe(1);
  });

  it('allows a later refresh once the first finished', async () => {
    await refreshSession();
    await refreshSession();
    expect(refreshCalls).toBe(2);
  });

  it('retries every request that hit a 401 after one refresh', async () => {
    const results = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(refreshCalls).toBe(1);
  });

  it('rejects every waiting request when the refresh fails', async () => {
    refreshStatus = 401;
    const settled = await Promise.allSettled([api.get('/a'), api.get('/b')]);
    expect(settled.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(handleSessionExpired).toHaveBeenCalled();
  });

  it('is the only place that posts to the refresh endpoint', () => {
    const offenders = [];
    const walk = (dir) => readdirSync(dir).forEach((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.jsx?$/.test(name) && !name.endsWith('.test.js') && name !== 'axios.js'
        && /post\(\s*['"`]\/auth\/refresh-token/.test(readFileSync(full, 'utf8'))) offenders.push(full);
    });
    walk(path.resolve('src'));
    expect(offenders).toEqual([]);
  });
});
