import api from '@/lib/axios';
import { unwrap } from '@/lib/api/superadmin/http';

/**
 * Live: /api/v1/notifications/rules (docs/agent/redesign/notifications-plan.md § Contract).
 *
 * There is no `/notifications/preferences` route. Personal switches use this
 * client with the caller's default scope (Faculty / Student → personal).
 * GET /notifications/mine is the inbox (messages sent to the signed-in person),
 * not preference read/write.
 *
 * GET  /rules?scope=platform|tenant|department|personal&scope_id=<uuid?>
 *      → { scope, scope_id, scope_label, can_edit, groups: [{ id, name, description?, events: [
 *          { id, name, trigger, recipients, channels, mandatory, enabled, effective, editable, locked_reason } ] }] }
 *      No scope = the caller's default (SA platform · CA own college · HOD own department · Faculty / Student personal).
 * PUT  /rules/{event_id}       body { scope, scope_id?, enabled } → updated event row (403 / 409 locked / 422 mandatory).
 * POST /rules/{event_id}/test  (SA, CA, HOD) → the delivery row of a sample message sent to the requester.
 */
export const notificationRulesApi = {
  list: async ({ scope, scopeId } = {}) => {
    const params = {};
    if (scope) params.scope = scope;
    if (scopeId) params.scope_id = scopeId;
    return unwrap(await api.get('/notifications/rules', { params }));
  },
  update: async (eventId, { scope, scopeId, enabled }) => {
    const body = { scope, enabled: Boolean(enabled) };
    if (scopeId) body.scope_id = scopeId;
    return unwrap(await api.put(`/notifications/rules/${encodeURIComponent(eventId)}`, body));
  },
  sendTest: async (eventId, { scope, scopeId } = {}) => {
    const body = {};
    if (scope) body.scope = scope;
    if (scopeId) body.scope_id = scopeId;
    return unwrap(await api.post(`/notifications/rules/${encodeURIComponent(eventId)}/test`, body));
  },
};
