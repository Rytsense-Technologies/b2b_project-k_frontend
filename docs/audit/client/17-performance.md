# 17. Performance

**Status: Partial**

## Scope

Single-user endpoint latency, query plans and in-process aggregate cost on a large data set.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Seeded set: 10 colleges, 50 departments, 30,000 students, 312,738 watch rows, 60,564 quiz attempts, 180,640 notifications. Baseline of 38 endpoints x 3 requests before and after fixes; EXPLAIN (ANALYZE, BUFFERS) of 10 slow queries; in-process profiling; 8 regression tests in `tests/perf/test_perf_read_paths.py` (2 failed before the fix, 8/8 after; with the read-model, migration and platform-limit tests 46/46).

## Results

| Measure | Before | After |
|---|---|---|
| Platform institution report, in process | 8.85 s | 3.37 s |
| Platform student report, in process | n/a | 3.93 s (4.69 s after the first fix) |
| College overview, one college | 2.01 s | 1.08 s |
| ORM attribute reads, institution report | 7,753,276 | 391,099 |
| Deleted-jobs subquery | 2.585 ms | 0.018 ms |
| HTTP, one user: dashboard (30 d) | 11.8 s | 6.6 s |
| HTTP, one user: institution report | 11.0 s | 9.8 s |
| HTTP, one user: student report | 11.2 s | 9.1 s |
| HTTP, one user: college analytics | 2.6 s | 2.0 s |

Dashboard statements are now constant (24) instead of 24 + 2 per active college. On the small QA data set of 3 Nov (20 concurrent, 5 routes, 3,418 requests, 0 errors) p95 was 0.37 to 1.23 s.

## Findings

PERF-001 (High), PERF-002, PERF-003, PERF-004, PERF-005 Fixed. PERF-006 (High, one worker cannot serve realistic load) Needs Business Decision. PERF-008 (unbounded responses) Needs Business Decision.

## Remediation status

Five code fixes with migration `0055_perf_read_indexes.py`. Capacity items need an owner decision (see 18 to 20).

## Evidence

../evidence/perf/results/baseline_before.json; baseline_after.json; explain_before.txt; explain_after.txt; fix_measurements.json; pytest_perf_final.log; ../evidence/perf/seed_counts.json

## Limits / not done

The host (16 cores) was shared with up to three other agents, so timings are indicative. The after-baseline overlapped a pytest run. A model declaration of `ix_edu_video_jobs_deleted` is still needed in `EduVideoJob.__table_args__` (not a PERF-owned file) or a future autogenerate would propose dropping the index. Frontend LCP: UX-017 (two pages miss 2.5 s) In Progress.
