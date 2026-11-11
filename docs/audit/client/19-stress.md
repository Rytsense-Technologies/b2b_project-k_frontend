# 19. Stress

**Status: Partial**

## Scope

Where one worker breaks, how it fails and whether it recovers.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

locust slow ramp 1 to 40 users at 0.1 user/s for 7 minutes, plus the 50 and 100 user arrival steps from 18, then a recovery probe.

## Results

p95 stayed above 5 s from about 11 users. Errors above 1% were not reached on the slow ramp (0% at 40 users); they appeared at 50 users (3.3%) and 100 users (46.5%) with 5 users/s arrival. Failure mode: queued requests hold database connections, the SQLAlchemy pool (8 + 12) is exhausted, a 30 s timeout follows and the API answers HTTP 500 (67 in the 100-user step); failed sign-ins then cause 401 follow-ons. Memory stayed flat (maximum about 710 MB, no growth). Recovery: the first request under 500 ms returned 200 within 1 s after load stopped.

## Findings

PERF-006, PERF-007 (see 18).

## Remediation status

Needs the owner decision in 18.

## Evidence

../evidence/perf/results/stress_w1_breakpoint.json; recovery_after_stress_w1.json; recovery_after_u100.json

## Limits / not done

Spike and long soak tests were not run. One worker only. No failure injection (database or Redis loss) beyond the DB-stopped health check in 24.
