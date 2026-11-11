# 22. Database Integrity

**Status: Partial**

## Scope

Schema, migrations, constraints and data consistency.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

Migrations built from zero on every throwaway database (head 0055), real-SQL tests, `test_coverage_migrations.py`, EXPLAIN checks, the DR round trip with per-table row counts and md5 checksums, Phase 1 read-only SQL review.

## Results

Migration to head took 9 s in the rehearsal. After the DR restore all 45 tables (50,028 rows) matched on count and md5. One quiz attempt per student is enforced by a database constraint. Phase 1 found no schema drift against the models, no duplicate e-mails and no SQL injection. New: 0053 unpublished one duplicate published video (one published video per chapter); dead columns dropped (DATA-030); partial index on deleted jobs (0055).

## Findings

Needs attention at deploy: migration 0048 constraints are NOT VALID, so run VALIDATE CONSTRAINT per environment; 0049 skips a unique index where duplicates exist. `alembic check` is not a gate (about 60 indexes and constraints differ from the models). DATA-003 (Windows Postgres service still installed) is the owner's to stop.

## Remediation status

Fixes recorded in the register; deploy-time steps are in 31.

## Evidence

../evidence/integration/dr_run.log; dr_fingerprint_before.txt; dr_fingerprint_after.txt; ../evidence/perf/results/explain_after.txt; ../PHASE_2_REMEDIATION_REPORT.md

## Limits / not done

No production database inspected. Media files are not covered by the database checks. Concurrency races at scale (seat cap, double submit) were tested only on small data.
