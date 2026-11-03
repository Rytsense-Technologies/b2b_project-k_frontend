---
type: Flow
title: "University and college provisioning"
description: "Super Admin creates the institution tree a College Admin then runs."
tags: [flow, superadmin, colleges]
status: stable
sources:
  - resource: "src/app/superadmin/universities/page.jsx"
  - resource: "src/app/superadmin/colleges/page.jsx"
  - resource: "b2b_projectk/app/api/v1/universities.py"
generated:
  by: cursor-agent
  at: "2026-11-02"
---
# Steps
1. Super Admin creates a **university** (name + unique [code](/rules/unique-codes.md) + India location). Code does not change later.
2. Super Admin creates a **college** under that university: name, unique code (immutable), India location, **student seat cap** (not a plan). The API creates the college and its College Admin account(s) in one transaction and sends [activation](/flows/account-activation.md) mail.
3. College Admin signs in and builds [academic structure](/flows/academic-structure-setup.md): departments (+ HOD), programmes, semesters, subjects, chapters, staff ↔ subjects, students.
4. Super Admin can still see every college (Users, Academics, Content, Reports, Health). College Admin never sees another college ([tenant scope](/rules/tenant-scope.md)).

# Rules
Do not collect or display a licence / Standard / Premium plan. Seat cap is capacity. Country is always India.

# Related
[tenants](/tables/tenants.md) · [Super Admin](/roles/superadmin.md) · [College Admin](/roles/college-admin.md)
