# Module: Colleges

Frontend route: `/superadmin/colleges`  
A college is a tenant. Super Admin creates the college and one or more college admins.

## Endpoints

### `GET /api/v1/superadmin/colleges`

Query: `search`, `status` (`Active|Inactive|Suspended|Onboarding`), `plan` (`Standard|Premium`), `page`, `limit`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "ABC Engineering College",
        "code": "COL-0001",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "address": "Guindy, Chennai",
        "student_limit": 5000,
        "admins": 3,
        "admin_list": [
          { "id": "uuid", "name": "Ravi Kumar", "email": "ravi@abc.edu", "mobile": "9876543210" }
        ],
        "departments": 8,
        "students": "2340",
        "final_year": 420,
        "plan": "Premium",
        "status": "Active",
        "statusType": "ok"
      }
    ]
  },
  "meta": { "page": 1, "limit": 20, "total": 24 }
}
```

`statusType`: `ok` Active, `warn` Onboarding, `off` Inactive/Suspended.

`search` matches name, code, admin email.

### `GET /api/v1/superadmin/colleges/{id}`

Same college object plus:

```json
{
  "departments_list": [
    {
      "department": "CSE",
      "students": "620",
      "finalYear": "156",
      "hod": "Dr. Karthik",
      "hours": "1420 hrs",
      "questions": "4280"
    }
  ]
}
```

### `POST /api/v1/superadmin/colleges`

```json
{
  "name": "New College",
  "code": "COL-0003",
  "city": "Coimbatore",
  "state": "Tamil Nadu",
  "plan": "Standard",
  "student_limit": 5000,
  "address": "...",
  "admins": [
    { "name": "Admin name", "email": "admin@college.edu", "mobile": "9000000000" }
  ]
}
```

Rules:

- `name` required, unique
- `code` unique; if omitted auto-generate `COL-####`
- Create college row + invite/create college_admin users (send set-password email)
- `status` starts as `Onboarding` until first admin login, then `Active`
- Audit: `Added college {name}` and `Added admin {email}`

### `PATCH /api/v1/superadmin/colleges/{id}`

Same body, partial update. Replacing `admins` upserts by email; omitted existing admins stay unless you also support delete via a `remove_admin_ids` array.

### `DELETE /api/v1/superadmin/colleges/{id}`

Soft-delete. `403` if students exist unless `?force=true` (still soft-delete).

## Tables

`colleges (id, name, code, city, state, address, plan, student_limit, status, created_at)`  
`college_admins (id, college_id, user_id, name, email, mobile)`
