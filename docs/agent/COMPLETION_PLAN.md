# Project K B2B — Completion Plan (SOW Phase 1)

**Contract:** `assets/ProjectK_B2B_SOW_v1.0.pdf`  
**Stack:** Next.js FE (`b2b_superAdmin_frontend`) · FastAPI BE (`b2b_projectk`) · PostgreSQL  
**Rule:** no mocks; empty/error until live; no B2C plans/billing; login UI frozen.

---

## 1. System architecture (target)

```
                    ┌─────────────────────────────┐
                    │  Next.js portals (:3000)    │
                    │  SA / CA / Faculty / Student│
                    └─────────────┬───────────────┘
                                  │ /api/v1 + /edu_video + /mcq + /voice_qna
                    ┌─────────────▼───────────────┐
                    │  FastAPI Project K (:8001)  │
                    │  Auth JWT cookies · RBAC    │
                    └───┬──────────┬──────────┬───┘
              PostgreSQL│     Redis│     LiveKit│
              (tenancy, │   (rate  │   (interview│
               users,   │   limits)│    + voice) │
               content, │          │             │
               MCQ,     │          │             │
               assign)  │          │             │
```

### Hierarchy (data)

`University → College (tenant) → Department → Program/Semester/Subject/Chapter`  
Users scoped by `tenant_id` (+ `department_id` for faculty/student).

### Role → home

| Role | Login | Home |
|------|-------|------|
| superadmin | `/auth/login` | `/superadmin/dashboard` |
| college_admin | same | `/admin/dashboard` |
| hod / faculty | same | `/faculty/dashboard` |
| student | same | `/student/home` |

---

## 2. Module status matrix

| Module | SOW | BE | FE | Stage |
|--------|-----|----|----|-------|
| Auth + activation | §8 | Live | Live | Done |
| Universities / Colleges / Depts | §6.2 | Live | Live | Done |
| Platform / college users | §5 | Live | Live | Done |
| Edu video upload → SME → publish | §6.1 | Live | Live (SA+CA+Fac) | Harden |
| MCQ gen / review / student attempt | §6.1.4 / 6.4.3 | Live | Live | Harden |
| Voice QnA | §6.4.2 | Live | Live (in subjects) | Harden |
| Student interview practice + report | §6.4.5 | Live | Live | Trim extras later |
| **Interview assignments** | §5.2 / 6.4.5 | Live | Live (CA/Fac/Student) | **Done** |
| **Leaderboard** | §6.4.4 | Live | Live | **Done** |
| Faculty students / subjects lists | §6.3 RBAC | Live | Live | **Done** |
| CA analytics / reports | §6.5.2 | Thin live | Live (dept scores) | **Done** |
| Notifications deliveries | §7 | Catalogue only | Live catalogue | E5 (ESP) |
| SA dashboard learning KPIs | §6.5.1 | Counts only | Live + empty KPIs | E5 |

---

## 3. Execution stages (login-wise)

### Stage A — Super Admin
Institutions → Users → Content → Reports/Health/Notifications → Settings.  
Work left: content tenant pin (done), health/report honesty (done).

### Stage B — College Admin
Structure → Content → Students/Staff → **Assignments** → Analytics/Reports.  
Work left: E1 assignments, E4 analytics from real aggregates.

### Stage C — HOD / Faculty
Video review → MCQ review → **Students/Subjects** → Assignments → Dept analytics.  
Work left: E3 lists, E1 assign (HOD), E4 dept metrics.

### Stage D — Student
Home → Subjects (video/QnA/MCQ) → **Leaderboard** → Interviews → Progress.  
Work left: E2 leaderboard.

### Stage E — Cross-cutting
Assignments notify students; activation email already DEBUG-printed.

---

## 4. Build order (this sprint)

1. **E1** Interview assignments — **done** (DB 0031 + `/api/v1/interview-assignments` + CA/Faculty/Student FE)
2. **E2** Leaderboard from `mcq_attempts` — **done** (`/api/v1/leaderboard`)
3. **E3** Faculty students + subjects — **done** (`/api/v1/faculty/students|subjects`)
4. **E4** CA/Faculty analytics thin slices — **done** (`/api/v1/analytics/college|department`)
5. Smoke all five logins — demo seeds: `xplain@yopmail.com`, `ca@demo.edu`, `hod@demo.edu`, `faculty@demo.edu`, `student@demo.edu` (password `<seed-password>`)

Remaining later: E5 notifications ESP + SA learning KPIs (honest empties already).
