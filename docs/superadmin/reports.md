# Module: Reports

Frontend: `/superadmin/reports`

## Query params (all report endpoints)

- `search` — student, college, department, subject, question keyword
- `report_type` — `college` | `department` | `student` | `qa` | `interview` | `ai_usage`
- `college` — name or id
- `range` — `last_30_days` | `this_month` | `custom`
- `start_date`, `end_date` — required when `range=custom`

## `GET /api/v1/superadmin/reports/preview`

Returns rows for the table. Default type if empty: department rollup (matches the HTML).

```json
{
  "success": true,
  "data": [
    {
      "college": "ABC Engineering",
      "department": "CSE",
      "students": "620",
      "duration": "1420 hrs",
      "questions": "4280",
      "interviews": "810",
      "score": "76%"
    }
  ]
}
```

Column meaning can vary by `report_type`; keep these keys for the default preview so the current UI works. Additional keys are OK.

## `POST /api/v1/superadmin/reports/generate`

Body: same fields as query params.

Persist a job:

```json
{
  "id": "uuid",
  "status": "ready",
  "report_type": "department",
  "row_count": 12
}
```

If generation is cheap, run inline and `status=ready`. If heavy, `status=queued` and process async.

Audit: `Generated {report_type} report`

## `GET /api/v1/superadmin/reports/download`

Query: same filters + `format` = `csv` | `xlsx` | `pdf`

Return the file blob. Filename example: `quirri-department-report-2026-06.xlsx`

CSV/Excel columns for default preview:

`College,Department,Students,Self Learning Duration,Questions Asked,Interviews,Avg Score`
