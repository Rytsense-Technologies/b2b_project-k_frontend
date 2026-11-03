# Faculty portal redesign audit (`/faculty/*`, Faculty role)

Audited 14 Oct 2026, read-only. Live user: `faculty@yopmail.com`, a Faculty member who teaches **Data Structures (CS201)** in Computer Science. In scope there is 1 subject, 1 chapter (published, MCQ approved) and 1 student (unplaced, Year 1, 9 mock interviews).
Screenshots are in `.playwright-mcp/audit-faculty-<page>-1440.png` and `-390.png`.
Sources used: `REDESIGN_PLAN.md`, design-system §0/0b/2b/4/4b, `knowledge/roles/faculty.md`, `rules/staff-scope.md`, SOW §5.2/6.1.3/6.1.4/6.3/6.5.2, and the backend `faculty_directory.py`, `college_insights.py` and `edu_video/routes.py`.

## Cross-cutting problems (all pages)

1. **The same template on every page.** Every route stacks the same blocks: the topbar H1 and subtitle, then a teal `ModuleBanner` that repeats the same title and lede, then a `ScopeNotice` card, then 3–4 `KpiRow` cards, then a teal `FilterBar`, then one `Panel`. As a result the title appears twice and the scope is explained three times (in the topbar subtitle, the banner lede and `ScopeNotice`). For example, Students shows "Students / Students / Your students" (`students/page.jsx:184-218`) and Video review shows the title twice (`layout.jsx:56` and `videos/page.jsx:288`). This repetition is the main reason the pages look "AI-generated".
2. **Wordy copy.** Each banner lede runs to 2 lines of explanation, `ScopeNotice` adds 2 more, and the KPI `sub` lines are sentences. The "Q&A demand" empty state alone is 4 lines (`InsightsView.jsx:338`).
3. **Data has no colour.** The only data visuals are teal `Meter` bars and the score bands. The score distribution is a single-colour teal bar list (`InsightsView.jsx:238-245`). No `BarList`, `Distribution`, `RankList` or chart from `data-viz.jsx` is used anywhere in the faculty portal.
4. **No tabs.** The long modules (Analytics, Video review) are single scrolls. On a phone, Analytics is about 3,700 px tall with 8 panels (`audit-faculty-analytics-390.png`). Nothing uses `useTabParam`, `TabNav` or `ModuleTabs`.
5. **Slow scope, then a layout jump.** `/faculty/me` and `/faculty/overview` were still loading after 2.5–3 s.
   - Until then the dashboard shows the eyebrow "HOD / FACULTY", an empty teal "Your scope" side card and "—" KPIs (`audit-faculty-dashboard-390.png`, `dashboard/page.jsx:28,36`).
   - The Staff URL shows a bare "Loading…" (`staff/page.jsx:124`).
   - The fix is a skeleton for the hero and side card, not empty teal blocks.
6. **Scope is told, not shown.** The "Your subjects: …" `ConfirmNote` (`ScopeNotice.jsx:23`) is a full-width card on every page. Replace it with a compact scope chip in the banner, e.g. "Data Structures · CS201" or "View only". Keep the full card only for the read-only state.
7. **Mixed average score.** `avg_score` blends quizzes and mock interviews (`InsightsView.jsx:186`, drawer `students/page.jsx:90`). For this Faculty member the KPI reads 21% with 0 quizzes, so the number is entirely interview-driven and says nothing about their subject. Interview numbers stay student-level by design (staff-scope rule), so the subject view needs a quiz-only score (see backend gaps).
8. **Band mismatch.** The backend `SCORE_BANDS` are 0-39 / 40-59 / 60-74 / 75-89 / 90-100 (`college_insights.py:35`). The design bands are <60 / 60-79 / ≥80 (`data-viz.jsx BANDS`). The 75-89 bucket straddles "on track" and "strong", so it cannot be coloured cleanly. **Needs backend:** `score_distribution` in design bands (`needs_focus`, `on_track`, `strong`), or raw per-student scores, which `students[]` already has. The frontend can re-bucket from `students[].avg_score`.
9. **At 390.** There is no horizontal scroll (scrollWidth 390). However:
   - Each 4-KPI row becomes a 2×2 block about 330 px tall.
   - Tables stack into label/value cards about 300 px each (Students, Analytics).
   - The Status `SegTabs` wrap onto 2 lines ("Deactivated" alone on the second, `audit-faculty-students-390.png`).
   - The hero CTAs stack full width.
10. **Sidebar.** The Faculty sidebar is fine (role-aware and correctly hides Staff and Reports). The only issue: "Interview assignments" sits under *Teaching* even though Faculty can only read it. Move it to *Insights* as "Interviews".

## Faculty vs HOD (one codebase, `scope.is_hod` / `subject_limited` / `read_only`)

| Area | Faculty with subjects | Faculty without subjects (read-only) | HOD |
|---|---|---|---|
| Scope chip | "Data Structures · CS201" (+N) | "Computer Science · view only" (lock icon) | "Computer Science · whole department" |
| Video / MCQ actions | Publish, edit slides, request changes, generate and approve, for own-subject chapters only (`can_review`) | All hidden; one `ViewOnly` pill per row; banner CTA hidden | All |
| Unlinked content | Not shown (backend) | Shown, read-only | Shown with an "Unlinked" tab |
| Students | Own subjects' programmes + unplaced; quiz list limited to own subjects | Whole department | Whole department |
| Analytics | No "Department" table; subject rows only for own subjects | Department, read-only label | Department performance and reports link |
| Interviews | Read-only, no "New assignment" | Read-only | Create and close |
| Staff / Reports | Hidden from nav; direct URL shows a gated `SectionState` | Same | Visible |

---

## 1. Dashboard (`dashboard/page.jsx`)

**Purpose (SOW §5.2, §6.1.3):** The SME's home page: what is waiting for their review. SOW 6.3 says Faculty get no institution-wide dashboard, so this page must stay subject-scoped.

**Current problems**
- **Two orange elements in the hero.** The eyebrow pill is orange and so is the "Review MCQs" primary (`:33`). The hero title "Review queue" duplicates the topbar's "Dashboard".
- **The side panel is static.** "Your scope" contains two prose bullets, one of which ("You decide what goes live") is a permanent marketing line (`:47-52`). It is also empty while loading (390 screenshot).
- **The "Shortcuts" panel duplicates the sidebar** (`:114-134`). It fills half the page with links that are already in the nav. This is a generic template pattern.
- **Thin KPIs.** The 4 KPIs are counts only (`:68-76`). "Subjects 1 · Assigned to you" is low value.
- **No overdue signal.** The queue has `since` but no age, and nothing marks an item as overdue.
- **Lopsided empty state.** "All caught up" on the left next to the long Shortcuts list on the right.

**Target structure**
- **Hero:**
  - Greeting with name and subject chips.
  - One orange CTA: "Review next" deep-links to the first `queue` item, or is hidden when the queue is empty.
  - Secondary white button: "Open subjects".
  - Side panel "This week": the counts `videos_awaiting`, `mcq_to_approve` and `mcq_not_generated` as inset rows, using orange text when > 0.
- **KPIs (4):**
  - Videos to review (`videos_awaiting`)
  - MCQ sets to approve (`mcq_to_approve`)
  - Chapters without questions (`mcq_not_generated`, orange value when > 0)
  - Active students (`students`)
- **Left, "Waiting for you":** a `.rowcard` list. Each row shows a kind icon (video or quiz), the chapter, "sent N days ago" and a chevron. Items older than 7 days get an orange "Waiting 9 days" pill.
- **Right, "Your subjects at a glance":** one `BarList` row per subject with completion %, coloured by categorical series (from `/analytics/department` `subjects[]`). Below it, a `Distribution` of the chapter pipeline: published / in review / in progress / no video, built from `/faculty/subjects` totals with `--cat` colours and a `Legend`.
- **Remove** the Shortcuts panel.

**Functional gaps**
- Deep links `?job=` for MCQ: confirm that `McqReviewWorkspace` reads `?job=` (the dashboard links `/faculty/mcq?job=`, `:98`).
- `queue` is capped at 8 (`faculty_directory.py:185`) with no "View all" link. Link to Video review and MCQ review.

## 2. Video review (`videos/page.jsx`)

**Purpose (SOW §6.1.3, §6.3):** The SME reviews AI video modules and approves them before students see them. The flow is preview → edit slides / request changes → publish.

**Current problems**
- **Three stacked panels** (Awaiting / In progress / Published, `:367-520`) **plus** a "Show" `SegTabs` (`:336`) that only hides panels. That is two navigation models for one list.
- **Pipeline chips duplicate state.** The banner chips "Generated › Sent › Your review › Published" (`:290-300`) repeat the KPIs and use orange for "Your review", which competes with the orange CTA.
- **Data is capped client-side.** `listJobs({ pageSize: 100 })` (`:141`) loads everything with no paging. The backend supports `page`, `q` and `status` (`routes.py:649`).
- **No subject filter.** A Faculty member with several subjects cannot filter by subject, even though `subject_name` is returned (`routes.py:737`). The department select is HOD/CA-only noise for Faculty (`:325`).
- **Row action density.** A row carries Preview, History, Edit and "Publish to students", all on one line (`:394-414`). On 390 these wrap badly.
- **Wrong copy.** The Published panel sub reads "Live for students in this college" (it should say "your subjects").
- **No change-request filter.** "Changes requested" (`changes_requested_at`) is only a pill; you cannot filter on it.

**Target structure**
- **Tabs** via `useTabParam('tab')`:
  - **To review** (default). Count badge = awaiting minus changes requested.
  - **Changes requested.** Shows `change_note`, with the College Admin's regenerate as the expected next step.
  - **In progress.**
  - **Published.**
- **Filters:** search (chapter or file) and Subject (`QuirriSelect`, built from `subject_name`, default "All my subjects"). Show the Department select to HOD only when there is more than one department, which in practice is never.
- **KPIs:** remove the KPI row. The tab counts carry the numbers. Optionally one info strip: "Oldest waiting: 6 days".
- **Rows:**
  - `.rowcard`: title, subject chip in its categorical colour (subject index → `--cat-n`), sent date, status pill.
  - Primary row action "Review" opens the preview modal, and publishing happens inside the modal (one orange action in that view).
  - Edit and History go into the modal or an overflow menu.
- **Read-only Faculty:** no actions, a lock pill, and the tab set reduced to "In review / Published".

**Functional gaps**
- Server paging and search instead of the client-side cap of 100.
- Confirm before publishing: currently one click publishes (`:404`). A `ConfirmNote` is needed because publishing is irreversible for students.
- Closing a deep-linked preview works (`:175`). Keep that.

## 3. MCQ review (`mcq/page.jsx` → `McqReviewWorkspace`)

**Purpose (SOW §6.1.4):** SME review and approval of AI-generated MCQs before activation, tagged to subject and chapter.

**Current problems**
- **Same template stack.** The banner action "Refresh list" is a glass button with no real purpose.
- **Huge empty-state art.** A master/detail layout leaves most of the screen on "Select a chapter" (`audit-faculty-mcq-1440.png`).
- **Chapter rows lack context.** They show neither the subject nor the question count (`mcq_question_count` is available).
- **No subject filter**, and the list again uses `listJobs({ pageSize: 100 })` (`McqReviewWorkspace.jsx:64`).

**Target structure**
- **Tabs:** Needs questions / Awaiting approval (default when > 0) / Approved. Use these instead of KPIs plus `SegTabs`.
- **Filters:** search and Subject.
- **Layout:**
  - Left list rows: chapter, subject chip (categorical), "12 questions", status pill.
  - Right detail panel: header with chapter, subject and count; one orange action (Generate / Approve); the question list.
  - When nothing is selected, auto-select the first item instead of the art.
- **Visual:** after approval, show a small `Distribution` of the quiz difficulty mix, but only if the document returns a difficulty per question. Otherwise skip it. **Needs backend:** a per-question `difficulty` field if wanted.
- **Read-only Faculty:** Generate and Approve are hidden; questions are viewable.

**Functional gaps**
- No per-quiz performance (attempts, average, hardest questions) for approved sets. **Needs backend:** a `GET /mcq/jobs/{id}/stats` endpoint returning attempts, avg, pass_rate and per-question % correct. This is valuable SME feedback, but it is beyond the strict SOW, so it is P3.

## 4. Subjects (`subjects/page.jsx`)

**Purpose (SOW §5.2, §6.3):** Subject-level access: the Faculty member's subjects, their chapters and each chapter's content status.

**Current problems**
- **Too little content for the space.** With 1 subject, the page shows a full-width banner, a scope card, 4 KPIs, a filter bar and then a single collapsed accordion row (`audit-faculty-subjects-1440.png`).
- **Wrong primary button.** The banner action "Open video review" is a glass button and not the primary (`:198`).
- **Weak accordion.** It is collapsed by default even for a single subject (`:176`). Chapter rows show only a status pill, with no MCQ status and no completion.
- **No learning data.** `published`, `in_review` and so on are shown as pills, but per-subject learning data (completion, avg score, learners from `/analytics/department subjects[]`) is not shown here at all.

**Target structure**
- **Layout:** a subject card grid (`.un-grid`), one card per subject. Each card has a categorical monogram colour by index, name and code, programme and semester, and teachers.
  - Mini stats on each card: chapters, published, learners (from analytics `subjects[].learners`).
  - A `Distribution` bar on each card: chapter pipeline (published / in review / in progress / no video).
- **Subject detail:** `/faculty/subjects?subject=<id>`, or a drawer.
  - **Overview:** `BarList` of completion, avg score and pass rate from `subjects[]`.
  - **Chapters:** ordered list with status pill, MCQ status (join the `listJobs` `mcq_status` on `job_id`) and a "Review" link.
  - **Students:** link to Students pre-filtered by subject (needs the backend filter below).
- **Single subject:** open it directly; skip the grid.
- **Filters:** search only (keep it). Add a Programme select for the HOD when there are more than 6 subjects.
- **HOD only:** an "Unlinked content" section, shown as a tab, not a trailing table (`:285`).

**Functional gaps**
- **Needs backend:** per-chapter completion and quiz avg (`subjects[].chapters[].completion`, `avg_score`, `attempts`). Today completion exists only per subject.

## 5. Students (`students/page.jsx`)

**Purpose (SOW §6.3, §6.5.2):** Subject-scoped student view: completion, assessment scores and readiness. Download student-level quiz reports.

**Current problems**
- **Irrelevant status filter.** The Status `SegTabs` (All / Active / Pending / Deactivated, `:205`) is an admin concern. Faculty cannot act on account status, and it wraps to 2 lines at 390.
- **Narrow filters.** There is no Programme, Semester, Year or Subject filter and no sort. The backend only accepts `q`, `status` and paging (`faculty_directory.py:194-197`).
- **Unhelpful KPIs.** "Final year 0 · Eligible for mock interviews" and "Not in a programme" are admin-flavoured (`:196-199`).
- **Misleading average.** The Avg score column mixes interviews: 21% with 0 quizzes.
- **Plain drawer.** Placement and Learning are `InfoList` text with no visual. The quiz list has no band colour beyond `ScoreCell`.
- **Duplicate actions.** The View button and the name button do the same thing.

**Target structure**
- **Tabs:**
  - **Roster** (default): table of student, programme/semester, completion `Meter` (band-coloured), quizzes, quiz avg as `BandPill`, last active.
  - **Performance:** `RankList` of students by quiz avg (rank colours 1 orange, 2 blue, 3 purple, then teal) and a `Distribution` of score bands (needs focus / on track / strong / no data).
  - **At risk:** the `/analytics/department` `at_risk[]` rows with their `reasons` as orange pills, sorted by number of reasons.
- **Filters:** search; Programme (from `scope.subjects[].program`, default All); Score band (client-side on the page, or server-side if added); Status as a small select defaulting to Active (not tabs).
- **KPIs (4):**
  - Students in scope
  - Avg chapter completion
  - Quiz avg (subject-scoped)
  - At risk (orange value when > 0)
  - All from `/analytics/department totals` and `at_risk.length`.
- **Drawer:**
  - Header stats: completion and quiz avg (separated from the interview avg).
  - A `BarList` per quiz chapter (score, band colour).
  - Interviews as `.rowcard`s with `BandPill`.
  - Download icon kept (`can_download`).

**Functional gaps**
- **Needs backend:**
  - `GET /faculty/students` params `program_id`, `semester_id`, `subject_id`, `sort` (`avg_score`, `completion`, `last_login_at`), `band`.
  - A `quiz_avg` field separate from `avg_score`.
- The drawer's "Average score (quizzes + mock interviews)" label must change to match whichever number is shown.

## 6. Interview assignments (`interviews/page.jsx`, Faculty = read-only)

**Purpose (SOW §5.2, §6.4.5, §6.5.2):** Faculty/HOD assign cohort interviews. **Decided scope:** only HOD and CA create; Faculty follow.

**Current problems**
- **Notice repeats the banner.** "Your HOD assigns interviews" `ConfirmNote` (`:336`) repeats the lede.
- **KPIs are 4× zero** when there are no assignments. The page is mostly empty.
- **Duplicated table.** The "Cohort results" table (`InterviewCohortPanel`) is the same table as Analytics › Interview readiness (`InsightsView.jsx:356`).
- **Eligibility looks inconsistent.** The cohort shows a Year 1 student, because "anyone who practised" is included while the KPI says "Final-year students 0". Faculty will read this as inconsistent.

**Target structure**
- **Tabs:**
  - **Assignments:** Active / Closed list, read-only for Faculty with no create CTA.
  - **Readiness:** a `Distribution` of not started / practising / ready (categorical: grey / blue / green), then the cohort table with Best and Latest as `BandPill`.
- **Filters:** Status (All / Not started / Practising / Ready) and Final year only (toggle, default on).
- **KPIs (3):** final-year students, ready %, still to complete.
- **Analytics:** remove the readiness table from Analytics and link here instead.

**Functional gaps**
- Faculty see department-wide interview data. Interview data is student-level by rule, which is correct, but the student set should match the Faculty member's student scope. Verify that `/analytics/department interview_cohort` uses the subject-limited student list (it showed the 1 in-scope student, so this looks right).

## 7. Analytics (`analytics/page.jsx` → shared `InsightsView`)

**Purpose (SOW §6.5.2, Faculty restricted from institution-wide dashboards):** Completion by subject and student, score distribution with pass/fail, Q&A top topics per subject, at-risk.

**Current problems**
- **One long scroll.** 8 panels, about 2,000 px at 1440 and about 3,700 px at 390.
- **Department table for Faculty.** "Your students" (`InsightsView.jsx:191-231`) is a one-row **Department** table for a Faculty member. It is meaningless at subject scope and contradicts SOW 6.3's spirit.
- **Single-colour distribution.** The score distribution is a teal bar list whose bands do not match the design bands (see cross-cutting #8).
- **No pass/fail ratio.** `pass_rate` exists in `totals` but only appears as KPI sub-text.
- **Q&A demand panel.** It has a per-subject select inside the panel. With 1 subject that select is redundant. The empty copy is too long.
- **Duplicates.** "Student performance" duplicates Students › Roster, and "Interview readiness" duplicates Interviews.
- **Unexplained Refresh.** The filter bar has a Range select plus a Refresh button.

**Target structure**
- **Tabs:**
  - **Overview** (default):
    - KPIs: completion, quiz avg, pass rate, active students (with Q&A turns as sub-text).
    - `Distribution` of score bands (`--band-*` colours) with `Legend`.
    - `DonutChart` of pass vs fail attempts (from `pass_rate` and `attempts`).
    - `BarList` of completion by subject, one categorical hue per subject.
  - **Subjects:** subject table (`subjects[]`: published chapters, learners, completion bar in subject hue, attempts, avg `BandPill`, pass rate). For the HOD, add `ColumnChart` avg score by subject.
  - **Students:** `RankList` top 10 by avg; the at-risk list with reason pills; full table link → Students.
  - **Q&A demand:** subject `TabNav` or segment (hidden when there is 1 subject); `BarList` of top 10 questions by `count` in that subject's hue, with the chapter as meta.
- **Filters:** Range (default Last 30 days) and Subject (Faculty with more than 1 subject; client-side filter of `subjects`/`qa_demand`). Drop Refresh.
- **HOD only:** keep the department performance block (a `departments[]` row with `interview_ready_pct`) and the "Download reports" link.

**Functional gaps**
- **Needs backend:** a time series for trends (`trend[]`: date, completion, attempts, avg) to use `TrendChart`. Nothing in the payload is dated today. Without it, no trend chart.
- **Needs backend:** a quiz-only `avg_score` in `totals` and `students[]` for Faculty (cross-cutting #7).
- Subject filter server-side (`?subject_id=`) is optional; client-side is enough for the small sets involved.

## 8. Notifications (`notifications/page.jsx`)

**Purpose (SOW §7, §6.1.3):** The Faculty member is notified when content is ready for review and when generation completes.

**Current problems**
- **Mislabelled KPI.** "Review alerts · On this page" counts only the current page (`:36,50`).
- **Wrong columns.** The table shows delivery Channel and Status (sent/failed/log_only), which is an ops view. The Faculty member needs "what happened and where to act".
- **Slow first paint.** It was still "Loading…" at 2.5 s on first paint.

**Target structure**
- A `.rowcard` list grouped by day.
- Each row: event icon, `event_label`, subject line, time, and a "Review" link when the event is `content_ready_for_review`.
- Filter: an event-type segment (All / Review alerts / Other).
- Drop the KPIs. Delivery status becomes a small grey pill only when it failed.

**Functional gaps**
- **Needs backend:** a `job_id` (or a link target) on notification rows so they can deep-link to `/faculty/videos?job=`.

## 9. Settings (`settings/page.jsx` → `AccountSettings`)

**Purpose:** Profile and password. The shared component is out of the Faculty writer's ownership.

**Current problems**
- "ROLE —" and "ACCESS —" show dashes while loading. Show a skeleton instead.
- No Faculty-specific content (assigned subjects).

**Target structure**
- Keep as is.
- Side card "Your access": role, department, subjects (from `/faculty/me`), read-only state.

## 10. Staff / Reports (HOD only)

**Behaviour for Faculty:** Hidden from the nav. A direct URL shows a gated `SectionState` (Reports: "Reports are for your HOD"). Staff shows only "Loading…" until `/faculty/me` resolves (`staff/page.jsx:124`).

**Target:** Use one shared "Available to your head of department" state with a back link to the dashboard. No other change for Faculty (the HOD audit covers these pages).

---

## Prioritised build list

**P1 (fixes the "AI template" look and wrong data)**
1. Remove the duplicate banner title/lede and replace the `ScopeNotice` card with a scope chip in the topbar/banner on all faculty pages. Keep the card only for the read-only state.
2. Analytics:
   - Split into tabs: Overview / Subjects / Students / Q&A.
   - Drop the department table for Faculty.
   - Coloured `Distribution` (re-bucket `students[].avg_score` into the design bands), pass/fail `DonutChart`, subject `BarList`.
3. Video review: tabs (To review / Changes requested / In progress / Published) instead of panels plus SegTabs; Subject filter; publish confirm.
4. Students:
   - Tabs: Roster / Performance (`RankList` and `Distribution`) / At risk (`at_risk[]` with reason pills).
   - Replace the status tabs with a Programme select and a Status select.
5. Dashboard: drop the Shortcuts panel; one orange "Review next" CTA; a subject `BarList` and pipeline `Distribution`; age pills on queue rows; loading skeleton for the hero and side card.

**P2**
6. MCQ review: tabs by status, subject chip and question count on rows, auto-select the first item, Subject filter.
7. Subjects: card grid with pipeline `Distribution` and learners; subject detail (Overview / Chapters / Students); open a single subject directly.
8. Interviews: tabs Assignments / Readiness with `Distribution`; "final year only" toggle; remove the duplicate readiness table from Analytics.
9. Notifications: rowcard list with a Review link; remove the page-local KPI.
10. Backend (check routes first):
    - `quiz_avg` for students and totals.
    - Design-band `score_distribution`.
    - `/faculty/students` filters (`program_id`, `subject_id`, `sort`).
    - Server paging/search use on `listJobs`.

**P3**
11. Per-chapter completion and quiz avg in `/faculty/subjects`.
12. `trend[]` time series for `TrendChart`.
13. `job_id` on notification rows for deep links.
14. MCQ per-set stats (attempts, per-question % correct).
15. Settings "Your access" side card; move "Interviews" to the Insights nav group.

## Out of SOW (do not build)

- Live classes or faculty-to-student messaging or streaming (SOW §14 exclusion).
- Faculty creating interview assignments (decided: HOD/CA only).
- Faculty content upload from this portal. The API allows it in scope, but the UI gives upload to CA/SA. Do not add it.
- Department-wide dashboards or reports for subject-limited Faculty (SOW §6.3 RBAC).
- Any plan, subscription or billing UI; LMS integrations; mobile apps.
