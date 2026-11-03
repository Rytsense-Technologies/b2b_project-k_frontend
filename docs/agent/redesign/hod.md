# HOD portal — redesign audit (`/faculty/*` as HOD)

Audited 14 Oct 2026 · read-only · login `hod@yopmail.com` (VISTAS › Computer Science) · live data is thin
(1 subject, 1 chapter linked, 3 published videos, 1 student, 2 staff, 0 assignments), so judge density by
structure, not by row count. Screenshots: `.playwright-mcp/audit-hod-<page>-1440.png` / `-390.png`.

Inputs: SOW §5.2, §6.1.3–6.1.4, §6.3, §6.4.5, §6.5.2, §7 · `REDESIGN_PLAN.md` · design-system §0/§0b/§2b/§4/§4b ·
`knowledge/roles/hod.md`, `rules/staff-scope.md`, `flows/content-review-loop.md` · backend
`api/v1/faculty_directory.py`, `api/v1/analytics.py` + `services/college_insights.py`, `edu_video/routes.py`,
`schemas/interview_assignment.py`.

---

## 0. Cross-cutting problems (fix once, in the layout / kit)

| # | Problem | Where |
|---|---|---|
| X1 | **Two headers on every page.** Topbar `h1` + subtitle (`layout.jsx:53-56`, from `lib/faculty/pageMeta.js`) and then a teal `ModuleBanner` with the *same* title and a longer lede. This is the biggest "template" smell. At 390 the first data panel starts at y=534 (Notifications) … 998 (Reports); banner alone is 248–440 px. | `layout.jsx:53`, every `ModuleBanner` |
| X2 | **Identical skeleton on all 11 pages:** banner → 3–4 white KPI cards → full-width teal filter band → panel. No page has its own shape, so nothing reads as a product. | all pages |
| X3 | **Colour without meaning, data without colour.** KPI icon tiles rotate blue/green/orange/purple purely decoratively (`.sp-kpi` icons), while the actual data (score distribution, completion meters, readiness) is all one teal (`InsightsView.jsx:233-247`, `Meter`). Invert this: neutral/teal KPI tiles, categorical colour on data. | `KpiRow`, `insights.jsx` `Meter` |
| X4 | **Teal filter band for 1 control.** Analytics has a full teal `FilterBar` holding one select + Refresh (`InsightsView.jsx:155`); Staff/Subjects/Notifications hold only a search box. Use the light toolbar (`.toolbar.is-light`) inside the panel head when there are ≤2 controls. | `FilterBar` usages |
| X5 | **"Department" column shown to an HOD** who only has one department: Analytics performance table (1 row), Subjects table, Interview readiness, Student performance, Cohort results. Pure noise. | `InsightsView.jsx:191-230, 283-320, 356-418, 420-470`; `InterviewCohortPanel.jsx` |
| X6 | Tabs are local state (`useState('all')`) — not linkable, back button loses them. Move to `useTabParam`. | videos:132, `McqReviewWorkspace.jsx:60`, `InterviewCohortPanel`, `InsightsView` |
| X7 | Score bands disagree: data-viz `BANDS` = ≥80 / 60–79 / <60; backend `SCORE_BANDS` = 0-39/40-59/60-74/75-89/90-100 (`college_insights.py:35`). Use `bandFor()` on `students[].avg_score` client-side everywhere; stop rendering backend bins. | analytics |
| X8 | 1440: content column stops at ~1100 px leaving a dead right gutter on the dashboard and lists; use the full `.content` width (max ~1280) consistently. | `.fa-page` |

**Target shell (all HOD pages):** keep the topbar title as the only page title; drop `ModuleBanner` from list
pages (keep one teal hero on Dashboard only, like the Student portal). Module tabs sit directly under the
topbar (`TabNav`, `?tab=`), then a compact KPI strip (≤4, teal icons, orange value only when it needs focus),
then the panel with an in-panel light toolbar. One orange action per view.

---

## 1. Dashboard `/faculty/dashboard`

**Purpose (SOW §5.2, §6.3, §6.5.2):** one look at what is waiting for the HOD (videos, MCQs) and how the department is doing.

**Current problems**
- Hero + "Your scope" side panel is 2 paragraphs of prose about permissions (`dashboard/page.jsx:27-54`); an HOD doesn't need it every visit.
- Two orange-ish CTAs fight: "Review MCQs" orange in hero + Review videos white; fine, but the queue below is usually empty → page is 70% chrome.
- "Shortcuts" panel (`:114-134`) duplicates the sidebar — generic template filler.
- No department health at all, although `/analytics/department` returns totals, at-risk, subjects, cohort.
- Empty queue state is a tiny grey line inside a big panel (`.ad-empty`).

**Target structure** (no tabs)
1. Slim teal hero: "Good morning, {name}" · Computer Science · one orange CTA = the next item in the queue ("Review next chapter") or none when empty. Drop the scope side panel (scope sentence moves to a one-line caption for Faculty only).
2. KPI strip (from `/faculty/overview` + `/analytics/department?range=last_30_days`): Videos to review (orange value if >0) · MCQ sets to approve (orange if >0) · Chapter completion % (`totals.completion`) · Average score % (`totals.avg_score`, `BandPill`).
3. Two columns: **Waiting for you** (queue rows, video/MCQ type dot, age "3 days") | **Students who need attention** (`at_risk[]` top 5, reason chips, link to Analytics › Students).
4. Row: **Subjects at a glance** `BarList` of `subjects[].completion`, one `--cat-n` per subject · **Interview readiness** `Distribution` of `interview_cohort[].status` (not started grey / practising blue / ready green).
- Remove Shortcuts.

**Functional gaps:** queue is capped at 8 (`faculty_directory.py` `queue[:8]`) with no "see all" link; "since" shows date not age.

---

## 2. Video review `/faculty/videos`

**Purpose (SOW §6.1.3, §6.3 "Review and approve pre-recorded AI video modules"):** preview, edit slides, request changes or publish each chapter sent by the College Admin.

**Current problems**
- Banner + flow chips (`videos/page.jsx:285-300`) repeat the topbar; flow chips are decoration.
- "Changes requested" is mixed into "Awaiting your review" with only a teal pill (`:388-390`) — the reviewer can't see what is back with the College Admin vs. what needs them now. The flow doc defines 3 reviewer states; UI shows 2.
- `SegTabs` "All / Awaiting / In progress / Published" stacks up to three panels on "All" — long scroll and three empty states (screenshot: "Nothing to review" + Published).
- Copy bug: Published panel sub says "Live for students in this college" (HOD scope = department).
- Rows show raw source filenames (`03_dc_motors_combined.pdf`) as primary meta; subject/programme is secondary or "Not linked to a subject yet".
- Loads `pageSize: 100` once (`:141`) with client filters — departments with >100 jobs silently truncate; no pager.
- Department `QuirriSelect` only for multi-dept (`:324`) — never shown to HOD (ok), but code path remains.
- 390: row actions (Preview + 2 icon buttons + Publish) wrap under the title; OK but the Publish button drops below the fold of each row.

**Target structure** — route-free tabs (`?tab=`):
- **Needs review** (default) — `sent_to_hod_at && !published_at && !changes_requested_at`. Row: chapter title · subject › programme · sent date + age · actions Preview · Edit slides · History · **Publish** (teal solid; the one orange is "Review next" in the page head).
- **Changes requested** — `changes_requested_at` set: show `change_note`, requested by/at, "Waiting for College Admin to regenerate". Read-only + History.
- **Published** — `published_at`: published date, Preview, Download, History; pager.
- **In preparation** (secondary, count only) — generating / done-not-sent; muted rows, no actions.
- Filters (light toolbar): search (chapter/subject), Subject select (from `/faculty/subjects`), Programme select; default all. Server `q` + `status` exist; subject filter is client-side.
- KPIs: none on this page — counts live in the tab badges.
- Colours: status pills stay semantic (amber awaiting, teal changes requested, green published); subject chip uses `dataColor(subjectIndex)` soft disc for quick scanning.

**Functional gaps:** needs backend `GET /edu_video/jobs?review_state=needs_review|changes_requested|published&subject_id=` so tabs can page server-side; `change_note` must be in the list payload (check — not in list fields at `routes.py:722-738`).

---

## 3. MCQ review `/faculty/mcq` (shared `McqReviewWorkspace`)

**Purpose (SOW §6.1.4, §6.3):** generate / review / approve AI questions per chapter before students can take the quiz.

**Current problems**
- Banner with only a "Refresh list" button (`McqReviewWorkspace.jsx:166-178`) — refresh is not a page action.
- KPI row + SegTabs show the same three numbers twice (KPIs `:156-158` and tab counts `:188`).
- Master–detail: left list is 270 px with every row saying "Video published" (useless meta) and a tiny status line; right pane is a big empty "Select a chapter" illustration at 1440 (`audit-hod-mcq-1440.png`).
- No subject grouping although `subject_name` is on every job.
- Falls back to N calls to `mcqApi.getOrNull` when list lacks state (`:85-110`) — list already returns `mcq_status`, so fallback should never trigger for HOD; keep but watch.

**Target structure** — tabs: **Awaiting approval** (default) · **Needs questions** · **Approved** · (Failed shown inline with retry).
- List rows: chapter · subject (cat colour disc) · question count (`mcq_question_count`) · status pill. Auto-select the first row so the detail pane is never empty at 1440; on 390 the list opens the detail as a full sheet.
- Detail: question cards, correct answer marked green, "Approve set" = the one orange action; "Regenerate" outline.
- KPIs: drop (tab badges carry them).
- Filters: search + Subject select.

**Functional gaps:** none blocking; same 100-job cap as videos.

---

## 4. Subjects `/faculty/subjects`

**Purpose (SOW §5.2 hierarchy, §6.5.2 completion by subject):** see every department subject, its chapters and their content status.

**Current problems**
- Accordion of `.sp-panel` cards; collapsed by default so the page shows almost nothing (`subjects/page.jsx:104-143`). Counts are three pills per row of equal weight.
- No learning numbers per subject although `/analytics/department.subjects[]` has `completion`, `avg_score`, `pass_rate`, `learners` keyed by `subject_id`.
- "Not linked to a subject" table at the bottom (`:147-163`) shows title + status only; no action, and the HOD owns these (staff-scope rule).
- Banner action "Open video review" is a glass button = a sidebar link.

**Target structure** (no tabs; grouped by Programme › Semester):
- Table/rowcards: Subject (cat disc) · code · teachers · chapter pipeline as a mini stacked `Distribution` (published green / in review amber / in progress blue / no video grey) · completion % (`Meter` in the subject's cat colour) · avg score `BandPill` · chevron to expand chapters.
- Expanded: chapter list with position, status pill, "Review" link (keep).
- KPIs: Subjects · Chapters · Published % (published/chapters) · Awaiting review (orange if >0).
- Filters: search · Programme · Semester · Status (has chapters to review).
- "Not linked" becomes a notice with count + link to Video review filtered to unlinked.

**Functional gaps:** join `faculty/subjects` with `analytics/department.subjects` by id client-side (no backend change).

---

## 5. Students `/faculty/students`

**Purpose (SOW §5.2 "views student / cohort reports", §6.5.2 per-student completion):** find a student and open their learning, quiz and interview record.

**Current problems**
- 390: banner (icon tile + 5 lines) + 4 KPI cards fill the first screen; search starts at y≈770 (`audit-hod-students-390.png`).
- KPIs mix scope trivia ("Not in a programme") with performance; nothing about how students are doing.
- Filters: only status (All/Active/Pending/Deactivated) — that is an admin concern, not an HOD one. No programme / semester / year / band filter, no sort.
- "Avg score" mixes quizzes + mock interviews (`avg_score` from `_Acc`) without saying so in the table header.
- Row has both a clickable name and a "View" button (`:251, :270`).

**Target structure**
- KPIs: Students · Avg completion · Avg score (`BandPill`) · Need attention (orange; from analytics `at_risk.length`).
- Filters: search · Programme · Semester · Year (Final year) · Score band (Strong / On track / Needs focus / No data) · Status (secondary, default Active).
- Table: Student · Programme/Sem · Completion (`Meter` coloured by band) · Quizzes · Interviews · Avg score (`BandPill`) · Last active. Whole row opens drawer; drop the View button.
- Drawer (keep, good): add a `BarList` of quiz scores by chapter coloured by band; interview scores list.

**Functional gaps:** needs backend `program_id`, `semester_id`, `final_year`, `band`, `sort` params on `GET /faculty/students` (today only `q`, `status`, page). Score band filter can be client-side per page meanwhile (wrong across pages — prefer backend).

---

## 6. Department staff `/faculty/staff` (HOD only)

**Purpose:** HOD role file — see faculty and the subjects each teaches; spot uncovered subjects. *Not named in SOW §5.2/§6.3; keep as is, small polish only.*

**Current problems**
- Full banner + 3 KPI cards + teal search band for a 2-row table.
- Uncovered-subjects warning rendered as a neutral `SectionState` (`staff/page.jsx:55-59`) — it is a "needs focus" item, should be an orange-text notice.
- Subjects as grey pills; status pill + dot.

**Target structure:** KPI strip (Staff · Subjects · Uncovered (orange if >0)) → notice if uncovered → table with in-panel search: Name/email · Role · Subjects (cat-coloured chips, same colour per subject as in Subjects page) · Status · Last active.

**Functional gaps:** none in scope. (Per-staff review workload = needs backend, out of SOW — see list.)

---

## 7. Interview assignments `/faculty/interviews`

**Purpose (SOW §5.2, §6.3, §6.4.5, §6.5.2 interview cohort analytics):** create/close mock-interview assignments for department cohorts and track completion and readiness.

**Current problems**
- Two unrelated panels stacked: Assignments (Active/Closed seg) and Cohort results (`InterviewCohortPanel`) with its own seg — two tab systems on one page.
- KPIs show 0s with icon tiles in four colours; "Still to complete" uses a warning icon in purple.
- Empty state duplicates the "New assignment" CTA (banner orange + empty-state outline).
- Cohort table: Department column (X5); Best/Latest pills coloured differently without legend; Year-1 student appears under a header that says "Final-year students and anyone who practised" — correct per backend but confusing.
- Assignment rows: `completion_pct`, `eligible_count`, `completed_count` exist in `InterviewAssignmentOut` but are shown as text, not progress.

**Target structure** — tabs: **Assignments** (default; sub-filter Active/Closed) · **Cohort readiness**.
- Assignments: rowcards — title · mode · cohort (final year / year N) · due date (orange if overdue) · progress bar `completed/eligible` (green fill) · Close. Page-head orange "New assignment".
- Cohort readiness: `Distribution` of status (Not started grey · Practising blue · Ready green) + `BarList` of weak areas (count of `interview_cohort[].weak_area`, cat colours) + table (Student · Year · Mocks · Best `BandPill` · Latest `BandPill` · Work on · Last mock · Status). Filter: status, final-year only toggle (default on).
- KPIs: Final-year students · Active assignments · Completion % (completed/assigned) · Need support (`summary.needs_support`, orange).

**Functional gaps:** per-student "assigned but not attempted" list per assignment needs backend `GET /interview-assignments/{id}/students` (verify; not seen).

---

## 8. Department analytics `/faculty/analytics` (shared `InsightsView`)

**Purpose (SOW §6.5.2):** completion by department / subject / student, score distribution with pass/fail, top-10 Q&A topics per subject, interview cohort analytics, downloadable reports.

**Current problems**
- One 2135 px page (3638 px at 390) with 8 panels (`InsightsView.jsx:191-470`) — no hierarchy, no tabs.
- "Department performance" table has one row for an HOD (X5) — remove.
- Score distribution: 5 backend bins all teal; no pass/fail ratio shown although `totals.pass_rate` exists.
- Filter band: teal band for one range select + "Refresh" (X4); range chip duplicated in banner.
- Completion `Meter`s are grey/teal only; avg-score pills colour inconsistently (21% orange pill, 0% plain).
- Interview readiness duplicated with Interviews › Cohort results.
- Q&A demand empty state is a 4-line paragraph.

**Target structure** — tabs (`?tab=`), range select (default Last 30 days) in the page head, applies to all tabs:
- **Overview:** KPIs Active students · Completion % · Avg score (`BandPill`) · Pass rate (`totals.pass_rate`). Row: `Distribution` of students by band (client `bandFor(students[].avg_score)`: strong green / on track blue / needs focus orange / no data grey) · `DonutChart` pass vs fail attempts (needs counts — see gaps; until then show pass-rate `ScoreMeter`). Row: `BarList` completion by subject (cat colours) · Students who need attention (top 5, link to Students tab).
- **Subjects:** table Subject (cat disc) · Published chapters · Learners · Completion `Meter` (subject colour) · Quiz attempts · Avg score `BandPill` · Pass rate; `ColumnChart` avg score by subject above the table.
- **Students:** `RankList` top 10 by avg score (rank colours 1 orange / 2 blue / 3 purple) + at-risk list with reason chips + full table (search, band filter) — Student · Completion · Watch time · Q&A · Quizzes · Interviews · Avg score.
- **Q&A demand:** per-subject cards, top-10 questions as `BarList` (count, subject colour), chapter caption.
- **Interviews:** link card to Interviews › Cohort readiness (don't duplicate the table) + readiness `Distribution`.
- Remove "Department performance" panel and every Department column.

**Functional gaps / needs backend:**
- `totals.attempts` and `totals.passed` (only `pass_rate` today) for a pass/fail donut.
- Time series (`by_week: [{week, completion, avg_score, qa}]`) for `TrendChart` — none of the endpoints return one. Without it, no trend chart.
- `program_name` / `semester_name` on `students[]` (only `department`) to filter analytics students by programme.

---

## 9. Reports `/faculty/reports` (shared `ReportsWorkspace`, HOD only)

**Purpose (SOW §5.2, §6.3, §6.5.2):** download student- and cohort-level reports (CSV / Excel / PDF).

**Current problems**
- 390: banner 440 px tall; preview starts at y≈998.
- KPI row is fake ("Rows in preview", "Report type", "Date range" — `ReportsWorkspace.jsx:225-231`) — echoes the filters.
- Export CSV orange in the banner, other formats elsewhere; three formats should sit together.

**Target structure:** tabs per report type (Student performance (default) · Q&A · Interview · Department summary) → light toolbar: range (Last 30 days), programme (needs backend param) → preview table with pager → export group `CSV | Excel | PDF` (CSV orange). No KPI row.

**Functional gaps:** programme/semester filter for cohort-level reports (needs `program_id` on `/reports/preview` + `/download`; verify).

---

## 10. Notifications `/faculty/notifications`

**Purpose (SOW §7):** see review alerts ("Chapter ready for your review") and other system messages.

**Current problems:** banner + 2 KPIs for a list; "Review alerts — On this page" counts only the current page (`notifications/page.jsx:36, 50`) — misleading; table shows delivery Channel/Status (an admin/delivery-log concern); rows don't link to the chapter.

**Target structure:** plain list (no KPIs): icon by event · title · subject line · relative time · "Open" link to `/faculty/videos?job=` when the event carries a job id. Filter: All / Review alerts. Delivery status only as a small failed marker.

**Functional gaps:** needs backend `job_id` (or link) on review-alert deliveries.

---

## 11. Settings `/faculty/settings` (shared `AccountSettings`)

Profile / Security tabs; fine. Only apply X1 (no duplicate banner). No HOD-specific work.

---

## Prioritised build list

**P1 — makes it look like a product**
1. X1/X2 shell: single page title, no `ModuleBanner` on list pages, module `TabNav` with `useTabParam`, light in-panel toolbars (X4), wider content (X8).
2. Video review tabs Needs review / Changes requested / Published (+ In preparation), subject-first rows, copy fix ("in this college").
3. Analytics split into Overview / Subjects / Students / Q&A / Interviews with data-viz components; client `bandFor` distribution (X7); drop Department panel/columns (X5).
4. Dashboard: queue + at-risk + subject completion `BarList` + readiness `Distribution`; remove Shortcuts and scope side panel.
5. MCQ review tabs + auto-select first chapter + subject chips; remove duplicate KPI row.

**P2**
6. Interviews: Assignments / Cohort readiness tabs, progress bars from `completion_pct`, weak-area `BarList`.
7. Subjects: grouped by programme, per-subject completion/score joined from analytics, pipeline mini-distribution.
8. Students: performance KPIs, band filter, row-click drawer, quiz `BarList` in drawer.
9. Reports: tabs per type, remove fake KPIs, export group.
10. Backend: `/faculty/students` filters (`program_id`, `semester_id`, `final_year`, `band`, `sort`); `/edu_video/jobs` `review_state` + `subject_id` + `change_note` in list; analytics `totals.attempts/passed`.

**P3**
11. Staff and Notifications polish (orange uncovered notice; notification deep links — needs `job_id` on deliveries).
12. Analytics `TrendChart` once backend adds a weekly series; programme fields on analytics students.

## Out of SOW (do not build; listed for the owner)

- **Faculty tab in analytics / per-staff workload** (reviews published, MCQs approved per faculty) — SOW §6.5.2 covers department, subject, student only. Would need new backend aggregation.
- **Trend-over-time charts** — SOW asks for rates and distributions, not history; only if the owner asks (needs backend series).
- **Department staff page itself** — not in SOW §5.2/§6.3; exists from the HOD role decision. Keep, don't extend.
- **Notification delivery status / channel view** for HOD — SOW §7 only requires sending; keep minimal.
- Unpublishing a chapter, leaderboard for staff, staff messaging students — not in SOW (§14 excludes live faculty-student interaction).
