// FE-006, FE-009, FE-012, FE-020: API-layer behaviour behind the portal screens.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));

const { default: toast } = await import('react-hot-toast');
const { apiErrorMessage } = await import('./superadmin/http');
const { getApiErrorMessage } = await import('./errors');
const { fetchAllPages } = await import('./fetchAllPages');
const { voiceQnaApi } = await import('./voiceQna');
const { reportLookupFailure } = await import('../lookupFailure');
const { isUuid } = await import('../utils');

const pydantic = (loc, msg) => ({ response: { status: 422, data: { detail: [{ type: 'x', loc, msg, input: 'abc' }] } } });

describe('FE-012 validator text', () => {
  const uuid = 'Input should be a valid UUID, invalid length: expected length 32 for simple format';

  it('hides validator text about a URL parameter', () => {
    expect(apiErrorMessage(pydantic(['path', 'id'], uuid), 'fallback')).not.toMatch(/UUID|Input should/);
    expect(apiErrorMessage(pydantic(['query', 'status'], 'String should match pattern'), 'fallback')).not.toMatch(/pattern/);
    expect(getApiErrorMessage(pydantic(['path', 'id'], uuid))).not.toMatch(/UUID/);
  });

  it('keeps messages about a submitted form', () => {
    expect(apiErrorMessage(pydantic(['body', 'email'], 'Enter a valid email'), 'fallback')).toBe('Enter a valid email');
    expect(getApiErrorMessage(pydantic(['body', 'email'], 'Enter a valid email'))).toBe('Enter a valid email');
  });

  it('recognises a UUID', () => {
    expect(isUuid('2f1c1c4e-8a53-4c63-9f3a-0a1b2c3d4e5f')).toBe(true);
    expect(isUuid('abc')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});

describe('FE-020 fetchAllPages', () => {
  const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));

  it('reaches row 101 and beyond', async () => {
    const all = rows(250);
    const fetchPage = vi.fn(async ({ page, pageSize }) => ({
      items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length,
    }));
    const out = await fetchAllPages(fetchPage);
    expect(out.items).toHaveLength(250);
    expect(out.total).toBe(250);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenCalledWith({ page: 3, pageSize: 100 });
  });

  it('makes one call when one page is enough', async () => {
    const fetchPage = vi.fn(async () => ({ items: rows(3), total: 3, scope: 'x' }));
    const out = await fetchAllPages(fetchPage);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(out.scope).toBe('x');
  });

  it('accepts a bare array', async () => {
    const out = await fetchAllPages(async () => rows(2));
    expect(out.items).toHaveLength(2);
    expect(out.total).toBe(2);
  });

  it('stops at the safety cap', async () => {
    const fetchPage = vi.fn(async () => ({ items: rows(100), total: 100000 }));
    await fetchAllPages(fetchPage, { maxPages: 3 });
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });
});

describe('FE-009 reportLookupFailure', () => {
  beforeEach(() => { vi.mocked(toast.error).mockClear(); });

  it('tells the user once per list', () => {
    reportLookupFailure('departments', { response: { status: 500 } });
    expect(toast.error.mock.calls[0][0]).toMatch(/departments/);
    expect(toast.error.mock.calls[0][1]).toEqual({ id: 'lookup:departments' });
  });

  it('stays quiet when the session or the role is the reason', () => {
    reportLookupFailure('departments', { response: { status: 401 } });
    reportLookupFailure('departments', { response: { status: 403 } });
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('FE-006 voice tutor API', () => {
  let calls;

  beforeEach(() => {
    calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ ok: true, conversation_id: 'c1' }), { status: 200 });
    }));
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('posts a typed question for a chapter', async () => {
    await voiceQnaApi.chat({ jobId: 'job-1', text: 'What is a cell?' });
    expect(calls[0].url).toMatch(/\/voice_qna\/chat\?job_id=job-1$/);
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(calls[0].init.body)).toEqual({ text: 'What is a cell?' });
    expect(calls[0].init.credentials).toBe('include');
  });

  it('continues a conversation by id, not by chapter', async () => {
    await voiceQnaApi.chat({ jobId: 'job-1', conversationId: 'c1', text: 'And why?' });
    expect(calls[0].url).toMatch(/\/voice_qna\/chat\?conversation_id=c1$/);
  });

  it('renames with PATCH; empty goes back to the automatic name', async () => {
    await voiceQnaApi.rename('c 1', '  Cell notes ');
    expect(calls[0].url).toMatch(/\/voice_qna\/conversations\/c%201$/);
    expect(calls[0].init.method).toBe('PATCH');
    expect(JSON.parse(calls[0].init.body)).toEqual({ title: 'Cell notes' });
    await voiceQnaApi.rename('c1', '   ');
    expect(JSON.parse(calls[1].init.body)).toEqual({ title: null });
  });
});
