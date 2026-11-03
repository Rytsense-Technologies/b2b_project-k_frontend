---
type: Access Rule
title: "Unique institution and academic codes"
description: "Human codes (not UUIDs) identify universities, colleges, and optionally departments / programmes / subjects."
tags: [rule, identity]
status: stable
sources:
  - resource: "src/lib/validation/fields.js"
  - resource: "src/lib/validation/schemas/universities.js"
  - resource: "src/lib/validation/schemas/colleges.js"
generated:
  by: cursor-agent
  at: "2026-11-02"
---
# Rule
`FIELD_RULES.code`: 2–32 characters, `A–Z 0–9 _ -`, stored uppercase. Used as the unique **code** on create.

| Record | Code | After create |
|---|---|---|
| University | next `UNI-####` (preview in form; create omits `code`, API allocates) | **immutable** (`AssignedCodeField` disabled) |
| College (`tenants.code`) | next `COL-####` | **immutable** |
| Department | next `DEP-####` | **immutable** |
| Programme | next `PRG-####` | **immutable** |
| Subject | next `SUB-####` | **immutable** |

Create UIs use `AssignedCodeField` + `src/lib/ids/uniqueSeries.js`. The API still accepts a blank/taken value and issues the next free series ID. Legacy free-text codes stay as stored; only new rows get series IDs.

A rare allocation failure is 409 ("could not allocate…"); otherwise unique conflicts on university/college codes are handled by allocation, not a typed-code fight.

People sign in with **email**, not a student/staff code. Do not invent a second ID scheme (roll number, employee ID, QR) unless the owner asks. Seat cap is not an ID.

# Related
[College provisioning](/flows/college-provisioning.md) · [Academic structure](/flows/academic-structure-setup.md)
