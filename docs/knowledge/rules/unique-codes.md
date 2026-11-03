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
| University | optional (blank gets the next `UNI-` code), unique case-insensitive | **immutable** (shown disabled) |
| College (`tenants.code`) | optional (blank gets the next `COL-` code), unique case-insensitive | **immutable** |
| Department / programme / subject | optional | editable |

A typed code already in use is refused with 409 ("The code X is already in use…"); the form shows it under the Code field. It is never silently swapped.

People sign in with **email**, not a student/staff code. Do not invent a second ID scheme (roll number, employee ID, QR) unless the owner asks. Seat cap is not an ID.

# Related
[College provisioning](/flows/college-provisioning.md) · [Academic structure](/flows/academic-structure-setup.md)
