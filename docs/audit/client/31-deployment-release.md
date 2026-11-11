# 31. Deployment & Release

**Status: Partial**

## Scope

Local rehearsal of the real `docker-compose.deploy.yml` in the workflow's step order. **No production deploy was done.**

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Data stores, pre-deploy backup, migrations through `compose run backend alembic upgrade head`, `up -d`, then role smoke (login, `/auth/me`, one API call and one portal page for 5 roles), with test secrets and ENVIRONMENT=production.

## Results

Backend image 3.41 GB (810 s), runs as uid 10001 with no .env inside. Frontend image 1.25 GB (918 s), build context 28.4 MB, runs as `node`; it was built from the tree without the stash, so it is not the code to ship. Run 2: stores ready 8 s, migrations 9 s, backend healthy 39 s after up, frontend ready 5 s, about 3 min end to end; roles 5/5; teardown 5 s. Idle memory: backend 312 MiB, Postgres 50, frontend 96, LiveKit 16, Redis 4. Run 1 stopped on INT-011 (first-deploy backup, Fixed) and INT-010 (empty OPENAI_API_KEY crash, Blocked). The committed lock failed to install (INT-008, now Fixed: yarl 1.25.1).

## Findings

INT-007 (Medium, Fixed: image carried .env, builds and docs; ran as root), INT-008, INT-009, INT-011 Fixed; INT-010 Blocked; TEST-005, INFRA-012 (frontend image, In Progress).

## Remediation status

Before the first deploy: nginx proxies to 127.0.0.1:8100 and :3100; uvicorn trusts the proxy (`--forwarded-allow-ips`); migrations 0046 to 0055 run with VALIDATE CONSTRAINT for 0048; backups scheduled; `DATABASE_URL` set (required); commit and push, enable branch protection after the first green CI.

## Evidence

../evidence/integration/deploy_rehearsal.log; deploy_rehearsal_run1_failed.log; role_smoke.json; uptime_local.log

## Limits / not done

Backend image not rebuilt with the final lock and .dockerignore; frontend image not rebuilt from the restored code; voice agent not run (no paid key); production deploy, TLS, nginx and rollback not exercised; GitHub workflows never run.
