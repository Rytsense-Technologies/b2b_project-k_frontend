---
type: API
title: "Platform health"
description: "Super Admin health: per-service status with recent error counts, overall status, uptime."
tags: [api, superadmin, ops]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/health.py"
  - resource: "b2b_projectk/app/services/ops_monitor.py"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T18:00:00+05:30"
---
# Endpoints
| Method | Path | Who | Does |
|---|---|---|---|
| `GET` | `/health` | SA | metrics, services, overall status, uptime |
| `GET` | `/health/errors?days=&service=&limit=` | SA | errors grouped by fingerprint |

# Response (`GET /health`)
- `overall_status`: worst service status - `Operational` \| `Degraded` \| `Down` ("Not configured" ignored). Drive the page banner from this, never a fixed "All services operational".
- `services[]`: `{name, status, p95, note, errors_1h, errors_24h}` for API, Database, Video pipeline, **Voice tutor**, AI interview (omitted while `INTERVIEWS_ENABLED=False`), Email (Amazon SES). A WhatsApp row from the API is hidden in the portal (email only).
- `errors_1h`, `errors_24h`, `errors_by_service[] {service, errors_1h, errors_24h}`.
- `uptime_30d`, `uptime_24h` (% of per-minute checks that landed), `db_ok`, `checked_at`, `metrics[]`, `pipeline_latency[]`.

# Rules
- Chapter video render runs in a separate worker (`PIPELINE_WORKERS`, default 1). `GET /health` and `/health/errors` should answer while a chapter is rendering; the response shape is unchanged.
- Errors come from `platform_error_events`; ops_monitor maps logger names to services (`voice_qna` -> Voice tutor, `app.edu_video` -> Video pipeline, `mcq` -> MCQ generation, shown under Video pipeline, `app.livekit_interview` -> AI interview).
- A service with errors in the last hour is `Degraded`; 30 or more in the last hour is `Down` (`error_status`). Its own checks can also degrade it (failed / stalled video jobs; voice tutor lessons waiting for ingestion over 30 min).

# Related
[Super Admin](/roles/superadmin.md)
