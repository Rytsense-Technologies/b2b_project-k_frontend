# Module: AI Skill Courses

Frontend: `/superadmin/skills`  
Quirri-created **non-subject** skill courses. Two creation paths: AI generate, video upload.

## `GET /api/v1/superadmin/skill-courses/metrics`

```json
{
  "success": true,
  "data": [
    { "title": "Published Courses", "value": "12" },
    { "title": "AI Generated", "value": "8" },
    { "title": "Video Courses", "value": "4" },
    { "title": "Enrollments", "value": "7830" },
    { "title": "Completion", "value": "68%" }
  ]
}
```

## `GET /api/v1/superadmin/skill-courses`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "course": "Interview Readiness Booster",
      "title": "Interview Readiness Booster",
      "type": "AI Generated",
      "typeStyle": "qa",
      "category": "Career",
      "audience": "Final Year",
      "colleges": "All Colleges",
      "usage": "3204",
      "status": "Published",
      "statusType": "ok"
    }
  ]
}
```

`type`: `AI Generated` | `Video Upload`  
`typeStyle`: `qa` for AI, `learning` for video  
`category`: `Career` | `Soft Skill` | `Aptitude` | `English`  
`audience`: `All Years` | `Final Year Only` | `Selected Departments`  
`status`: `Draft` | `Published` | `Archived`

## `POST /api/v1/superadmin/skill-courses/generate`

```json
{
  "topic": "Communication skills for interviews",
  "category": "Career",
  "audience": "All Years",
  "duration": "30 minutes",
  "prompt": "Describe what students should learn..."
}
```

Response `data`:

```json
{
  "id": "uuid",
  "status": "Draft",
  "outline": {
    "title": "...",
    "modules": [{ "title": "Module 1", "minutes": 10, "lessons": ["..."] }]
  }
}
```

Run LLM asynchronously if slow; return `202` with `{ "id", "status": "generating" }` then poll `GET /skill-courses/{id}`. Frontend currently expects the POST to finish; prefer sync if generation < 15s.

## `POST /api/v1/superadmin/skill-courses/upload`

`multipart/form-data`:

- `title` string
- `category` string
- `colleges` string (`All Colleges` or JSON id list)
- `audience` string
- `video` file (`video/mp4`, `video/quicktime`)

Store on S3, create course `type=Video Upload`, `status=Draft`. Later: thumbnail + transcript.

## `PATCH /api/v1/superadmin/skill-courses/{id}`

Update title, category, audience, assigned colleges, status (`Published`).

Audit: `Generated AI course {title}` / `Uploaded video course {title}` / `Published course {title}`.
