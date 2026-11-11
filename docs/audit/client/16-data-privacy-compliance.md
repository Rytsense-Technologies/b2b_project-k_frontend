# 16. Data Privacy & Compliance (technical)

**Status: Partial**

## Scope

Technical half of DPDP Act 2023 readiness. Legal interpretation (who is the Data Fiduciary, s.7 legitimate use, s.16 transfer) is Blocked on the owner and counsel.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

97 privacy tests on real SQL (redaction, hashing, LLM prompts, exports, deactivation, retention, crisis), a code-derived data inventory, a DPDP gap list.

## Results

PRIV run: 95 passed, 2 failed. The 2 failures (e-mail address in logs, one-time links in debug logs) were PRIV-002 and PRIV-003, fixed by INT; afterwards privacy, notification and SMTP files ran 57/57 and unit notification and ops tests 34/34. Inventory: 27 tables hold personal data. DPDP duties assessed 14: implemented 0, partial 7, missing 6, not applicable 1. Processors: OpenAI (US), Google Gemini (US), Sarvam (IN), AWS S3 and SES ap-south-1, self-hosted LiveKit; no third-party analytics found. No date of birth is stored, so minors cannot be identified (s.9).

## Findings

PRIV-001 (High, Fixed: JWTs, bearer tokens, ?token= links and passwords were stored in the ops error log). PRIV-002, PRIV-003 (Fixed). PRIV-004 (High, Needs decision: no notice or consent, withdrawal, erasure, breach notification, guardian consent, grievance contact). PRIV-005 (Medium, Needs decision: no retention limit for audit logs, deliveries, tutor turns, watch and quiz data, deactivated accounts; report downloads not audit-logged).

## Remediation status

Technical fixes done; consent and erasure work follows an owner and legal decision.

## Evidence

../evidence/privacy/DATA_INVENTORY.md; ../evidence/privacy/DPDP_GAP_LIST.md; ../evidence/privacy/pytest_privacy_final.log; ../evidence/integration/notif_priv_email.junit.xml

## Limits / not done

Blocked: legal interpretation, vendor-side retention (OpenAI, Gemini, Sarvam, S3 lifecycle), live LiveKit and Sarvam traffic capture (no paid calls). pytest_privacy_final.log still shows 95/97; the green re-run is in the INT file set.
