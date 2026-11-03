---
type: Flow
title: "Academic structure setup"
description: "University > College > Department > Programme > Semester > Subject > Chapter; semesters are generated from programme duration."
tags: [flow, academics, structure]
status: stable
sources:
  - resource: "b2b_projectk/app/api/v1/academics.py"
  - resource: "b2b_projectk/app/models/academic.py"
  - resource: "src/components/shared/AcademicStructureWorkspace.jsx"
generated:
  by: claude-opus-5-5/okf-builder
  at: "2026-10-14T12:00:00+05:30"
---
# Steps
1. Super Admin: university -> college (with College Admin accounts, seat cap, unique [codes](/rules/unique-codes.md)). [Provisioning](/flows/college-provisioning.md).
2. College Admin: departments + HOD ([departments](/tables/departments.md)).
3. Programme under a department: `duration_years` x `semesters_per_year` generates Semester 1..N ([programs](/tables/programs.md), [semesters](/tables/semesters.md)). Resizing adds missing semesters or deactivates surplus ones without subjects.
4. Subjects per semester ([subjects](/tables/subjects.md)); ordered chapters per subject ([chapters](/tables/chapters.md)).
5. Assign faculty to subjects ([subject_staff](/tables/subject-staff.md)); place students in programme + semester.
6. Link uploaded content to chapters ([content review loop](/flows/content-review-loop.md)).

# Rules
No hard delete - `is_active` archives. Write: Super Admin, College Admin (own college), HOD (own department); Faculty read-only. Department archive is blocked (409) while it has students unless `force=true` (audited).
