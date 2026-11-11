# 20. Scalability

**Status: Partial**

## Scope

Effect of more API workers at a fixed 50 concurrent users.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

locust, 50 users, 1, 2 and 4 uvicorn workers with pool sizes chosen to stay under 100 Postgres connections.

## Results

| Workers (pool) | Requests | Errors | req/s | p50 | p95 | CPU avg | RSS max | Postgres conns |
|---|---|---|---|---|---|---|---|---|
| 1 (default) | 509 | 3.34% | 4.0 | 7.7 s | 29 s | 101% | 684 MB | 33 |
| 2 (5 + 5) | 1,348 | 0.0% | 10.8 | 2.2 s | 8.7 s | 196% | 1.1 GB | 35 |
| 4 (3 + 2) | 2,133 | 0.0% | 17.6 | 0.73 s | 6.0 s | 353% | 2.1 GB | 33 |

Throughput scales roughly linearly with workers (4.4x at 4 workers). Even with 4 workers p95 at 50 users (6.0 s) is above the 5 s criterion.

## Findings

PERF-006, PERF-007.

## Remediation status

Worker count and pool sizing are deployment decisions for the owner.

## Evidence

../evidence/perf/results/steps_w2.txt; steps_w4.txt; summary.json

## Limits / not done

Single host only; no horizontal multi-host or Postgres scaling test; 50 users is the only multi-worker level; the criterion was not retested at 100 users with 4 workers.
