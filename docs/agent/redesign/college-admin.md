# College Admin portal: redesign audit (14 Oct 2026)

Read-only audit for `REDESIGN_PLAN.md` Phase 1. Scope: `/admin/*`, `src/components/admin/**` and the shared workspaces the portal mounts.
Live check: college1@yopmail.com (VISTAS: 3 departments, 1 student, 2 staff, 5 chapter jobs). Non-GET requests were blocked.
Screenshots: `.playwright-mcp/audit-ca-1440-<page>.png` and `audit-ca-390-<page>.png` (dashboard, departments, programmes, content, mcq, students, staff, interviews, analytics, reports, notifications, settings). The 390 shots use isMobile. No page has horizontal overflow at 390, but some inner elements do (see below).

Data source used for every visual proposal: `GET /analytics/college?range&department` → `app/services/college_insights.py::college_overview`. It returns:
`totals{students, pending_students, faculty, departments, watch_minutes, completion, chapters_completed, chapters_available, qa, assessments, interviews, avg_score, pass_rate}`,
`departments[]{department_id, department, students, …metrics, attempts, pass_rate, final_year_students, interview_ready_pct}`,
`subjects[]{subject_id, subject, code, department, published_chapters, learners, completion, attempts, avg_score, pass_rate}`,
`students[]{id, student, email, department, …metrics}`, `at_risk[]{…row, reasons[]}`,
`score_distribution[]{band: 0-39|40-59|60-74|75-89|90-100, students}`, `qa_demand[]{subject, total, questions[]{question, count, chapter}}`,
`interview_cohort[]{…, year_of_study, final_year, sessions, best_score, last_score, readiness, weak_area, last_at, status}`,
`review_queue{awaiting_you, awaiting_hod, ready_to_send, items[]}`, `active_assignments`.
**No time series anywhere.** Every `TrendChart` below therefore needs a backend field (see the "needs backend" list).

---

## 0. Portal-wide problems (fix once, applies to every module)

| # | Problem | Where |
|---|---|---|
| G1 | **Template sameness.** Every module is the same stack: topbar title + subtitle, then a teal `ModuleBanner` repeating the same title and a longer version of the subtitle, then 4 KPI tiles, then a teal filter bar, then one table. Title appears twice on 9 of 12 pages (e.g. "Analytics"/"Analytics", "Reports"/"Reports", "MCQ review"/"MCQ review"). | `ModuleBanner` in InsightsView.jsx:133, students/page.jsx:474, staff/page.jsx:438, notifications/page.jsx:94, EduVideoContentStudio.jsx:727, McqReviewWorkspace.jsx:166, InterviewAssignmentsWorkspace.jsx:162, ReportsWorkspace.jsx:196, AcademicStructureWorkspace.jsx:736 |
| G2 | **Two colours only.** All data uses teal or the orange "low" pill: score distribution bars are all teal (`.ad-dist-bar`), completion meters are all green, avg-score pills are teal or orange, department/subject lists have no categorical coding. | InsightsView.jsx:233-246, insights.jsx `Meter` |
| G3 | **Inconsistent header pattern.** Departments has no banner and uses `usePageHeader` actions (departments/page.jsx:88). Programmes puts `StructureTabs` *above* a banner. Every other page has the banner. Departments is the closest to a real product; use it as the module baseline. | structure/departments/page.jsx:111, structure/programmes/page.jsx:23 |
| G4 | **Banner and KPI take the first screen at 390.** Students at 390: the banner (with 2 stacked CTAs) plus 4 KPI tiles fill about 1,200 px before the first row. Reports: banner + 3 stacked buttons + 3 "echo" KPIs fill about 1,600 px. | audit-ca-390-students.png, audit-ca-390-reports.png |
| G5 | **Sidebar hides links at 900 px height.** `.sidebar nav` scrolls inside itself (scrollHeight 752 vs clientHeight 638). "Notifications" (top 803) and "Settings" (top 851) sit under the user card, and the "ACCOUNT" label is cut by the divider. | CollegeAdminSidebar.jsx, audit-ca-1440-dashboard.png |
| G6 | **Filter-echo KPIs** that carry no information: Reports "Rows in preview / Report type / Date range" (ReportsWorkspace.jsx:225-231). Others are filler: MCQ "Departments: with rendered chapters" (McqReviewWorkspace.jsx:161) and Notifications "Log-only". | |
| G7 | **Score colours do not follow the new bands.** `ScoreCell` and `sp-pill--teal` show "21% avg" as teal on the dashboard (dashboard/page.jsx:209). Use `BandPill` / `bandFor` everywhere (≥80 green, 60–79 blue, <60 orange, none grey). | |
| G8 | **Backend bands ≠ design bands.** `SCORE_BANDS` = 0-39/40-59/60-74/75-89/90-100 (college_insights.py:35), but design bands cut at 60/80, so `Distribution` cannot colour 60-74/75-89 by band honestly. Either colour the 5 buckets with an ordered ramp (focus, focus, ok, ok, strong). That is wrong at 75-79. **Recommended: needs backend field `score_bands{strong, on_track, needs_focus, no_data}`** (a 3-line Counter in `college_overview`), and keep the 5-bucket histogram as a `ColumnChart`. | |
| G9 | Tabs are not linkable: in-page state (`cohortTab`, `statusFilter`, `listStatus`) is `useState`, not `?tab=`. Use `useTabParam` for every module tab and `ModuleTabs` for route sub-pages. | |

Target shell for every module (replaces G1):
**Topbar title + one-line subtitle + the ONE orange action on the right** (as on Departments) → optional `ModuleTabs` / `TabNav` → a compact white filter row, or the teal toolbar when the page is mainly a list → the content.
Drop the teal `ModuleBanner` on list modules. Keep one teal hero only on the Dashboard (`PortalHero`) and solid teal side panels where they carry content.
KPI rows only where the numbers are not repeated in the content below. Use at most 4 per row and 2 columns at 390.

---

## 1. Dashboard `/admin/dashboard`

**Purpose (SOW §6.5.2, §5.2):** a college-level overview: completion by department, score distribution with pass/fail, Q&A, interview cohort readiness, plus the work waiting for the admin (review queue).

**Current problems**
- The hero side panel "Getting started" is static copy shown forever, even once the structure exists (dashboard/page.jsx:99-113). It takes 360 px of prime space.
- KPIs mix sources: "Students" counts *all* directory users (`usersApi.getUsers` limit 8, :45), while Analytics "Active students" counts active only. The numbers disagree once there are pending invites. "Watch time 0m" says nothing on its own.
- None of the SOW §6.5.2 dashboard items appear: no completion by department, no score distribution, no pass rate and no interview readiness. They live only on Analytics.
- "Department activity" is a text list packed into one `<small>` line (`1 student · 0m watched · 2 Q&A · 9 interviews`, :205-207). The avg pill is teal (G7).
- "Recently added students" is the same table as Students. It is low value.
- Two extra `getUsers` calls; `analyticsApi.college` already returns `totals.students/pending_students/faculty`.
- 390: about 1,930 px tall. Hero copy plus 2 side items push the KPIs below the fold.

**Target structure (one page, no tabs)**
1. `PortalHero`: greeting + the one orange action "Add students" + white "Upload a chapter". The side panel becomes **"Needs your attention"**, built from live data: `review_queue.awaiting_you`, `ready_to_send`, departments without HOD, `totals.pending_students`, `at_risk.length`. Each row links to its module; hide a row at 0.
2. KPI row (from `/analytics/college?range=last_30_days`): Active students (sub: `pending_students` to activate) · Chapter completion % (`completion`, sub `chapters_completed of chapters_available`) · Average score with `BandPill` (sub: pass rate %) · Interview ready (`ready` final-years / `final_year_students` summed from `departments[]`).
3. Two columns:
   - **Completion by department**: `BarList` colorBy `series` (`departments[].completion`, sub = students). Each row links to `/admin/analytics?tab=departments&department=id`.
   - **Score bands**: `DonutChart` of student bands (needs G8 field; fallback is `Distribution` of `score_distribution`) + a pass/fail line from `totals.pass_rate`.
4. Two columns: **Content review queue** (keep, but give pill colours by stage: awaiting_you = orange status pill, with HOD = grey, ready = teal) · **Students who need attention**: top 5 `at_risk`, reasons as orange pills, link to Analytics › Students.
5. Remove "Recently added students".

Filter: none (fixed last 30 days, stated in the subtitle). Range lives in Analytics.

**Functional gaps:** the "Getting started" panel is never dismissed or updated. KPI "Faculty & HOD" falls back to a faculty-only count when the overview fails (:128).

---

## 2. Academic structure `/admin/structure/*`

**Purpose (SOW §5.2, §6.3):** create and manage Department › Programme › Semester › Subject › Chapter, assign the HOD, and assign staff to subjects.

**Current problems**
- Two route tabs (`StructureTabs.jsx`) render in different places: below the topbar on Departments, but above a full banner on Programmes (programmes/page.jsx:29 + AcademicStructureWorkspace.jsx:736). This is the G3 jump.
- Departments list: the `HierarchyStrip` (College › **Department** › …) is decoration that repeats the tabs. The KPIs "With an HOD / Without an HOD" are computed from the loaded page only (`rows`, departments/page.jsx:84-85). This is fine at PAGE_SIZE 100, but it is not a college total.
- Programmes: **semester chips overflow**. With 8 semesters, "Semester 5" is clipped under "+ Add semester" and semesters 6–8 can't be seen (`.sa-acad-sem`, flagged at 1440 and 390; audit-ca-1440-programmes.png). At 390 the `tab active` overflows too.
- Programmes KPIs (Programmes / Semesters / Subjects / Chapters) come from `/academics/summary` and are useful, but they sit under a banner that repeats the subtitle.
- Department detail `[id]` (RecordHero + TabNav Overview / People) is the strongest page in the portal. Keep it.

**Target structure:** route `ModuleTabs`: **Departments** | **Programmes & subjects**, under the topbar, with no banner.
- Departments tab: keep the table. Drop `HierarchyStrip`. Add an **HOD** filter (All / With HOD / Without HOD; client side, all rows loaded). KPIs: Departments · Without HOD (orange value when > 0) · Students placed. Add a "Students" `BarList` (series colours) only on the department detail Overview, if anywhere.
- Programmes tab: keep the master/detail. Replace the semester chip row with a **scrollable segmented list or `QuirriSelect` at ≤ 6 semesters visible**, keeping "Add semester" outside the scroller. KPIs from `/academics/summary`: Programmes · Subjects · Chapters · **Chapters with content** as "x of y" with a `ScoreMeter`-style bar (`chapters_with_content / chapters`).
- Filters: Search, Department (`department_id`), Active/All (existing).

**Functional gaps:** no bulk "assign students to programme/semester" path from here (see Students).

---

## 3. Upload & content `/admin/content` (EduVideoContentStudio.jsx)

**Purpose (SOW §6.1.1–6.1.3, §6.3):** upload raw content (PDF / DOCX / PPTX / TXT / question banks) tagged to a chapter, trigger AI video generation, review the plan and slides, send to the HOD for approval, act on change requests.

**Current problems**
- One 1,980 px page (3,930 px at 390) does three jobs: the upload form, a 5-stage status table and the "HOD feedback — needs your action" panel buried at the bottom (after the list).
- The "How generation works" teal side panel stretches to the form height and leaves about 250 px of empty teal (`.ad-upload-grid`, audit-ca-1440-content.png).
- The banner has a 5-step pipeline chip row plus the side panel's 3 steps. That is the same explanation twice.
- The table has 3 columns (Chapter / Status / Actions) with a large empty middle. Each row shows 5 actions (Preview, sparkle, tree, History, delete) where the icon-only ones need hover tips. A failed row shows the error text inline and breaks row height.
- Jobs are loaded once with `pageSize: 100` and no pager (:266). KPIs and filters only cover the first 100 jobs. The backend `/edu_video/jobs` supports `page`, `status`, `department_id`, `q` (app/edu_video/routes.py:649) but none are used server-side.
- No **department** filter, only a programme filter built from loaded rows (:985-999). The search placeholder is truncated at 1440 ("Search chapter, file").
- Copy drift: the status label "Awaiting HOD & Faculty approval" (:127) and the banner say "HOD and faculty". Role doc and dashboard say "send to HOD".
- 390: the status `SegTabs` (`.sp-tab` ×6) overflow the toolbar.

**Target structure:** `useTabParam` tabs:
- **Chapters** (default): KPIs Generating · Ready to send · With HOD · Published (from status counts). Filters: Search (`q`), Department (`department_id`), Programme, Status `SegTabs` (All / Generating / Ready / With HOD / Published / Failed). Server-side paging. Table columns: Chapter (title + file), Department › Subject, Status pill + stage age, Updated, Actions (Preview + overflow menu for Edit slides / Link chapter / History / Delete).
- **Upload**: the form full width with a slim 3-step inline stepper. Drop the teal side panel.
- **Change requests** (badge count = `pendingFromJobs.length`): the current "HOD feedback" panel.
- Optional visual on the Chapters tab: `Distribution` of jobs by stage, using categorical colours (series, not status colours) above the table. Use it only if it does not duplicate the KPIs. Otherwise skip it (keep it simple).

**Functional gaps:** the 100-job cap; no department filter; failed-job retry only says "Try uploading again later" (no re-run action).

---

## 4. MCQ review `/admin/mcq` (McqReviewWorkspace.jsx)

**Purpose (SOW §6.1.4, §6.3):** review and approve AI-generated MCQs per chapter before students see them; generate when missing.

**Current problems**
- An N+1 load: `eduVideoApi.listJobs({pageSize:100})` then one `mcqApi.getOrNull` per job (:64, :102). It is capped at 100 chapters.
- The "Departments" KPI is filler (G6). The right pane shows a large "Select a chapter" placeholder with a decorative illustration (about 180 px of nothing).
- No department / subject filter. The list cards repeat "Video published" on every row.
- Status words collide with Content ("Awaiting approval" means two different things on the two pages).

**Target structure:** master/detail kept. Filters: Search, Department, Status `SegTabs` (Needs questions / Awaiting approval / Approved) with counts. KPIs: 3 (drop Departments). Default selection = the first "Awaiting approval" chapter, not an empty placeholder. In the detail: a question-count header and, after approval, a small `BarList` of question difficulty or topic **only if mcq returns it** (needs backend check; not in college_insights).

**Functional gaps:** the 100-chapter cap; N+1 requests (needs backend: `mcq_state` on `/edu_video/jobs` rows).

---

## 5. Students `/admin/students`

**Purpose (SOW §6.3, §5.2):** single add, bulk CSV import (≤100), activation via email, assign programme + semester, deactivate or reactivate.

**Current problems**
- Banner + 4 KPIs + toolbar before the table (G1, G4). At 390 the table starts at about 1,200 px.
- **No department / programme / semester filter.** Backend `/users` supports `department_id` (users.py:177), but `usersApi.getUsers` drops it (src/lib/api/superadmin/users.js:10-38). Programme / semester / year filters need backend params.
- Pending invites are mixed into the directory. Revoke is reachable only from the drawer (students/page.jsx:619). Resend is an icon with a hover-only tip (:440).
- No bulk placement: programme and semester can only be set one student at a time (drawer › placement modal), but SOW §6.3 "Assign students to programs and semesters" is a cohort job. Backend `POST /users/bulk-promote-year` (users.py:617) exists and is **unused by the frontend**.
- The KPIs need 3 extra count requests (:369-373). This is acceptable, but the first KPI repeats the panel subtitle "1 student".

**Target structure:** `useTabParam` tabs:
- **All students** (default): filters Search · Department (`department_id`, default All) · Programme · Semester (needs backend `program_id`, `semester_id` query on `/users`) · Status `SegTabs` (Active / Deactivated; pending moves to its own tab). Table: Student · Department · Programme › Semester · Year · Status · Last active · View. Row checkbox + bulk bar "Set programme & semester" / "Promote year" (bulk-promote-year).
- **Pending invites** (badge = pending count): Name, email, invited on, channel / delivery status (join `/notifications/deliveries?q=email`), Resend + Revoke as labelled buttons.
- **Bulk import**: StudentBulkImport moved from a modal to a tab page (template, upload, row results, "download rows to fix").
- Orange action: "Add student". No banner. KPIs: Active · Pending invites · Deactivated (3; "Students" total moves into the tab label count).

**Functional gaps:** the department filter is not wired; no bulk placement. Activation is email only.

---

## 6. Staff & HOD `/admin/staff`

**Purpose (SOW §5.2, §6.3):** add faculty / HOD, place them in a department, assign subjects (`subject_staff`), and enforce the Faculty vs HOD scope.

**Current problems**
- Loads two lists of **max 50** each (faculty + hod) with no pager (staff/page.jsx:299-324). Staff 51+ silently disappear. The backend accepts `role=hod,faculty` in one paginated call (users.py:176).
- KPI counts are computed from the *filtered* rows, so searching changes "HOD / Faculty" totals (:337-341).
- Banner chips read "HOD · Faculty · Students" (decoration, not filters). The role filter is client side only.
- No department filter (backend supports `department_id`). There is no view of "subjects without a teacher", which is the useful staffing question.

**Target structure:** tabs **Staff** | **Subject coverage**.
- Staff: one paginated `/users?role=hod,faculty` call. Filters: Search · Role (All / HOD / Faculty) · Department · Status. Table as now, with Subjects as chips, coloured by categorical series per subject only if the subject count is small; else plain.
- Subject coverage: from `GET /academics/staff-subjects` (academics.py:850). Per department, a `BarList` "subjects with a teacher" (series colour per department) + a list of subjects with no staff (orange "Not assigned" text).
- KPIs: HOD · Faculty · Pending activation · Subjects without a teacher (orange value when > 0).

**Functional gaps:** the 50 cap; KPI drift under filters.

---

## 7. Interview assignments `/admin/interviews`

**Purpose (SOW §6.3, §6.4.5, §6.5.2):** create and assign interview sessions to cohorts; track completion, readiness, weak areas and at-risk flags.

**Current problems**
- `InterviewCohortPanel` (all-time) duplicates the "Interview readiness" panel in Analytics (last 30 days) with the **same table and a different range**, so numbers can differ between pages.
- KPIs from `/interview-assignments/summary` (Final-year / Active / Completed / Still to complete) all read 0 while the cohort table shows a practising Year 1 student. The two sections answer different questions with no explanation.
- The empty state "No active assignments" uses a dashed grey box with a second "New assignment" button (two adds in view, G1 orange rule OK, but redundant).
- No department / mode filter on assignments; the list is not paginated in the UI.

**Target structure:** tabs **Assignments** | **Cohort readiness**.
- Assignments: SegTabs Active / Closed; filters Department, Mode. Table: Assignment · Cohort (dept · year / final-year) · Mode · Due · Completion (`ScoreMeter`-style completed / eligible; **needs backend field per assignment `eligible`, `completed`**, because summary only gives totals).
- Cohort readiness (moved here from Analytics; Analytics links to it): filters Department, Status (Not started / Practising / Ready), Final-year only toggle (default on). Visuals:
  - `Distribution` of cohort status (not started grey · practising blue · ready green).
  - **Weak areas**: `BarList` (series colours) counting `interview_cohort[].weak_area` client-side (labels come from `CATEGORY_FIELDS`).
  - Readiness table: Student · Dept · Mocks · Best (`BandPill`) · Latest (`BandPill`) · **Readiness** (`readiness`, returned but never shown today) · Work on · Last mock · At-risk flag (needs backend: interview-specific at-risk flag; `at_risk` today mixes learning reasons).

**Functional gaps:** `readiness` is computed but not displayed; per-assignment completion is missing; there is no interview at-risk flag (SOW §6.5.2).

---

## 8. Analytics `/admin/analytics` (InsightsView.jsx)

**Purpose (SOW §6.5.2):** completion by department / subject / student; score distribution with pass/fail; Q&A top 10 per subject; interview cohort analytics.

**Current problems**
- One 2,250 px scroll (4,330 px at 390) of 8 stacked panels: department table, distribution, at-risk, subjects table, Q&A, interview table, student table. There is no navigation inside it.
- All-teal distribution bars (`.ad-dist-bar`, :241), all-green completion meters, and teal / orange score pills (G2, G7).
- A "Download reports" glass button in the banner plus an "Export" link in the student panel: two exits to the same page.
- Pass/fail is only a KPI sub-line (`pass_rate`); there is no pass vs fail visual. `departments[].pass_rate` and `subjects[].pass_rate` are returned; subjects' `pass_rate` is **not shown** at all.
- The Q&A subject `QuirriSelect` sits in the panel header and wraps at 390. The empty-state copy is 4 lines.
- The department filter state is lost on reload (not in URL).

**Target structure:** filters in one row above the tabs, kept in URL: **Range** (default last 30 days) · **Department** (default All). `useTabParam` tabs:
1. **Overview**: KPIs (Active students · Completion · Avg score + `BandPill` · Pass rate). `DonutChart` score bands (G8) + `ColumnChart` of the 5 `score_distribution` buckets. Pass vs fail `Distribution` (pass = green, fail = orange) from `totals.pass_rate`. Top 5 at-risk list. **Trend** (watch minutes / Q&A / attempts per week) → *needs backend `timeline[]`*.
2. **Departments**: `BarList` completion (series colour per department) + `BarList` avg score (colorBy `band`) side by side, then the existing table with `BandPill` for avg and pass rate.
3. **Subjects**: Department filter applies; `BarList` completion per subject (series) + table adding **Pass rate**; row click → Q&A tab filtered to that subject.
4. **Q&A demand**: subject select (left list on desktop, select on 390) + `RankList` of top 10 questions (rank colours 1 orange, 2 blue, 3 purple), `count` as value, `chapter` as sub. `BarList` of `qa_demand[].total` per subject.
5. **Students**: search + band filter (Strong / On track / Needs focus / No data, client side) + "At risk only" toggle. `RankList` top 10 by `avg_score` and the full paginated table (`BandPill`, completion `ScoreMeter`).
- Interview readiness moves to Interviews › Cohort readiness (keep one summary card on Overview linking there).

**Functional gaps:** subject `pass_rate` is unused; there is no trend; no URL state.

---

## 9. Reports `/admin/reports` (ReportsWorkspace.jsx)

**Purpose (SOW §5.2, §6.3, §6.5.2):** view and download student-level and cohort-level reports (CSV / Excel / PDF).

**Current problems**
- Three KPIs only echo the filters (G6). The banner holds 3 export buttons (Excel, PDF, orange CSV), which stack to 3 full-width buttons at 390.
- The report type is a dropdown inside the teal filter bar, but it is the main choice of the page.
- 390: the preview table (`sp-table un-table sa-table-tight`) overflows horizontally (only "Watch tim…" visible). The topbar title is indented about 55 px vs other pages (audit-ca-390-reports.png).
- No programme / semester cohort filter (backend `/reports/preview` has `department`, `range`, `search` only; reports.py:503).
- No single-student report download (a "student-level report" in the SOW reads as one student's report). The student drawer in Students has no "Download report".

**Target structure:** report type as `useTabParam` tabs (**Students · Departments · Q&A · Interviews · College summary**). Filters: Search · Department · Range. Export group at the panel header right: "Download" orange split button (CSV) + Excel / PDF as outline. Remove the KPIs, and show "n rows · page x of y" in the panel header. 390: stacked rows (`ad-stack`) like other tables.

**Functional gaps:** no per-student report (needs backend `GET /reports/student/{id}` or `report_type=student&student_id`); no cohort (programme / semester) filter (needs backend params).

---

## 10. Notifications `/admin/notifications`

**Purpose (SOW §7):** see activation invites and system alerts sent to the college, with delivery status; retry failures.

**Current problems**
- The banner's only action is a disabled "Retry failed emails" (grey on teal) whenever nothing failed, so the page's primary action is dead most of the time.
- KPIs Delivered / Failed / Log-only plus a notice that repeats "Log-only" (G6).
- Message cells repeat the title in the subtitle ("Assessment available" / "Assessment available: ACCCC").
- Backend supports `event`, `channel` and `days` (notifications.py:86) but the UI fixes `days: 90` and has no event or channel filter.

**Target structure:** no banner. Filters: Search · Event type (Activation / Chapter published / Assessment available / Interview assignment / Changes requested, from rows) · Status · Range (7/30/90 days). Email only. "Retry failed" appears in the toolbar only when `summary.failed > 0`. Optional `BarList` of messages by event (series colours) above the table, only if useful; otherwise skip it.

**Functional gaps:** event filters exist on the live page; WhatsApp is not a product channel (owner Oct 2026).

---

## 11. Settings `/admin/settings` (AccountSettings.jsx)

**Purpose:** own account (name, password change via reset, sign-out). It has no SOW analytics duty.
**Current:** the shared settings page works at 1440 and 390. No module-specific issues found. Only G5 applies (the link is hidden in the sidebar at 900 px height).
**Target:** unchanged; follow the §4b settings recipe.

---

## Prioritised build list

**P1: product feel + correctness (do first)**
1. Shell: drop `ModuleBanner` on list modules, use the topbar title + one orange action (G1/G3). Fix the sidebar overflow so Notifications / Settings are visible (G5).
2. Analytics → 5 `useTabParam` tabs with Range / Department in URL, categorical `BarList` / `RankList` / `Distribution` / `DonutChart`, `BandPill` everywhere (G2/G7). Add the subject pass rate.
3. Dashboard: a live "Needs your attention" side panel, completion-by-department `BarList`, score-band visual, and drop "Recently added students".
4. Students: tabs (All / Pending invites / Bulk import), a wired **department filter** (pass `department_id` through `usersApi.getUsers`).
5. Staff: one paginated `role=hod,faculty` call (fixes the 50 cap) and stable KPIs.
6. Programmes: fix semester chip overflow.
7. Content: tabs (Chapters / Upload / Change requests), server-side paging + department filter, fix the "HOD and faculty" copy.

**P2: completeness**
8. Interviews: tabs (Assignments / Cohort readiness), move readiness out of Analytics, show the `readiness` column, `BarList` of weak areas, cohort status `Distribution`.
9. Reports: type as tabs, drop echo KPIs, export group in the panel header, stacked rows at 390.
10. MCQ: drop the Departments KPI, add a department filter, default-select the first awaiting item.
11. Notifications: event / channel / range filters, conditional Retry.
12. Students: bulk "Set programme & semester" / "Promote year" (uses the existing `POST /users/bulk-promote-year`).

**P3: needs backend first**
13. `score_bands{strong,on_track,needs_focus,no_data}` in `college_overview` (G8).
14. `timeline[]` (weekly watch_minutes, qa, attempts, interviews) for `TrendChart` on Analytics Overview.
15. `/users` filters `program_id`, `semester_id`, `year_of_study`.
16. Per-assignment `eligible` / `completed` on `/interview-assignments`, plus an interview-specific at-risk flag.
17. Per-student report download (`/reports/...student_id`) and programme / semester filters on `/reports/preview`.
18. `mcq_state` on `/edu_video/jobs` rows (removes the MCQ N+1).

## Out of SOW scope (do not build)
- Leaderboard / ranking views of students for the College Admin (SOW §6.4.4 is a student-facing leaderboard). A `RankList` of top performers inside Analytics › Students is fine as data, but not a "leaderboard" module. **OUT OF SCOPE**
- A platform-health or uptime view for the College Admin (§6.2 is Super Admin only). **OUT OF SCOPE**
- A college-level email-provider settings UI (Super Admin connects email). WhatsApp is not a product channel. **OUT OF SCOPE**
- Editing notification templates, or custom alert rules. **OUT OF SCOPE**
- Any plan / licence / seat-usage UI (forbidden by `quirri-no-plans.mdc`). **OUT OF SCOPE**
- Cross-college comparison or benchmarks (tenant isolation, SOW §8). **OUT OF SCOPE**
