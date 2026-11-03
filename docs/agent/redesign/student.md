# Student portal redesign audit (`/student/*`)

Read-only audit, 14 Oct 2026. Live check: student@yopmail.com (VISTAS · Computer Science, year 1, **not final year**, so interviews are locked). It has 3 chapters in 2 subjects ("Data Structures" CS201 + "Other lectures"), 1 MCQ attempt (20%) and 9 interview reports.
Screenshots are in `.playwright-mcp/audit-student-*-1440.png` / `-390.png`: home, subjects, classroom, assessment, leaderboard, interviews, reports, report-view, progress, progress-details, settings.
Inputs: `REDESIGN_PLAN.md`, design-system §0/§0b/§2b, `knowledge/roles/student.md`, the student-content-access flow, the leaderboard API and SOW §5.3 / §6.4.

Colour roles used below (plan §Phase 0, `components/shared/data-viz.jsx`):
- `cat-n`: categorical series colour.
- Bands (`bandFor`): strong ≥80 green · on track 60–79 blue · needs focus <60 orange · none grey.
- Ranks: 1 orange · 2 blue · 3 purple · then teal.
- Subject colour: **`dataColor(subject_id)`**, the hashed key. "Other lectures" (no `subject_id`) is always neutral grey.

---

## 0. Cross-page problems (fix once, all pages benefit)

| # | Problem | Where |
|---|---|---|
| X1 | **Four score-band copies, all on 75/50.** The plan's bands are 80/60. The interview report modal uses a fifth set (80/65). | `home/page.jsx:25`, `lib/student/learning.js:124`, `components/student/ui.jsx:109` (`scoreToneKey`), `lib/student/dashboardModel.js:56` (`scoreBand`), `leaderboard/page.jsx:23`, `lib/student/interviewReport.js:62`, `InterviewReportModal.jsx:20-23` (hard-coded hex). Weak-chapter cut-offs `<75` at `subjects/page.jsx:101` and `progress/page.jsx:48`. → Replace all of them with `bandFor` / `BandPill`. Band labels differ too: "Needs revision" / "Needs improvement" / "Needs focus". Pick **Needs focus**. |
| X2 | **Subject colour is not stable.** Home colours by array index (`CAT[i % 6]`, `home/page.jsx:311,476`). That array is in newest-published order (`dashboardModel.js:177-205`). Subjects sorts by semester+name (`learning.js:95`), so on live data Home shows "Other lectures" first in blue while Subjects shows CS201 first. Progress subject chips (`progress/page.jsx` ~L452) and the subject header icon (always `spg-ic--blue`) have no subject colour at all. | → `subjectColor(job)` = `dataColor(subject_id)`, or grey when not linked. Use it for the tile, bar, chip dot and code chip on every page. |
| X3 | **Five button / card systems.** `sh-btn` (home), `sl-btn` (subjects), `spg-btn` (progress), `sd-btn` (leaderboard, reports, states), `siv-btn` (interviews). Prefixes: `sh-`, `sl-`, `slb-`, `spg-`, `srp-`, `siv-`, `sd-`, `sp-`. | Merge onto `sd-btn` + `module-ui` `Panel` / `KpiRow` / `FilterBar`, then prune the CSS. |
| X4 | **Progress bars use 3 colours for the same metric** ("% watched"): teal `.sh-bar i` (`student-dashboard.css:141`), green `.sl-ov-meter i` / `.spg-meter i`, orange `.sl-stage-bar i` (`student-learning.css:197`). The participation meter is teal. | Watch / completion bar = **subject colour** in subject lists. A single overall progress bar = `--progress` green. Orange only for a "focus" item. |
| X5 | **Page header is inconsistent.** Subjects, assessment, interviews (locked) and progress hide the shell topbar (`.sl-hide-topbar`, `.siv-hide-topbar`, `student-learning.css:9`, `student-interview.css:7`). They render their own bold 24–28px h1. Home, leaderboard, reports and settings use the regular-weight topbar title. Visible at 1440 when switching pages. | One rule: topbar title on every page, with the in-page breadcrumb only on detail views (classroom, assessment, report). |
| X6 | **Content is left-aligned with a max-width.** At 1440 there is about 300px of empty canvas on the right (all screenshots). | Centre the content column or let it fill to the design max, the same on every page. |
| X7 | **Loading shows false states.** Home at 390 after 4.5 s still shows the fallback hero "Go to my subjects / See my progress" and "College leaderboard". Progress → Details shows "No assessments completed…", "No completed interviews" and a **"Start mock interview" CTA to a non-final-year student** while loading. | Use skeletons, and render no CTA until the data has arrived. |
| X8 | **Home is slow and does N+1 calls.** It needs about 4.8 s to clear the loading state. It makes one `GET /mcq/jobs/{id}` per chapter (capped at 24, `dashboardModel.js:30`), so averages are silently wrong past 24 chapters. In dev every call fires twice (Strict Mode). Subjects (`subjects/page.jsx:41`) and Progress repeat the same lookups. | Needs backend field: `GET /edu_video/student/videos` should return `quiz_state`, `quiz_percentage` and `quiz_submitted_at` per item, or there should be a `GET /mcq/my-attempts`. |
| X9 | **Tabs are not linkable.** Home "Learning workspace" tabs use `useState` (`home/page.jsx:189`). | Use `useTabParam` (`?tab=`). Progress and subjects already use the URL. |
| X10 | **Dead code.** `components/student/interviews/InterviewNav.jsx` is unused and has hard-coded hex. `InterviewReportModal.jsx` is unused except by itself. `PerformanceChart.jsx:43` hard-codes `#0E5C6B`. | Delete, or switch to tokens / `TrendChart`. |

---

## 1. Dashboard `/student/home` (`app/student/(portal)/home/page.jsx`)

**Purpose (SOW).** Not a named SOW screen. It is the entry point to Classroom §6.4.1, Assessments §6.4.3, Leaderboard §6.4.4 and Interview §6.4.5: "what next".

**Current problems**
- Overloaded: 11 cards, about 3,200px tall at 390. "Recent lectures" appears **twice**: as the workspace tab (L340) and as a table card (L392). "Continue learning" (L591) repeats the hero next step. "Subject progress" (L470) repeats the "My subjects" tab (L304).
- Two orange actions are possible in one view: the hero `sh-btn--accent` (L239) plus the practice-queue `sh-btn--accent` (L449) when an assignment is open.
- The leaderboard mini-table rank is a plain number (L544), with no rank badges. The subject-progress bars are teal and identical for every subject (`.sh-bar i`). Interview history uses only orange/teal score text.
- The summary KPI tile icons use c1/c2/c3, but the values are not coded. "Average quiz score" is orange for 20% (correct: focus) with no band label.
- `lbScope` falls back to "College leaderboard" (L200). The API is department-scoped (`knowledge/api/leaderboard.md`).
- Learning-workspace tab state is not in the URL (X9).

**Target (keep one screen, cut to 6 cards)**
1. Row 1: Next-step hero (the single orange CTA) + "This semester" KPI card. Chapters watched uses a green progress ring. Assessments done shows `x/y`. Average score uses `BandPill`.
2. Row 2: **Subjects** card. Each row has a subject-colour tile, a subject-colour watch bar, the % watched, and the latest/avg score as `BandPill`. This replaces the workspace tabs and "Subject progress". Next to it, **Study focus** (teal side panel, §2b).
3. Row 3: **Up next** list (assessments ready + continue lecture + assigned interview, max 4, outline buttons) | **Leaderboard snapshot** as a `RankList` (top 3 + me) with rank colours.
4. Row 4: **Interview history**: last 4 sessions, score `BandPill`, plus a small `TrendChart` of interview scores (single series, teal line with orange markers) when there are 2 or more. Data: `GET /reports/livekit` (`score`, `completed_date`).
- Drop the duplicate Recent-lectures table and the Continue-learning card.
- Filters: none. This is a summary page.

**Functional gaps:** X7 loading states, X8 latency. "Assigned interview" shows only `Open` assignments and has no due-date sort.

---

## 2. My subjects / Classroom `/student/subjects` (`subjects/page.jsx`, `VoiceQnaPanel.jsx`)

**Purpose (SOW §6.4.1 + §6.4.2).** Lectures in Programme > Semester > Subject > Chapter context, playback with progress tracking, and the voice AI tutor (EN + Tamil, interruptible, session context).

**Current problems**
- **Overview** (`?s=`):
  - The subject switcher is a row of pills (`.sl-ov-pill`, L154-163) with a teal code chip. It has no subject colour and won't scale past about 6 subjects. There is no semester grouping, although `semester_name` / `semester_number` / `program_name` are returned.
  - The "Recommended next step" banner `.sl-ov-next` is an **orange-soft surface the full width of the page** (`student-learning.css:139`). That breaks rule 4 (no orange surfaces larger than a pill / bar).
  - KPI icons (`.sl-ov-ic`) are grey and the meter is green. The chapter table (L237) has no filter (status / assessment state) and no search, though the API supports `q`.
- **Classroom** (`?subject=&chapter=`):
  - The play button `.sl-play` is an orange button with no text (Playwright found an orange `<button>` with empty text). Check it has an `aria-label`.
  - The stage progress bar is orange (`.sl-stage-bar`) while every other watch bar is green or teal.
  - "Classroom / AI tutor" tabs are in the URL (good).
- At 390 there is no overflow. The pill row wraps to 2+ lines.

**Target**
- Sub-views stay as they are: **Subject list → Subject overview → Classroom / AI tutor tabs.**
- Subject switcher:
  - Up to 6 subjects: grouped by semester. Each item has a subject-colour dot, code, name and a `x/y` mini bar in the subject colour.
  - More than 6 subjects, or at 390: a `QuirriSelect` grouped by semester.
- Overview KPIs:
  - Lectures watched: subject-colour bar.
  - Assessments completed: `x/y`.
  - Average: `BandPill`.
- Recommended next step moves to a **white card with the 4px title rule** and one orange CTA.
- Chapter table: filter `SegTabs` All · Not started · In progress · Watched · Assessment ready · Completed. Search (`q`). The assessment column is a `BandPill` with the score.
- Classroom: the stage bar uses the subject colour. The chapter list has a subject-colour number disc for the active chapter and a ✓ green tick when watched.

**Functional gaps**
- Watch progress is a `PUT` (L392). It is blocked in the audit, so there is no live verification.
- A subject with more than 100 chapters is truncated (`pageSize: 100`, L645). There is no paging.

---

## 3. Assessment `/student/assessment` (`assessment/page.jsx` → `shared/McqStudentQuiz.jsx`)

**Purpose (SOW §6.4.3).** Attempt after the chapter is complete. Auto-evaluated, immediate score, PDF report download.

**Current problems (results view, quiz not submitted in the audit)**
- Both "← Back to classroom" **and** a breadcrumb are shown (duplicate navigation).
- The score ring is orange for 20%, which is correct for focus. The "Needs improvement" pill is a third wording (X1).
- Correct / incorrect icons are red ✕ and green ✓. Red is fine for a wrong answer, but the result pill should use the band colours.
- The tabs Overview / Question review / Study next are good and URL-backed (`view=`).
- The shared component is owned by the shared-modules writer, so changes go there.

**Target**
- Keep the 3 tabs. The ring and pill come from `bandFor`.
- Add a **Distribution** bar (correct green / incorrect orange / unanswered grey) next to the ring.
- The question table gets a filter (All / Incorrect / Correct; `filter=` already exists in the URL state).
- The header keeps the breadcrumb only. The subject-colour dot goes on the subject crumb.

**Functional gaps:** The pre-quiz "watch_required" and "unavailable" states were not seen live. They need a check with a fresh chapter.

---

## 4. Leaderboard `/student/leaderboard` (`leaderboard/page.jsx`, `student-leaderboard.css`)

**Purpose (SOW §6.4.4).** Real-time cohort ranking on correct scores; the student sees their position relative to peers.

**Current problems**
- **Rank colours.** Ranks 2 and 3 are both teal: `.slb-rankcell.is-2,.is-3` (`student-leaderboard.css:83`), and the medals use `.slb-medal` (L51-52). Target: 2 blue, 3 purple.
- **Score bar.** `.slb-bar i` is teal for 50–74 on the 75/50 bands (L88-91).
- **Podium with one participant.** The podium renders for a single participant, so it duplicates the only table row (390 screenshot). Show the podium only when there are 3 or more participants.
- **Two primary-looking blocks.** The hero has the orange "Continue learning" CTA, and the filter bar is a solid teal block too.
- **Unused data.** `me.percentile` is returned (`leaderboard.py:149`) but never shown.
- **Assessment filter has no subject context.** `assessments[]` carries only `job_id`, `title` and `attempts`.

**Target**
- Hero:
  - The rank ring (rank-colour ring, orange for #1).
  - "Top X%" from `percentile`.
  - `gap_to_next`.
- KPI row:
  - Participating (green meter).
  - Class average (`BandPill`).
  - Top score.
  - Latest.
- Filters:
  - Assessment `QuirriSelect` (existing).
  - **Subject** filter: needs backend field `subject_id` / `subject_name` on `assessments[]` (and optionally a `subject_id` query param).
  - Search (existing).
- Table: `RankList`-style rank badges in rank colours. The score bar and % use band colours. The "me" row gets a teal tint (existing).
- Add a **Distribution** of class scores by band. Computable from `items[].avg_score` (up to 100 rows) with no backend change.

**Functional gaps**
- The 15 s polling plus `focus` and `visibilitychange` can trigger triple reloads.
- When `me` is ranked outside `LIMIT` (100), they are absent from the table. `me` is returned separately, so pin a "You" row.

---

## 5. Interviews `/student/interviews` (`InterviewsClient.jsx`, `live/page.jsx`)

**Purpose (SOW §6.4.5).** The embedded interview tab: assigned by Faculty/HOD or self-initiated (final year), voice + avatar.

**Current problems (locked state seen live; wizard read from code only)**
- **Locked view.** It uses `<a href>` not `Link` (L361-362, a full reload). It hides the topbar and renders its own `h1` (X5).
- **Assigned interviews.** Only `openAssignments[0]` is shown ("+N more", L341) with no list, due dates or status. `reportsData` is fetched (L145) only for limits.
- **Heading case.** Wizard headings are Title Case ("Choose Interview Mode", "Resume Disclaimer", "Interview Summary", L465/531/620). The rest of the portal uses sentence case.
- **Duplicate route.** `/student/interviews/report` and `/reports` routes are 6–7 line redirects, and the sidebar also has "Reports". Two ways to reach the same list.

**Target**
- Route tabs (`ModuleTabs`): **Start interview** (wizard) · **Assigned** (`GET /interview-assignments`: title, mode, due date, status pill, start button) · **History** (link to Reports, or merge Reports into this module).
- Mode cards: Mock and Full each get a fixed categorical hue (cat-1, cat-4) for the icon disc only.
- Limits strip: used/total in orange text (per §2b).
- Locked state: a white card with the reason and links, inside the normal topbar.

**Functional gaps**
- Not testable with this account (not final year). Retest the wizard with a final-year student.
- Do not start a live session.

---

## 6. Reports `/student/reports` + `/student/reports/view` (`reports/page.jsx`, `components/student/reports/*`)

**Purpose (SOW §5.3, §6.4.5).** Interview score report with per-question feedback and an improvement plan. SOW §5.3 also lists "downloads PDF reports" for assessments.

**Current problems**
- **List page.**
  - The KPIs (Total 9 / Average 21 / Highest 68) are tiny numbers floating at the right (`.srp-kpis`, L92) with no band colour.
  - The rows waste width: the zero-padded index "01–09" carries no information (L131).
  - The score is coloured only orange or teal.
  - The filter bar has two buttons: a teal "Clear" plus the orange "Search". This is the only page with apply-on-submit; the leaderboard applies live.
  - The score filter options are 80+/50–79/<50 (L22). These are backend bands and differ from the 80/60 display bands.
- **MCQ assessment PDFs are not listed anywhere.** They are reachable only per chapter.
- **View page.**
  - About 10 sections on one scroll: hero, 4 KPIs, recording, skills, next practice, question table, insights, share, action plan, next interview.
  - Skill breakdown colours bars by band (`ReportSections.jsx:62-73`, "teal disc"). The §0b reference wants one **categorical hue per skill**.
  - The question-number discs are all orange.
  - The button label reads "Download for Excel".

**Target**
- List:
  - KPI row (Total · Average `BandPill` · Highest · Last 30 days).
  - A **TrendChart** of score over `completed_date` (teal line, orange markers).
  - Rows: title, type chip, date, score `BandPill`.
  - Filters apply live (type `SegTabs` Mock/Full, score band, date, search). Drop the Search button.
  - Optional tab **Assessments** that lists MCQ results with a PDF link. **Needs backend:** a list endpoint of the student's own `mcq_attempts` (job_id, chapter title, subject_id, percentage, submitted_at). Today only per-job `GET /mcq/jobs/{id}` and `report.pdf` exist.
- View:
  - Tabs (`useTabParam`): **Summary** (hero, KPIs, skills, insights) · **Questions** (feedback table + recording) · **Plan** (next practice, action plan, share).
  - Skills: categorical hue per skill (cat-1…6 in fixed `REPORT_SKILLS` order) for disc + bar, with `BandPill` for the score.

**Functional gaps:** Report recording / audio only for full interviews. That is by design, but it shows two empty boxes for mocks; hide the card instead.

---

## 7. My progress `/student/progress` (`progress/page.jsx`, `student-progress.css`)

**Purpose (SOW).** Not a named SOW screen. It supports §6.4.1 progress tracking and §6.4.3 scores. It overlaps with Home.

**Current problems**
- Overview / Details tabs are URL-backed (good).
- KPI icons are blue, orange and teal by position, not by meaning.
- The Details subject chips default to the first subject in **dashboard order** ("Other lectures"), while Subjects defaults to CS201 (X2).
- The subject header icon is always blue.
- The chapter table's "Assessment" cell shows an orange pill with "20%" (OK) but no band label.
- **Two orange actions.** "View results" (`spg-btn--accent`) plus the subject page's own orange. Only one orange per view.
- The loading state shows wrong empties and an interview CTA (X7).
- `PerformanceChart` is hand-rolled SVG with hard-coded teal (X10).
- At 390 the header stacks the hamburger above a bold h1. This differs from the topbar pages.

**Target**
- Tabs: **Overview** · **By subject** · **Assessments** · **Interviews**. This splits today's overloaded Details tab.
- Overview:
  - KPI row (watched, green ring · assessment average, `BandPill` · interviews done).
  - **BarList** "Completion by subject", with subject colours.
  - **TrendChart** of assessment scores. One series per subject when there are 2+ subjects (subject colours), otherwise teal.
- By subject:
  - Subject select / chips with the colour dot.
  - The chapter table with a status filter.
  - The learning record.
- Assessments: a history table with `BandPill`, plus a **Distribution** by band.
- Interviews: a list, a trend, and a link to the report.
- Merge, or remove from Home, whatever duplicates Home.

---

## 8. Settings `/student/settings` (`shared/AccountSettings`)

**Purpose.** Profile + password (account activation flow).

**Current problems:** None specific to the student portal. It has Profile / Security tabs. Owned by the shared module.

**Target:** Unchanged. Keep sentence-case headings consistent.

---

## Student patterns the admin portals should copy

- **Teal hero + one orange CTA + white "light" secondary.** `.sh-hero` / `.slb-hero` (overline, title, meta line, CTA pair, icon tile). This is the product's signature surface.
- **Teal insight side panel.** `.sh-focus` / "Study focus": title, 2 lines, solid teal button + outline button.
- **KPI card with icon tile + teal sub-text.** `.sh-stat` / `.slb-kpi` (label, big ink value, small teal sub, optional meter).
- **Item rows on teal tint inside a white card.** `.sh-subject`, `.sd-recent-row`, `.srp-row`: icon disc, name + meta, metric columns, outline `sm` button on the right.
- **Category tiles.** `.sh-tile--c1…c6` (soft disc + hue icon). Reuse them for any list of like items (departments, subjects, skills).
- **Teal filter bar.** `.slb-filter`: a select and search on a teal strip, with a live-status chip.
- **Rank cells / podium.** `.slb-rankcell`, `.slb-pod` (after applying the rank colours).
- **Centered empty state.** `.sh-empty`: grey disc icon, bold title, one line, pill link.
- **Underline tabs in the URL.** Progress `?tab=` and subjects `?tab=`, i.e. the `useTabParam` pattern.
- **Score text `x/100` with a small `/100`** (`.sh-line-score small`). Interview scores are "/100" and quiz scores are "%" (S11 rule).

Admin portals should take these from shared `module-ui` / `data-viz` equivalents, not by importing `student-*.css`.

---

## Prioritised build list

**P1**
1. One band helper everywhere: `bandFor` / `BandPill`, 80/60 (X1). Delete 6 local copies and the hex in `InterviewReportModal`.
2. Stable subject colour `dataColor(subject_id)`, with grey for "Other lectures", on Home, Subjects, Progress and Assessment (X2). Watch bars in the subject colour (X4).
3. Leaderboard rank colours 2 = blue, 3 = purple. Score bars by band. Podium only when participants ≥ 3. Show `percentile`.
4. Home: cut to 6 cards; remove the duplicate Recent lectures / Continue learning / Subject progress; one orange action; fix the "College leaderboard" fallback.
5. Loading states: skeletons; no fallback CTA or empty copy before data arrives (X7), on Home and Progress.
6. Subjects: move the next-step banner off the orange-soft surface; add a chapter status filter + search.
7. Unify page headers (topbar on every page, X5) and button classes onto `sd-btn` (X3).

**P2**
1. Progress tabs: Overview · By subject · Assessments · Interviews, with BarList, TrendChart and Distribution.
2. Reports list: KPI row with bands, trend chart, live filters, no index numbers. Report view split into Summary / Questions / Plan tabs. Categorical skill hues.
3. Interviews: Start / Assigned / History route tabs; full assignment list with due dates; `Link` instead of `<a>`; sentence-case headings.
4. Assessment results: Distribution bar; band-coloured result pill; single breadcrumb.
5. Backend: quiz state on `GET /edu_video/student/videos` or `GET /mcq/my-attempts` (X8). This removes the N+1 calls and the 24-chapter cap.

**P3**
1. Leaderboard subject filter (needs backend `subject_id`/`subject_name` on `assessments[]`).
2. Reports "Assessments" tab listing MCQ PDFs (needs the my-attempts endpoint above).
3. Content alignment at 1440 (X6); prune `student-*.css` after the merge; delete `InterviewNav.jsx`; swap `PerformanceChart` for `TrendChart`.
4. Subject switcher → grouped select when there are more than 6 subjects; paging past 100 chapters.

## Out-of-SOW items (marked)

- **[Out of SOW]** The Dashboard and My progress pages themselves. They are not named in §6.4 but support §6.4.1 / §6.4.3. Keep them lean; don't add new metrics.
- **[Out of SOW]** Shareable results (LinkedIn / WhatsApp / score card) on the interview report.
- **[Out of SOW]** Leaderboard subject filter and percentile display. These are enhancements to §6.4.4; SOW only requires the position relative to peers.
- **[Out of SOW]** Interview score trend charts. SOW asks only for the per-session report.
- Mobile app / offline downloads are excluded by SOW §14. "Download lecture" in the classroom (`subjects/page.jsx:563`) is a browser file download, not offline mode. Flag it to the owner if it counts as "downloaded content".
