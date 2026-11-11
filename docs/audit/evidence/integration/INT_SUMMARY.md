# INT - integrations, backup/DR, monitoring, deployment rehearsal, environment (4 Nov 2026)

Backend `ed34cc5` (dirty), frontend `590536a` (dirty). Local stand-ins only: Mailpit v1.27 (SMTP :1025, API :8025),
moto server 5.1.4 as the S3 stand-in on :9000 (MinIO images are no longer pullable: `minio/minio` "pull access denied",
quay.io 401), pgvector/pgvector:pg15 for DR, amazon/aws-cli:2.22.35 as in the workflow. No paid call, no real SES/S3,
no LiveKit Cloud. Machine-readable result: scratchpad `p5/INT.json`.

## 1. Integrations

### E-mail (SMTP sink)
- `tests/integration/test_int_email_smtp.py` - **22/22**: every one of the 15 catalogue events reaches the sink with
  the right recipient (exactly one `To`, no QA redirect, no `[QA` subject), subject, Quirri template (tagline + inline
  logo) and CTA link (`http://localhost:3400/...`), and a `sent`/`smtp` delivery row. 11 events are triggered through
  their real API route (user create, forgot/change password, deactivate, department HOD, staff subjects, user edit,
  send-to-HOD, publish) - the rest through the entry point the worker/route calls (pipeline finished, request
  changes, MCQ generated, approve, submit) because the route needs a paid LLM/render or a full plan body.
- Rules suppress: platform (Super Admin), college (College Admin), department (HOD) and personal (student) switches
  each produce `skipped` + nothing in the sink; a mandatory event cannot be switched off (422) and still sends.
- HTTP smoke on a real API process on **:8400** (`EMAIL_PROVIDER=smtp`): `smtp_http_smoke_8400.json` **12/12**
  (5 role logins, reset mail per role, activation mail from a College Admin create, unknown address -> 200 and no mail).
- After the PRIV-002/003 fix: privacy + notification rules + SMTP files **57/57**; unit notification/ops **34/34**.

### S3 (`test_int_s3_storage.py`, 6/6)
Upload (`videos/<job>/final.mp4`), SigV4 presigned GET (1 h) returns the bytes, private ACL, delete (idempotent),
missing bucket / missing file -> `StorageError`, asset copy + restore of documents and image folders, refusal of
paths outside `media/`, and the deleted-job purge: jobs deleted > 30 days lose video, captions, source images and
document; a document still used by a live job is kept; recent and live jobs untouched; second pass is a no-op.
**Not covered:** signature enforcement (tampered expiry -> 403) - moto does not verify signatures.

### LiveKit (`test_int_livekit_tokens.py`, 3 passed, 2 skipped)
Join token: `roomJoin` for exactly `qna-<session>`, identity = user, no roomAdmin/roomCreate/roomList/roomRecord/agent,
3 h TTL, HS256 with the configured key; distinct rooms per session; another secret fails verification.
The 2 server checks skipped: the existing `b2b_projectk-livekit-1` container crash-loops since the WSL restart
("one of key-file or keys must be provided") - environment, not changed by INT.

### API contract (`api_contract.json`, `api_contract_check.mjs`) - frontend side read from the tree without stash@{0}
159 API calls in `src/` checked against the live OpenAPI (135 operations): **110 match** (path, method, required JSON
fields of inline bodies; the 2 multi-line `mcq.js` calls verified by hand), **0 live mismatches**. 49 calls target
paths that do not exist, all in modules nothing imports (admin analytics/reports/students, dashboard, faculty
content/students, jobs, payments, plans, profile, OTP modal, `reportsApi.generate`) -> INT-002.

## 2. Backup and disaster recovery (`dr_run.log`, `dr_rehearsal.sh`)
quirri_int_test in a pgvector pg15 container: migrations to head (0055), seed, +50,000 delivery rows (45 tables,
50,028 rows, 31 MB). `backup.sh` 1.8 s (1.57 MB dump) -> `restore_drill.sh` 6.2 s -> `backup_offsite.sh` (AES-256
openssl, aws-cli image) to the S3 stand-in 3.0 s -> **container and volume destroyed, local dump deleted** -> fetch
from the off-host copy, decrypt (sha256 identical), new container, documented restore commands -> every table's row
count and md5 checksum identical. **RTO 39 s** at this size (destroy -> verified). **RPO: up to 24 h** (one scheduled
run at 20:30 UTC; deploys add a pre-deploy dump) plus the run time; media tarball not rehearsed.
Corrupt dumps (truncated, byte-flipped, random, empty) are all rejected by the drill and the scratch DB is dropped.

## 3. Monitoring - see `monitoring.md`

## 4. Deployment rehearsal (`deploy_rehearsal.log`, `deploy_rehearsal_run1_failed.log`, `role_smoke.json`)
The real `docker-compose.deploy.yml` in the workflow's step order (data stores -> pre-deploy backup -> migrations via
`compose run backend alembic upgrade head` -> `up -d`), project `int-xplains`, generated test secrets, ENVIRONMENT=production.

| Item | Result |
|---|---|
| Backend image | **3.41 GB**, 810 s (`--network host`, legacy builder: buildx missing; apt layer cached from an earlier attempt). Runs as uid 10001, no `.env` inside |
| Backend image, as committed | **fails**: `requirements.lock.txt` pins `yarl==1.24.5` but `aiohttp==3.14.4` needs `yarl>=1.25.1` (INT-008). Rehearsal image built with a temporary Dockerfile copy that pins yarl 1.25.1 in the build only |
| Frontend image | **1.25 GB**, 918 s, context 28.4 MB after the `.dockerignore` fix, runs as `node`. **Built from the tree without stash@{0}** (about 150 Phase 2-4 files missing), so it is not the code to ship |
| npm (INFRA-012) | `npm ci --fetch-timeout=600000 --fetch-retries=5` - passed first time. Docker bridge downloads measured ~7x slower than host networking on this machine (51 s vs 7.6 s for two wheels) |
| Run 1 | stopped twice: pre-deploy `backup.sh` exit 1 on the empty first-deploy database (INT-011, fixed), and the backend crash-loops at import with an empty `OPENAI_API_KEY` (INT-010) |
| Run 2 | stores ready 8 s, empty pre-deploy backup kept, migrations 0053->0055 in 9 s, backend healthy 39 s after `up`, frontend ready 5 s, ~3 min end to end incl. seeding |
| Roles | 5/5: login 200 (Secure cookies), `/auth/me` role correct, one role API 200, portal page 200 (`role_smoke.json`) |
| Voice agent | restarts by design without `SARVAM_API_KEY` (no paid key used) - not rehearsed |
| Memory at idle | backend 312 MiB, postgres 50 MiB, frontend 96 MiB, livekit 16 MiB, redis 4 MiB |
| Teardown | `down -v` 5 s; containers, volumes, temp tags and rehearsal images removed |
| Uptime check locally | `/auth/login` and `/voice_qna/health` up; with Postgres stopped health returns 503 and the check fails (`uptime_local.log`) |


## 5. Environment configuration (`env_settings.md`, `env_settings.json`; names only)
136 Settings fields: type, required, default (secret-like shown only as empty/placeholder), and presence in the local
`.env` (keys only), `.env.example`, tests/conftest.py, CI and the production `.env` written by deploy.yml (52 names),
plus production validators. Only `DATABASE_URL` has no default; `LIVEKIT_API_SECRET` is required everywhere;
`JWT_SECRET_KEY` / `AUTH_SECRET_KEY` are enforced outside local; `OPENAI_API_KEY` is effectively required for the API
to import (INT-010) although its default is empty. 66 settings are missing from `.env.example`, including every
`EMAIL_*`, `SMTP_*` and `SES_*` (INT-004). Frontend: `NEXT_PUBLIC_API_URL`, `API_PROXY_TARGET` (build-time rewrites),
`NEXT_PUBLIC_EDU_VIDEO_ORIGIN`, `NEXT_PUBLIC_LIVEKIT_URL`, `NEXT_PUBLIC_DEV_BYPASS_AUTH` (must be unset in deploys),
`NEXT_DIST_DIR`, and the unused `NEXT_PUBLIC_API_BASE_URL` build arg (INFRA-025).

