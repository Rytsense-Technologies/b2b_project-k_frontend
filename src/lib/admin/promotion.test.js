// FUN-001: a second promotion in one academic year must be confirmable, not a dead-end 409.
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({ default: { post: vi.fn(async (url, body) => ({ data: { url, body } })) } }));

const { default: api } = await import('@/lib/axios');
const { usersApi } = await import('../api/superadmin/users');
const { promotionBody, isAlreadyPromoted } = await import('./promotion');

describe('FUN-001 year promotion', () => {
  it('sends repeat_confirmed only when the admin confirmed a repeat', () => {
    expect(promotionBody({ dryRun: true })).toEqual({ dry_run: true });
    expect(promotionBody({ dryRun: false, repeatConfirmed: true })).toEqual({ dry_run: false, repeat_confirmed: true });
    expect(promotionBody({ dryRun: false, tenantId: 't1' })).toEqual({ dry_run: false, tenant_id: 't1' });
  });

  it('the API client passes the repeat confirmation through', async () => {
    await usersApi.bulkPromoteYear({ dryRun: false, repeatConfirmed: true });
    expect(api.post).toHaveBeenLastCalledWith('/users/bulk-promote-year', { dry_run: false, repeat_confirmed: true });
  });

  it('knows a college was already promoted, from the preview or from a 409', () => {
    expect(isAlreadyPromoted({ preview: { already_promoted_this_year: true } })).toBe(true);
    expect(isAlreadyPromoted({ preview: { already_promoted_this_year: false } })).toBe(false);
    expect(isAlreadyPromoted({ error: { response: { status: 409 } } })).toBe(true);
    expect(isAlreadyPromoted({ error: { response: { status: 500 } } })).toBe(false);
    expect(isAlreadyPromoted({})).toBe(false);
  });
});
