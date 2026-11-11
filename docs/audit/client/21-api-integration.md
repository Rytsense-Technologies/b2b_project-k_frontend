# 21. API & Integration

**Status: Partial**

## Scope

E-mail, object storage, LiveKit tokens, API contract and role smoke on local stand-ins. No paid or real third-party service was called.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Mailpit v1.27 (SMTP sink), moto 5.1.4 as the S3 stand-in (MinIO images could not be pulled), OpenAPI contract check, HTTP smoke on a real API process on :8400.

## Results

| Check | Result |
|---|---|
| SMTP, all 15 catalogue events, rules suppress, mandatory events cannot be switched off (`test_int_email_smtp.py`) | 22/22 |
| HTTP smoke, 5 role logins, reset mail per role, activation mail, unknown address (200, no mail) | 12/12 |
| S3 backend: upload, presigned GET, private ACL, delete, errors, asset copy and restore, 30-day purge (`test_int_s3_storage.py`) | 6/6 |
| LiveKit join-token grants and room scoping | 3 passed, 2 skipped (server checks) |
| Privacy, rules and SMTP after PRIV fix | 57/57 |
| API contract: 159 frontend calls vs 135 OpenAPI operations (tree without the stash) | 110 match, 0 live mismatches, 49 point at non-existent paths in unimported modules |
| Frontend image hygiene (`docker-image.int.test.mjs`) | 10/10 |

The 37 skipped tests in the final backend run are these stand-in tests; the containers were stopped for that run, and they were executed earlier by INT with the evidence above.

## Findings

INT-001 (Low, Needs decision), INT-002 (Low, Blocked: 49 dead client calls, payments and plans modules also contradict the no-plan lock), INT-004 (Low, Blocked: 66 settings missing from `.env.example`), INT-010 (Medium, Blocked: API fails at import with an empty OPENAI_API_KEY), INT-012 (Informational, environment).

## Remediation status

See register; INT-002 needs a re-check on the restored tree.

## Evidence

../evidence/integration/INT_SUMMARY.md; email_smtp.junit.xml; s3_storage.junit.xml; livekit_tokens.junit.xml; api_contract.json; smtp_http_smoke_8400.json

## Limits / not done

Not executed: LiveKit server-side room scoping (local container crash-looping), S3 signature enforcement (moto does not verify signatures), the voice agent in compose (no paid key), real SES or S3, the contract check on the restored frontend.
