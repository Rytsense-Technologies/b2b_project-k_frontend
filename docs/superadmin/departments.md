# Module: Departments

Frontend: `/superadmin/departments`  
Super Admin is **read-only**. College admin creates departments.

## `GET /api/v1/superadmin/departments`

Query: `search`, `college` (name or id), `department`, `page`, `limit`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "college": "ABC Engineering",
      "college_id": "uuid",
      "department": "CSE",
      "hod": "Dr. Karthik",
      "students": "620",
      "finalYear": "156",
      "subjects": "18",
      "hours": "1420 hrs",
      "questions": "4280",
      "interviews": "810"
    }
  ]
}
```

`search` matches college, department name, HOD.

## `GET /api/v1/superadmin/departments/export`

Same query params. Returns CSV:

`College,Department,HOD,Students,Final Year,Subjects,Learning Hours,Questions,Interviews`

## Notes

- `hours` = sum of self-learning duration for students in that department
- `questions` = Q&A count
- `interviews` = completed interviews (prefer final-year)
- Do **not** expose create/update/delete to superadmin
