# 33. Environment Configuration

**Status: Partial**

## Scope

Configuration names and where each must be set. **Setting names only; no values appear here.**

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Generated inventory of the backend Settings class compared with `.env.example`, test config, CI and the production `.env` written by `deploy.yml`.

## Results

136 backend settings; 52 are written by the deploy; 66 are missing from `.env.example`, including every `EMAIL_*`, `SMTP_*` and `SES_*` name (INT-004). Only `DATABASE_URL` has no default. Required everywhere: `LIVEKIT_API_SECRET`. Enforced outside local: `JWT_SECRET_KEY`, `AUTH_SECRET_KEY`. Effectively required for the API to import: `OPENAI_API_KEY` (INT-010). `ENVIRONMENT` defaults to development with a startup warning, so deploy must set `production`.

GitHub secrets the deploy expects: `EMAIL_PROVIDER`, `EMAIL_FROM`, `SES_REGION`, `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `BACKUP_S3_BUCKET`, `BACKUP_PASSPHRASE`, optionally `REDIS_PASSWORD`.

Other names to review: `DEBUG`, `INTERVIEWS_ENABLED`, `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `EMAIL_TEST_RECIPIENT` (needs a production guard, INFRA-029), `SARVAM_API_KEY`, `BACKUP_S3_ENDPOINT_URL`, `BACKUP_DOCKER_NETWORK`.

Frontend: `NEXT_PUBLIC_API_URL`, `API_PROXY_TARGET` (build-time rewrites), `NEXT_PUBLIC_EDU_VIDEO_ORIGIN`, `NEXT_PUBLIC_LIVEKIT_URL`, `NEXT_PUBLIC_DEV_BYPASS_AUTH` (must be unset in deploys), `NEXT_DIST_DIR`, and the unused `NEXT_PUBLIC_API_BASE_URL` build arg (INFRA-025). QA helpers read `QA_PASSWORD` from the environment.

## Findings

INT-004 (Blocked), INT-010 (Blocked), INFRA-004, INFRA-029 (Blocked).

## Remediation status

Add the missing names (no values) to `.env.example`; make the OpenAI client lazy or validate it with a clear message.

## Evidence

../evidence/integration/env_settings.md; env_settings.json

## Limits / not done

The live production `.env` was never inspected, so production configuration is NOT VERIFIED.
