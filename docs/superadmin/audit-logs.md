# Module: Audit Logs

Frontend: `/superadmin/audit`

Append-only log of super admin (and optionally college admin) actions.

## `GET /api/v1/superadmin/audit-logs`

Query: `search`, `module` (`College|Department|Email|AI Course`), `range` (`last_30_days|last_7_days|today`), `page`, `limit`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "datetime": "19 Jun 2026, 04:12 PM",
      "created_at": "2026-06-19T16:12:00Z",
      "user": "Super Admin",
      "role": "Quirri Team",
      "module": "College",
      "action": "Added new admin to ABC Engineering",
      "ip": "103.21.xx.18",
      "college_id": "uuid"
    }
  ]
}
```

`search` matches action, user, college name, module.

Mask last IP octet in the API response.

## `GET /api/v1/superadmin/audit-logs/export`

Same filters. CSV: `Date & Time,User,Role,Module,Action,IP Address`

## Writer (middleware)

On every successful mutating superadmin request insert:

```text
audit_logs (id, actor_user_id, actor_name, role, module, action, ip, college_id, metadata jsonb, created_at)
```

Never update/delete rows from the product UI.
