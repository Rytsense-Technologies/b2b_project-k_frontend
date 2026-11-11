# 18. Load

**Status: Complete**

## Scope

Mixed realistic read load against ONE API worker, increasing concurrent users.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

locust 2.32.4, 2 minutes per step, 10, 25, 50, 100 users, 30,000-student data set. Pass criterion set before the run: p95 at most 5 s and errors at most 1%.

## Results

| Users | Requests | Errors | req/s | p50 | p95 | p99 | CPU avg | Postgres conns |
|---|---|---|---|---|---|---|---|---|
| 10 | 408 | 0.0% | 3.4 | 0.5 s | 7.0 s | 11 s | 89% | 16 |
| 25 | 651 | 0.0% | 5.5 | 1.9 s | 13 s | 17 s | 98% | 28 |
| 50 | 509 | 3.34% | 4.0 | 7.7 s | 29 s | 34 s | 101% | 33 |
| 100 | 998 | 46.49% | 7.8 | 5.4 s | 34 s | 40 s | 95% | 39 |
| 50, before the PERF fixes | 525 | 12.0% | 4.1 | 5.3 s | 34 s | 40 s | 99% | 34 |

**The criterion was not met at any step** (p95 already 7 s at 10 users). The PERF fixes reduced errors at 50 users from 12.0% to 3.34% but not latency. Cause: CPU-bound aggregates inside async handlers saturate the single event loop (about one core).

## Findings

PERF-006 (High, Needs Business Decision): options are at least 4 workers per host (measured 4.0 to 17.6 req/s at 50 users), caching dashboard and report aggregates for about 60 s or reading the nightly `college_daily_usage` table, or moving aggregate CPU off the event loop. PERF-007 (Medium, Needs decision): default pools allow 40 connections per process, so 4 workers could open 160 against `max_connections=100`.

## Remediation status

Not changed; the owner must choose. Load steps were not re-run after any capacity change because none was made.

## Evidence

../evidence/perf/results/w1_u*_stats.csv; summary.json; steps_w1.txt

## Limits / not done

Shared host. Mixed read workload only; no write-heavy or upload load. Not run against the production topology.
