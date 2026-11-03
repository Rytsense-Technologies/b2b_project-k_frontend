---
type: Flow
title: "Bulk student import (CSV)"
description: "College Admin uploads up to 100 students; every row is checked first, then only valid rows are created with activation invites."
tags: [flow, students, import]
status: stable
sources:
  - resource: "b2b_projectk/app/services/student_import.py"
  - resource: "b2b_projectk/app/api/v1/users.py"
  - resource: "src/components/admin/StudentBulkImport.jsx"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Steps
1. Download template - columns `first_name, last_name, email, department` (required) + `phone_number, program, semester` (optional). Header aliases accepted (e.g. "Mobile", "Programme", "Sem").
2. Browser parses the CSV (quoted fields OK) and posts rows to `POST /api/v1/users/bulk-import` with `dry_run=true` - nothing written.
3. Per-row errors, numbered by **spreadsheet line** (header = line 1): required fields, name characters, email format, duplicate in file, existing account, 10-digit Indian mobile (+91/0 stripped), department / programme / semester matched by name or code in the college, semester requires programme, seat cap.
4. "Add N students" posts again with `dry_run=false` - valid rows created ([account activation](/flows/account-activation.md)); invalid rows can be downloaded to fix.

# Limits
Max 100 rows, 512 KB file. Year of study is derived from the semester.
