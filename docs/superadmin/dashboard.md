# Module: Dashboard

Frontend: `GET /api/v1/superadmin/dashboard?range=last_30_days`

`range`: `last_30_days` | `this_month` | `last_month`

## Response `data`

```json
{
  "metrics": [
    { "title": "Total Colleges", "value": "24", "trend": "18 active · 6 onboarding" },
    { "title": "Total Departments", "value": "126", "trend": "Across all colleges" },
    { "title": "Active Students", "value": "18420", "trend": "+12% this month" },
    { "title": "Self Learning Read Duration", "value": "42860 hrs", "trend": "Total duration of courses read" },
    { "title": "Interviews Completed", "value": "6840", "trend": "Final year students" }
  ],
  "learning_activity": [
    {
      "college": "ABC Engineering",
      "college_id": "uuid",
      "duration": "4820 hrs",
      "courses": "18240",
      "questions": "12402",
      "quality": "91%",
      "status": "High Learning",
      "statusType": "learning"
    }
  ],
  "top_colleges": [
    { "college": "ABC Engineering", "college_id": "uuid", "students": "2340", "usage": "35462" }
  ],
  "department_snapshot": [
    {
      "college": "ABC Engineering",
      "college_id": "uuid",
      "department": "CSE",
      "students": "620",
      "finalYear": "156",
      "hours": "1420 hrs",
      "qa": "4280"
    }
  ]
}
```

`statusType` for learning rows: `learning` | `qa` | `mix` | `off`

## Logic

- Metrics are platform-wide
- Learning activity: last N days per college — sum course-read hours, courses completed/read, Q&A questions, answer-quality %
- Status heuristic example: quality ≥ 90 and hours high → `High Learning`; Q&A volume high → `High Q&A`; both mid → `Balanced`; else `Needs Push`
- Top colleges: rank by learning hours + Q&A + interviews
- Department snapshot: top 3–10 departments by students

## SQL hints

Join `colleges`, `departments`, `students`, `learning_sessions`, `qa_questions`, `interviews` with date filter on `created_at`.
