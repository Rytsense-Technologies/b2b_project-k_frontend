# 24. Monitoring & Reliability

**Status: Partial**

## Scope

Health checks, error capture, redaction and alerting.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

`test_int_monitoring.py` and the uptime workflow loop run locally against the rehearsal stack.

## Results

`/voice_qna/health` is public and checks the database; `/api/v1/health` and `/health/errors` need a session (401 anonymous, 403 College Admin, 200 Super Admin); error capture to `platform_error_events` works on real Postgres; redaction of e-mail, JWT, token and path passes; flood control stores at most 20 per minute for 60 identical errors; an unhandled exception gives a 500 with no internals and an error row. Uptime check: up, then with Postgres stopped health returned 503 and the check failed. Monitoring and backup files 10/10.

## Findings

INFRA-021 (error tracker vendor, owner decision). Gaps: no push alert from the app; health checks Postgres only (not Redis, LiveKit, the voice agent, SMTP/SES, S3, disk or the worker queue); no disk, memory or certificate-expiry alert; no alert on e-mail delivery failures or backup age; uptime interval 30 minutes. Docker does not restart an unhealthy container.

## Remediation status

Needs a tracker or pager decision; PRIV-001 redaction fix Fixed.

## Evidence

../evidence/integration/monitoring.md; uptime_local.log; monitoring_backup.junit.xml

## Limits / not done

The GitHub uptime workflow, deploy health gate and backup workflow have never run on GitHub. Production monitoring was not inspected.
