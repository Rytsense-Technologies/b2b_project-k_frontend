# 32. Release Notes / Change Log

**Status: Complete**

## Scope

What changed between the Phase 1 audit baseline and 4 Nov 2026. Nothing is committed or released.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Compiled from the phase reports and OWNER_DECISIONS.md; not a tested artefact.

## Results

**Phase 2 (2 Nov):** public /uploads and /recordings mounts removed; refresh and access token types separated; refresh race fixed; resend-activation scoped; deactivated colleges blocked; production build fixed (Suspense); retry for failed videos; CI added; seed credentials moved to the environment. Behaviour changes: lockouts answer 401; password change ends the current session; reports and dashboard count active students only; unknown `range` gives 400; 37 unused frontend modules and plan state removed; muted grey token now #626D71.

**Phase 3 (3 Nov):** QA-001 dependencies patched and PyJWT adopted; APIX-001 request freeze fixed; voice routes check revoked sessions; NUL byte gives 422; taken codes shown honestly; 56 contrast defects fixed.

**Phase 4 and owner decisions (3 Nov):** SEC-001 and SEC-002 fixed; logout denylist; 1 MB JSON body limit; WebVTT captions with toggle; only a Super Admin may demote a College Admin; head of department must have role HOD; Super Admin promotion needs `tenant_id`; one published video per chapter; open change request blocks publish (409); taken code returns 409; per-college daily caps (429); deleted job files purged after 30 days; one active render per college; OTP routes removed; dead columns dropped (`users.plan`, `tenants.plan`); reset button text "Save password"; zod 4; orange kept as the brand colour and its 2.59:1 contrast accepted by the owner.

**Client package (4 Nov):** PERF-001 to 005 read-path fixes and migration 0055; PRIV-001 to 003 log redaction; INT-003, 007, 008, 009, 011 deploy and backup fixes; XB-001 to 007, 009 accessibility, date and UI fixes; frontend Phase 2 to 4 work restored from the stash with 12 conflicted files resolved.

## Findings

n/a

## Remediation status

n/a

## Evidence

../PHASE_1_COMPLETION_REPORT.md; ../PHASE_2_REMEDIATION_REPORT.md; ../PHASE_3_EXECUTION_REPORT.md; ../OWNER_DECISIONS.md; ../ISSUE_REGISTER.md

## Limits / not done

Uncommitted; no version number or tag. Items depend on a commit and deploy by the owner (TEST-005).
