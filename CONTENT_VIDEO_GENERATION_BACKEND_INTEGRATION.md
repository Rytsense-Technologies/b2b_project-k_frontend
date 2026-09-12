# Content Upload & Video Generation Backend Integration

Status: Frontend integrated against the real backend as it exists today. Not committed, not pushed — working tree only.

Read this first: the backend for this feature does not match the workflow originally assumed (Department/Program/Year/Semester/Subject-linked chapters, single-call “upload → generate → done”, HOD approval routing). The real backend is a generic, unauthenticated document→video pipeline with no curriculum-hierarchy linkage and a mandatory admin-review gate. Every claim below is drawn from reading `app/edu_video/routes.py`, `schemas.py`, `job_tracker.py`, `pipeline.py`, and `storage.py` in full (repo: `b2b_projectk/`) — not from `VIDEO_GENERATION_PIPELINE.md`, which is confirmed stale on the two points that matter most for this integration (see §5).

## 1. Backend API Overview

All endpoints are on `app/edu_video/routes.py`, mounted at `/edu_video` directly on the FastAPI app — not under `/api/v1` like every other module (`app/main.py`: `app.include_router(edu_video_router, prefix="/edu_video", ...)`).

| API | Method | Purpose | Auth |
|-----|--------|---------|------|
| `/edu_video/upload` | POST | Upload a document, start generation | None |
| `/edu_video/status/{job_id}` | GET | Poll one job’s status/progress | None |
| `/edu_video/jobs/{job_id}/plan` | GET | Fetch the generated lesson plan (scenes/narration) | None |
| `/edu_video/jobs/{job_id}/plan` | PUT | Edit the plan before rendering (admin-review step) | None |
| `/edu_video/jobs/{job_id}/submit` | POST | Confirm the plan and start rendering | None |
| `/edu_video/jobs/{job_id}/audit` | GET | Source-traceability report for the plan | None |
| `/edu_video/jobs/{job_id}/scene_image/{scene_index}` | GET | PNG render of one scene (for a review UI) | None |
| `/edu_video/jobs/{job_id}/scene_editable_regions/{scene_index}` | GET | Click-to-edit bounding boxes for a scene | None |
| `/edu_video/download/{job_id}` | GET | Serve/redirect to the finished MP4 | None |
| `/edu_video/themes`, `/edu_video/designs`, `/edu_video/avatars` | GET | List valid values for upload’s optional styling params | None |

No list/history endpoint exists. Every job/scene route takes a specific `job_id` — there is nothing that returns “all my uploads.” See §9.

No delete or retry endpoint exists. `app/edu_video/storage.py` has an internal `delete_video()` function but its own docstring says it’s “not currently wired to any route.” Per-scene render retries happen automatically inside the pipeline (`MAX_SCENE_ATTEMPTS = 3`), but nothing a client can trigger.

**Integrated in this pass:** upload, status, submit (called automatically, not manually), download. **Not integrated:** plan (get/edit), audit, scene_image, scene_editable_regions, themes/designs/avatars — these back the admin-review/plan-editing screen, which this UI deliberately skips (see §5, decision 2).

## 2. Request Payload

`POST /edu_video/upload` is multipart/form-data with these Form/File parameters (declared directly in the route signature, not a Pydantic model):

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `file` | Yes | file | Extension must be one of `.pdf` `.docx` `.doc` `.txt` (checked by extension only — no MIME/magic-byte check, no server-side size limit) |
| `language` | Yes | string | Must be exactly `"tamil"` or `"english"` — no default |
| `theme_id` | No | string | Defaults to `"midnight"` server-side if omitted; must be one of `GET /edu_video/themes`’ values if sent |
| `design_id` | No | string | Must be one of `GET /edu_video/designs`’ values if sent |
| `avatar_id` | No | string | Must be one of `GET /edu_video/avatars`’ values if sent |

There is no department, program, year, semester, subject, or chapter field. Confirmed by reading the route signature, every schema in `schemas.py`, and both database tables (`edu_video_jobs`, `edu_video_scenes`) across related Alembic migrations. `app/edu_video/storage.py`’s own docstring states this plainly: “EduVideoJob has no separate institution/subject/chapter hierarchy yet.” Sending extra form fields would simply be silently ignored by FastAPI (they’re not declared params) — not stored, not erroring.

**What this frontend actually sends:** `file` and a hardcoded `language: "english"` (see §5, decision 3, for why language has no UI field). Department and Chapter title are captured in the form but are **local-only metadata** — kept in the browser (`localStorage`) to label the row in the Content Status table, never sent to the backend.

## 3. Response Structure

`POST /edu_video/upload` (immediate, before any real work happens):

```json
{ "job_id": "…", "status": "PENDING" }
```

`GET /edu_video/status/{job_id}`:

```json
{
  "job_id": "…",
  "status": "PENDING | EXTRACTING | SCRIPTING | AWAITING_REVIEW | RENDERING | DONE | FAILED",
  "error": "… or null",
  "output_path": "local path, s3://… URI, or null",
  "total_scenes": 0,
  "completed_scenes": 0,
  "failed_scenes": 0,
  "progress": 0
}
```

`progress` is a 0–100 int derived from `completed_scenes`/`total_scenes`, computed in `job_tracker.py::scene_progress()`.

`POST /edu_video/jobs/{job_id}/submit`: transitions the job and returns a status dict (not separately integrated beyond triggering it — see §6).

Error responses are FastAPI’s standard `{"detail": "…"}` shape (see §7 for the exact set this module raises).

## 4. Authentication

There is none, on any `/edu_video/*` route. Confirmed by reading every route in `app/edu_video/routes.py` — none declare `Depends(require_role(...))`, `Depends(require_permission(...))`, or even `Depends(get_current_user)`. The router is registered with no auth wrapper (`app/main.py`).

This is a known backend gap, not a frontend decision. Per product direction, this integration proceeds anyway (frontend calls the endpoints exactly as they exist, with no auth headers since none are checked), on the understanding that this is accepted for the current phase. This should **not** be considered production-safe until the backend adds real authorization — anyone who can reach the API (not just College Admins) can currently upload, poll, submit, and download through these routes.

No new auth mechanism was introduced frontend-side: the dedicated axios instance (`src/lib/api/admin/eduVideo.js`) sets `withCredentials: true` for consistency with the rest of the app, but since the backend checks nothing, this has no functional effect today.

## 5. Video Generation Lifecycle

Exact enum, `app/edu_video/job_tracker.py`:

```python
class JobStatus(str, Enum):
    PENDING = "PENDING"
    EXTRACTING = "EXTRACTING"
    SCRIPTING = "SCRIPTING"
    AWAITING_REVIEW = "AWAITING_REVIEW"
    RENDERING = "RENDERING"
    DONE = "DONE"
    FAILED = "FAILED"
```

Critical, non-obvious behavior:

1. It is **asynchronous**, via FastAPI `BackgroundTasks` (not a queue/Celery). The upload call returns `{job_id, status: PENDING}` immediately; a background task then runs extraction and scripting.
2. There is a **mandatory human-review gate**. `run_pipeline()` deliberately stops at `AWAITING_REVIEW` once the lesson plan is drafted — it does not render a video from the upload call alone. Rendering only starts after a separate `POST /jobs/{job_id}/submit` call, which the backend rejects (`400`) unless the job is currently `AWAITING_REVIEW`.
3. **`DONE` does not always mean the video is downloadable.** The route comment in `download()` states: “DONE only guarantees the plan (live lesson) is ready — the MP4 export runs afterward as a best-effort second phase.” The real readiness signal is `output_path` being non-null, not `status === "DONE"` alone.

**Decision applied in this integration:** the frontend **auto-submits** the moment it observes `AWAITING_REVIEW` via polling — no manual review/edit screen was built. This matches the single-button “Upload & generate” UX, at the cost of the plan-review/edit capability the backend actually supports.

### Frontend status → UI mapping (`statusBadge()`)

| Backend status | UI badge |
|----------------|----------|
| `PENDING`, `EXTRACTING`, `SCRIPTING` | “Generating” (blue) |
| `AWAITING_REVIEW` | “Reviewing” (amber) — transitional; auto-submit fires within one poll tick |
| `RENDERING` | “Rendering” (blue) |
| `DONE` with `output_path` | “Published” (green) + Download link |
| `DONE` without `output_path` | “Rendering” (blue) — export still finishing |
| `FAILED` | “Failed” (red) + the backend’s error message shown inline |

## 6. Frontend → Backend Flow (as implemented)

```
College Admin fills Department + Chapter title + selects a file
        ↓
Frontend validates: department selected, title non-empty (academicLabel catalog),
file extension in [.pdf .docx .doc .txt], file ≤ 50 MB (frontend-only guard)
        ↓
POST /edu_video/upload  (file, language: "english")
        ↓
Backend returns { job_id, status: "PENDING" } immediately
        ↓
Frontend stores { jobId, departmentId, departmentName, chapterTitle, fileName,
createdAt } in localStorage (key: eduVideoJobs:<tenantId>) and starts polling
        ↓
Every 4s: GET /edu_video/status/{job_id} for every non-terminal tracked job
        ↓
On first sight of AWAITING_REVIEW → frontend automatically calls
POST /edu_video/jobs/{job_id}/submit (no user action)
        ↓
Poll continues through RENDERING → DONE (with output_path) or FAILED
        ↓
DONE + output_path → row shows "Published" + a Download link to
GET /edu_video/download/{job_id} (opens in a new tab)
        ↓
FAILED → row shows "Failed" + the backend's error message; no retry
endpoint exists, so the only action offered is "Remove" (local dismiss only)
```

## 7. Error Handling

| Trigger | Status | Detail | Frontend handling |
|---------|--------|--------|-------------------|
| Bad language value | 400 | `language must be 'tamil' or 'english'` | Won’t happen — frontend always sends `"english"` |
| Bad theme_id/design_id/avatar_id | 400 | `…must be one of […]` | Won’t happen — frontend never sends these |
| Unsupported file extension | 400 | `Unsupported file type '{ext}'. Supported: …` | Pre-validated client-side; still shown via toast if lists drift |
| Job not found | 404 | `Job not found` | Toast if a poll hits this |
| Submit when not AWAITING_REVIEW | 400 | `Job can only be submitted while awaiting review…` | Swallowed silently for auto-submit; other 400s still toasted |
| Video not finished (download too early) | 400 | `Video export not finished yet.` / `Video not ready…` | Download link only renders once `output_path` is present |

All error messages use `apiErrorMessage()` (`src/lib/api/superadmin/http.js`).

## 8. Polling / Status Updates

- Endpoint: `GET /edu_video/status/{job_id}`
- Interval: **4000 ms** (`POLL_INTERVAL_MS`) — frontend choice
- Stops when: job reaches terminal state — `FAILED`, or `DONE` with `output_path` set
- No WebSocket/SSE — polling only

## 9. Content Listing

The backend has no endpoint to list a college’s/user’s past uploads. Workaround: `localStorage` keyed by `eduVideoJobs:<tenantId>`.

**Known limitation:** a chapter uploaded from one browser/device will not appear on another, or after clearing site data. A real fix requires a backend list endpoint and/or wiring `edu_video_jobs` to departments/users. No backend change was made in this pass.

## 10. Field Dependencies

Only **Department** has a real backend table (`departmentsApi`). Program/Year/Semester/Subject were removed from the form rather than left as non-functional decoration. Department is local labeling only — never sent on upload.

---

## Frontend Changes

| File | Change | Reason |
|------|--------|--------|
| `CONTENT_VIDEO_GENERATION_BACKEND_INTEGRATION.md` | Added at repo root (this document). | Verified API contract SoT for agents and reviewers. |
| `src/lib/api/admin/eduVideo.js` | **Created / hardened.** `upload()`, `getStatus()`, `submit()`, `getDownloadUrl()`, `JOB_STATUS`, `SUPPORTED_EXTENSIONS`. Dedicated axios client via `getEduVideoOrigin()` (falls back to `:8000` when `getApiOrigin()` is empty for same-origin `/api/v1`). Does not force multipart `Content-Type` (browser sets boundary). | Connect to the real backend mount path without altering shared `api` axios; fix local uploads hitting Next `:3000`. |
| `src/app/admin/(portal)/content/page.jsx` | **Rewritten** from disabled scaffold. Wired: Department (`departmentsApi` + `QuirriSelect` with `e.target.value`), Chapter title (`QuirriControlledField` + `academicLabel`), drag-and-drop file zone, Upload & generate, `localStorage` job registry, 4s polling + auto-submit on `AWAITING_REVIEW`, Content Status table. Removed Program/Year/Semester/Subject and duplicate in-page section title (topbar `PAGE_META` owns title). Left HOD feedback panel as empty. | Replace static UI with the documented integration contract; fix QuirriSelect handlers. |
| `src/lib/admin/pageMeta.js` | Content subtitle updated (generation status, not HOD approvals). | Match live pipeline UX. |
| `next.config.js` | When `API_PROXY_TARGET` is set, also rewrite `/edu_video/:path*`. | Same-origin proxy setups can reach edu_video. |

No other files were modified for this feature. Reused: `apiErrorMessage` / `asList`, `departmentsApi`, `useAsyncResource`, `useAuth`, Quirri UI components.

**Not created:** no new Zod schema file. Chapter title uses catalog `FIELD_RULES.academicLabel` via `QuirriControlledField`; file checks are plain JS (`validateFile()`), same spirit as `BulkUploadModal.jsx`.

## Issues / Assumptions / Backend Dependencies

1. **No auth on `/edu_video/*` (§4)** — accepted for this phase; not production-safe.
2. **No list/history endpoint (§9)** — `localStorage` workaround; multi-device sync needs backend work.
3. **No delete/retry endpoint** — “Remove” clears local tracking only; server job/storage remain.
4. **`language` hardcoded to `"english"`** — required Form field with no UI in the product screenshot. Add a language control if Tamil chapters are needed.
5. **50 MB size cap is frontend-only** — backend enforces no size limit.
6. **Auto-submit skips plan review** — GET/PUT plan, scene preview, and audit remain available for a future review UI.
7. **Department is organizational only** — never sent to the backend; does not affect generation, routing, or storage.
8. **Same-origin `/api/v1` leaves `getApiOrigin()` empty** — `getEduVideoOrigin()` falls back to `http://localhost:8000` locally (and the test host `:8000`); HTTPS custom domains keep same-origin `/edu_video` (Nginx must proxy it). `next.config.js` also rewrites `/edu_video/:path*` when `API_PROXY_TARGET` is set.
9. **QuirriSelect** emits a synthetic event — handlers must use `e.target.value`, not a raw state setter (that bug made department selection look broken).
10. **Playwright (CA `college1@yopmail.com`)** — department select, status filter, and upload → `PENDING`/`SCRIPTING` + status row verified live.

## Testing

**Performed:**

- Manual contract check against `app/edu_video/routes.py` (upload/status/submit/download signatures and status enum).
- Lint check on the two new/changed frontend files.
- `npm run build` (see working tree after this pass).

**Not performed:**

- Full browser click-through against a live backend.
- Real `FAILED` job / oversized file / production CORS for bare `/edu_video` origin.
