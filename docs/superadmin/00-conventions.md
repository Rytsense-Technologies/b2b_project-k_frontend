# Super Admin API conventions

Build this as FastAPI (or equivalent) under `/api/v1/superadmin`.

## Auth

- Session cookies: `access_token`, `refresh_token` (httpOnly, SameSite=Lax)
- Reject if user `user_type` / role is not `super_admin` / `superadmin`
- CORS: allow frontend origin with `credentials: true`

## Envelope

Success:

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 0 }
}
```

List endpoints may put the array in `data` **or** `data.items`. Frontend accepts `data`, `data.items`, `data.results`, `data.rows`.

Error:

```json
{
  "success": false,
  "detail": "Human readable message",
  "code": "COLLEGE_NOT_FOUND"
}
```

HTTP codes: `400` validation, `401` unauthenticated, `403` not superadmin, `404` missing, `409` conflict, `422` schema, `500` unexpected.

## IDs and dates

- IDs: UUID strings
- Dates in list views: human display is fine (`19 Jun 2026, 04:12 PM`) **or** ISO-8601. Prefer ISO in JSON (`created_at`) plus optional `datetime` display field
- Money: display string with currency, e.g. `"₹18,240"` **and** numeric `cost_inr: 18240`
- Counts shown with commas in UI can be numbers in JSON (`2340`). Frontend will render either

## Pagination query

`page` (default 1), `limit` (default 20), `search` (optional).

## Audit every mutation

Write an audit log row for create/update/delete/export/generate. Fields: actor, role, module, action, ip, college_id if any.

## File downloads

`Content-Type` matching format, `Content-Disposition: attachment; filename="..."`.
