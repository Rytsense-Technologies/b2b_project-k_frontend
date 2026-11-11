# DAST summary - Quirri B2B (6 Nov 2026)

Owner-authorised, local only. API 127.0.0.1:8501 (FastAPI, throwaway DB quirri_secb_dast_test, every paid provider key a dummy, EMAIL_PROVIDER=log). Frontend: `next start -p 3501`, built into `.next-sec` with API_PROXY_TARGET=http://127.0.0.1:8501. ZAP ran in Docker inside WSL and reached the Windows frontend at the WSL gateway 172.18.64.1:3501 (WSL is in NAT mode and cannot reach Windows localhost). Users: 5 roles in 2 colleges, seeded into the test DB. The password and tokens stayed in the scratchpad state/ only. This folder was grep-checked: it holds no token, password or secret.

## Tools
| Tool | Version |
|---|---|
| OWASP ZAP | docker zaproxy/zap-stable: zap-api-scan.py, zap-baseline.py, zap-full-scan.py (+ ajax spider) |
| Schemathesis | 4.33.1 (venv ~/secvenv2, Python 3.14) |
| Probes | tooling/hdr.py (headers/CORS/exposure), tooling/prod.py (ENVIRONMENT=production), tooling/replay.py (5xx replay) |

## Coverage
- OpenAPI: 138 operations / 115 paths. /api/openapi.json is served in development only. With ENVIRONMENT=production, /api/openapi.json, /api/docs, /docs, /redoc and /openapi.json all return 404 (checks/production-mode*.).
- Schemathesis, each role (superadmin, college_admin, hod, faculty, student): 128 operations, i.e. all except the 10 /auth/* session operations, which ran unauthenticated ("anon"). Phases: examples, coverage, fuzzing, stateful. --mode all. Checks: not_a_server_error, status_code_conformance, content_type_conformance, response_schema_conformance. Cases: 84,704 before; 107,565 after; 9,205 in the targeted final pass (the 13 operations that had failed).
- ZAP API active: OpenAPI import (163 URLs) x 5 roles, each with its own session cookie (ZAP_AUTH_HEADER). A hook blocks logout and change-password, because logout bumps token_version and revokes the scan's own session.
- ZAP frontend active: zap-full-scan with the ajax spider, signed in as College Admin and as Student.
- ZAP passive baselines of the API (OpenAPI, -S) and the frontend, before and after the fixes.

## ZAP alert counts by risk
| Scan | Before | After |
|---|---|---|
| API baseline (passive) | Low 2, Info 5 | Low 0, Info 5 |
| FE baseline (passive) | Medium 3, Low 3, Info 4 | Medium 3, Low 2, Info 4 |
| API active, superadmin | - | High 1 (FP), Low 2, Info 5 |
| API active, college_admin / hod | - | Low 2, Info 5 |
| API active, faculty / student | - | Low 1, Info 5 / 4 |
| FE active, college_admin | Medium 4, Low 5, Info 8 (run 1, partly signed out) | High 1 (FP), Medium 5, Low 4, Info 9 |
| FE active, student | run 1 aborted | High 2 (FP), Medium 4, Low 4, Info 10 |

Two kinds of API Low remain in the active scans. The first is CORP same-site, which ZAP counts as invalid. It was changed to same-origin afterwards, and the after-baseline no longer shows it. The second is "Unexpected Content-Type" on the CSV exports (SECB-007). Every High is a verified false positive.

Schemathesis server errors (ST101): before, 21 failing cases across the 5 roles, with 152 HTTP 5xx in the API log (148 x 503 + 4 x 500). After: 0 ST101 and 0 HTTP 5xx across about 117k cases. Of the replayed 5xx GETs, 79 had answered 503; for every role they now give 422 or 403.

## Findings
| ID | Sev | Where | Genuine? | Status | Fix / files | Verifying test |
|---|---|---|---|---|---|---|
| SECB-001 (=INFRA-009) | Medium | All API responses | Genuine: no nosniff, framing, CSP, referrer, CORP/COOP or HSTS; signed-in JSON could be cached | Fixed | New app/security_headers.py (pure ASGI), registered in app/main.py after CORS. SECURITY_HEADERS_ENABLED and SECURITY_HSTS_SECONDS in app/config.py. HSTS only outside local/dev/test. no-store on signed-in requests unless the route sets its own | tests/test_security_headers.py; ZAP API baseline Low 2 -> 0; prod HSTS present |
| SECB-002 | Low | server: uvicorn (also through the Next proxy) | Genuine | Fixed | --no-server-header in Dockerfile and docker-compose.deploy.yml | test_uvicorn_does_not_announce_itself_in_the_deployed_commands; live: header gone |
| SECB-003 | Low | FE: no Cross-Origin-Opener-Policy | Genuine | Fixed | next.config.js COOP same-origin | scripts/infra.test.mjs; FE baseline alert gone |
| SECB-004 | Medium | Unbounded page/offset on colleges, departments, universities, audit-logs, notifications inbox/mine/deliveries, faculty/students, edu_video/jobs, pending-changes | Genuine: int64 overflow returned 503 "service unavailable" and was recorded as a DB outage on the Super Admin health page, so any signed-in user could flood it | Fixed | app/db_input_errors.py and the SQLAlchemyError handler in app/main.py return 422 (documented shape). A real outage still gets 503 | tests/test_db_invalid_input.py; replay: 79 x 503 -> 0 |
| SECB-005 | Medium | NUL byte in text: 503 via asyncpg (PATCH /auth/me and others); 500 via a psycopg2 ValueError (GET /edu_video/jobs?status=%00) | Genuine | Fixed | Same module, plus a narrow ValueError handler in app/main.py: only psycopg2's NUL ValueError becomes 422; any other ValueError is re-raised | test_a_nul_byte_on_the_sync_driver_is_a_422_too; targeted schemathesis: 0 ST101 |
| SECB-006 | Low | GET /voice_qna/conversations?offset=2^63 returned a bare 500 | Genuine | Fixed | app/voice_qna/api/simple.py: offset le=1_000_000 | test_voice_history_offset_past_int64_is_a_422_not_a_500 |
| SECB-007 | Info | Contract: string 422 detail (array documented), CSV exports documented as JSON, undocumented 401/403/404/409 | Genuine, not security | Open (needs decision) | Document or normalise | schemathesis ST103/105/108 |
| SECB-008 | Low | POST /api/v1/setup/superadmin was mounted in production; a malformed body got 422, which leaked that the route exists | Genuine (creation was still refused) | Fixed | app/main.py mounts it only with ENABLE_BOOTSTRAP in a local environment | test_the_dev_bootstrap_route_is_not_mounted_unless_switched_on; prod probe |
| SECB-009 | Medium | FE CSP: script/style 'unsafe-inline', broad https:/wss: sources | Genuine weakening, by design | Open (needs decision) | Nonce-based CSP; pin the S3 and LiveKit hosts | FE baseline |
| SECB-010 | Low | FE: no CORP; COEP absent | CORP minor; COEP accepted (it would break S3 media) | Open | Optional CORP same-origin in next.config.js | FE baseline |
| SECB-011 | Info | sessionStorage pk_user (the user's own profile); pk_* routing cookies without HttpOnly | Accepted: no tokens; auth cookies are HttpOnly + SameSite=Strict (+ Secure in prod) | Accepted | - | ZAP FE |
| SECB-012 | Info | Prerendered portal shells served with s-maxage=31536000 | Shell only, no user data | Accepted (note) | Mark portal routes private if a CDN is added | header check |

## False positives (each one replayed to confirm)
- SQL Injection (High), POST /voice_qna/conversation job_id: the parameter is a typed UUID, so anything else gets 422. The difference ZAP saw was the 20/min limiter answering 429.
- Path Traversal / Source Code Disclosure (High), PATCH /auth/me phone_number and /analytics/college range: only the validation messages differ (an invalid range gives 400). No file content came back.
- Bypassing 403 (Medium), /%2e/api/v1/...: same status and body as the normal path.
- Absence of Anti-CSRF Tokens on the forgot-password form: JSON API, SameSite=Strict cookies, explicit CORS allowlist.
- Sensitive info in URL (user_id): a UUID filter. Unexpected Content-Type: intended CSV downloads.

## Header, CORS, cookie and error checks (checks/)
- API: CSP default-src 'none'; frame-ancestors 'none'. Also nosniff, DENY, Referrer-Policy no-referrer, Permissions-Policy, COOP and CORP same-origin, no server header, no-store on signed-in responses. In prod: HSTS max-age=31536000; includeSubDomains.
- FE: CSP, HSTS, nosniff, DENY, Referrer-Policy, Permissions-Policy, COOP; no x-powered-by.
- CORS: hostile and null Origins get no ACAO, and a hostile preflight gets 400. ACAC without ACAO is Starlette behaviour and harmless.
- Prod cookies: access and refresh are HttpOnly, Secure and SameSite=Strict; refresh is path-scoped. No stack traces in error bodies. TRACE gives 405.

## Limits
- In the first pass the ZAP ajax spider clicked "Sign out" and revoked the CA and Student sessions. That also cut the before-pass college_admin schemathesis run short. A hook now rewrites logout and change-password, and everything was rerun. One /auth/logout/ trailing-slash request still got through during the API scans, so one role's API active scan may be partly unauthenticated.
- Running two ZAP containers at once ran out of memory (11 GB WSL); the FE active scans were rerun one at a time.
