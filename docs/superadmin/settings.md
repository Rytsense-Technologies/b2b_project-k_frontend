# Module: Settings

Frontend: `/superadmin/settings`  
Current super admin profile, 2FA flag, alert channels.

## `GET /api/v1/superadmin/settings`

```json
{
  "success": true,
  "data": {
    "first_name": "Super",
    "last_name": "Admin",
    "email": "admin@quirri.ai",
    "two_fa": true,
    "alerts": "Email + WhatsApp"
  }
}
```

`alerts`: `Email + WhatsApp` | `Email only`

## `PATCH /api/v1/superadmin/settings`

```json
{
  "first_name": "Super",
  "last_name": "Admin",
  "email": "admin@quirri.ai",
  "two_fa": true,
  "alerts": "Email + WhatsApp"
}
```

Rules:

- Update the authenticated superadmin user only
- If `email` changes, require re-verify and keep old email until verified
- `two_fa: true` should enroll TOTP (return `otpauth_url` on first enable). Frontend currently only sends the boolean/select
- Persist alert preference for system notifications
- Audit: `Updated super admin settings`

Return the same shape as GET.
