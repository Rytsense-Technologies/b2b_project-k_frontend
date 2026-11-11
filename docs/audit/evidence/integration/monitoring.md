# Monitoring and alerting (INT, 4 Nov 2026)

## What was exercised

| Check | How | Result |
|---|---|---|
| `/voice_qna/health` is public and checks the database | pytest `test_int_monitoring.py` + curl on the rehearsal stack | 200 |
| `/api/v1/health`, `/api/v1/health/errors` need a session and Super Admin | pytest (401 anonymous, 403 College Admin, 200 Super Admin) | pass |
| Error capture: `ops_monitor.record_error` -> queue -> `platform_error_events` -> `/health/errors` | pytest, real Postgres | pass |
| Redaction of e-mail, JWT, token, path | pytest (`test_int_monitoring.py`, PRIV's `test_privacy_redaction.py`, unit `test_ops_monitor_redaction.py`) | pass |
| Flood control: 60 identical errors in one minute store `FLOOD_PER_MINUTE` (20) | pytest | pass |
| Unhandled exception -> 500 with no internals in the body, plus an error row | pytest (temporary route) | pass |
| Uptime workflow check (`.github/workflows/uptime.yml` loop) run locally against the rehearsal stack | see `deploy_rehearsal.log` / `uptime_local.log` | see log |
| E-mail sender log lines no longer carry the address (PRIV-002) or one-time links (PRIV-003) | pytest | pass |

## Alerting that exists

1. **GitHub Actions uptime check** (`uptime.yml`): every 30 minutes, from GitHub-hosted runners (outside the box),
   `curl -sf --retry 2` on `https://xplains.quirri.ai/auth/login` and `/voice_qna/health`. A failed scheduled run
   e-mails whoever last edited the schedule. Not run on GitHub yet (INFRA-021).
2. **Deploy health gate** (`deploy.yml`): waits up to 120 s for `/voice_qna/health`, otherwise fails the run (and the
   workflow rolls back when a previous image exists).
3. **Backup workflow failure** (`backup.yml`): a dump that does not restore in the drill fails the job -> GitHub e-mail.
4. **Container healthchecks** (`docker-compose.deploy.yml`): backend `/voice_qna/health`, agent `:8082/`; Docker restarts
   on exit (`restart: unless-stopped`) but an *unhealthy* container is not restarted or reported by Docker itself.
5. **In-app Platform health page** (Super Admin): uptime % from one check a minute, API p95, error log with redaction and
   flood control, schema/migration head check. Pull only: nobody is told.

## What is missing

- No push alert from the app (no Sentry/Slack/pager/e-mail on error spikes); the in-app monitor dies with the API or DB.
- `/voice_qna/health` checks Postgres only: Redis, LiveKit, the voice agent, SMTP/SES, S3, disk and the video worker
  queue are not probed by anything external.
- No disk-space, memory or Postgres size alert on the single host (volumes for DB and media live there).
- No alert on e-mail delivery failures (`notification_deliveries.status = failed` is visible in-app only).
- No certificate-expiry check; no alert on backup age (only on a failed run - a workflow that stops being scheduled is silent).
- Uptime check interval 30 min -> detection delay up to ~30 min + retries.
- Decision needed (INFRA-021): which tracker/pager.
