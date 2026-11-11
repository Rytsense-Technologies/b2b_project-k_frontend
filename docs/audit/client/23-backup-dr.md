# 23. Backup & DR

**Status: Partial**

## Scope

Backup, off-host copy and restore of the database, rehearsed locally.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

`dr_rehearsal.sh`: backup.sh, restore_drill.sh and backup_offsite.sh on a pgvector pg15 container with 50,028 rows (31 MB), off-host copy to the S3 stand-in, then the container and volume were destroyed and the local dump deleted, followed by a restore from the off-host copy. Plus backup-script tests.

## Results

Backup 1.8 s (1.57 MB dump); restore drill 6.2 s; encrypted off-site copy 3.0 s; **RTO 39 s** (destroy to verified) at this size; **RPO up to 24 h** (one scheduled run, plus a pre-deploy dump). All 45 tables matched on count and md5. Truncated, byte-flipped, random and empty dumps are all rejected by the drill. Backup script tests: monitoring and backup 10/10; first-deploy test file 4 passed, 3 skipped (the corrupt-dump cases need the container that was gone).

## Findings

INT-011 (High, Fixed: backup.sh failed on a never-migrated first-deploy database), INT-003 (Low, Fixed: off-site script could only reach AWS S3).

## Remediation status

Fixed and re-tested.

## Evidence

../evidence/integration/dr_run.log; deploy_rehearsal.log; monitoring_backup.junit.xml

## Limits / not done

Not rehearsed: the media volume backup (tar of xplains-media), a restore on the production host, S3 lifecycle and retention of the real off-site bucket, backup-age alerting. Production backups were not verified.
