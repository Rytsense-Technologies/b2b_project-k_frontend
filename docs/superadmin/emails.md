# Module: Email Management

Frontend: `/superadmin/emails`  
Platform sender/notification addresses. Super Admin adds, verifies, edits, deletes.

Purposes: `Support notifications` | `Report delivery` | `System alerts` | `Billing`

## `GET /api/v1/superadmin/emails`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "support@quirri.ai",
      "purpose": "Support notifications",
      "status": "Verified",
      "addedBy": "Super Admin",
      "added_by": "Super Admin",
      "created": "12 Jun 2026",
      "created_at": "2026-06-12T10:00:00Z"
    }
  ]
}
```

`status`: `Pending` | `Verified` | `Failed`

## `POST /api/v1/superadmin/emails`

```json
{ "email": "name@quirri.ai", "purpose": "Support notifications" }
```

- Validate unique email
- Insert `Pending`
- Send verification (SES/SMTP) with token link `GET /api/v1/superadmin/emails/verify?token=...` (public, token-bound)
- Audit: `Added platform email {email}`

Response: created row.

## `PATCH /api/v1/superadmin/emails/{id}`

Update `email` (re-verify → `Pending`) and/or `purpose`.

## `DELETE /api/v1/superadmin/emails/{id}`

Hard or soft delete. Audit: `Deleted notification email {email}`

## `POST /api/v1/superadmin/emails/{id}/verify`

Resend verification email.
