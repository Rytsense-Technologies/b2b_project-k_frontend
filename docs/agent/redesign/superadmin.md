# Super Admin portal — redesign audit (14 Oct 2026)

Read-only audit for Phase 1 of `docs/agent/REDESIGN_PLAN.md`. Sources: SOW v1.0 (§3, §5.1, §6.1, §6.2, §6.5.1, §7),
design-system §0/§0b/§2b/§4/§4b/§5, `docs/knowledge/roles/superadmin.md`, `src/app/superadmin/**`, backend
`E:\b2b\b2b_projectk\app\api\v1\*.py`. Live check: Playwright, 1440×900 and 390×844 (isMobile), non-GET aborted,
screenshots `.playwright-mcp/audit-superadmin-<page>-{1440,390}.png` (+ `-drawer-1440` for the list modules).
No horizontal page scroll at 390 on any page (`scrollWidth - clientWidth = 0` everywhere).

Note: the SOW body cites "Section 6.7" for analytics; that section does not exist. The real one is **§6.5.1**.

---

## Cross-portal problems (apply to every page below)

These are the main reasons the portal reads as "AI template":

1. **Same skeleton on every page.** Topbar title + subtitle, then a teal banner that repeats the same title
   (`.topbar h1` "Universities" + `.sp-banner h2` "Universities"; also Colleges, Departments, Academic structure,
   Users, Reports, Health, Notifications), then 4 KPI cards, then a teal filter bar, then a card grid or table.
   About 300 px of the first screen at 1440 (and ~330 px at 390) goes on the banner before any data.
2. **The KPI rows show counts of the list below, not insight.** Universities: Total / Active / Inactive / "Colleges ·
   Students". Colleges: same plus seat usage for the *current page* (`colleges/page.jsx:573-577`, "0% used · listed colleges").
   Departments/Users: "Active · In this list", "With an HOD · In this list" (`departments/page.jsx:425-428`,
   `users/page.jsx:612-622`). Reports: "Rows in preview / Report type / Date range" echo the filters (no information).
3. **Two colours on data.** Every bar is teal (`.sa-bars .track i`, `.co-seat-bar i`), every pill is teal, orange or grey.
   Orange is used for neutral values: the alternate "Students" / "Depts" stat tiles on university and college cards
   (`universities/page.jsx:631`, colleges card tiles) and orange monograms on every other card. This breaks §0b rule 2
   (orange = "look here") and makes zeros look like warnings.
4. **Hand-rolled banners and pagers.** Universities and Colleges do not use the kit (`universities/page.jsx:513`,
   `colleges/page.jsx:692` hand-build `.sp-banner`; custom `.un-pager` at `universities/page.jsx:689`, `colleges/page.jsx:892`)
   while Departments/Users/Notifications use `ModuleBanner` + `Pager`. CTA copy is title case: "New University",
   "New College" (`universities/page.jsx:532`, `colleges/page.jsx:710`), against §5.
5. **Decorative hierarchy chips** ("University › College › Department") in banners are not links and add nothing.
6. **No search debounce.** `SearchBox` (`components/superadmin/quirri-ui.jsx:248`) fires `onChange` per key and every page
   puts the raw value in the request deps → one API call per keystroke.
7. **Filters are not in the URL.** Search, status, university, role, view and page are `useState` only; back button and
   shared links lose them. (`useTabParam` / query state from the plan should also hold filters.)
8. **Sidebar at 900 px tall** clips the last item: "Settings" is cut by the user-card divider (see any `-1440.png`).
9. **390:** tables are kept as tables inside `.sp-table-wrap` and clip (Users shows only User + half of Role; status and
   actions need a sideways swipe inside the card). KPI labels wrap to 2–3 lines in 2-column tiles. Filter bars stack 4 rows tall.

---

## 1. Dashboard — `/superadmin/dashboard` (`src/app/superadmin/dashboard/page.jsx`)

**Purpose (SOW §6.5.1, §5.1):** total institutions onboarded, active students, overall completion rate, average assessment
score across institutions, top Q&A queries, watch time, platform health.

**Backend (`dashboard.py`):** `metrics[6]` (institutions, active students, faculty & HOD, platform users, completion %, avg score),
`institution_activity[]` per active college (`students, watch_minutes, watch_time, qa, assessments, interviews, avg_score,
completion, university, code, status`), `top_qa[8]` (`topic, count, chapter`), `content_pipeline[≤10]`, `alerts: []`.
Accepts `range` = `last_7_days | last_30_days | last_90_days | this_semester | all_time`.

**Current problems**
- Range hard-coded: `dashboardApi.getOverview({ range: 'last_30_days' })` (`:177`); no range control although the backend supports 5.
- Hero (`PortalHero`, `:207-228`) is a marketing blurb ("Every university, college and user on Quirri, in one place…") plus
  "Onboard a university" — a once-a-year action as the page's main CTA. The useful part is the side "Attention needed" list.
- 6 KPI tiles in a 3×2 grid; "Platform users" and "Faculty & HOD" are directory counts, not adoption. Watch time (an SOW metric)
  is **not** a KPI — it only exists per row.
- Institution activity table (`:251-303`) is in the 2/3 column and clips at 1440: the **Status** column is scrolled off
  (see `audit-superadmin-dashboard-1440.png`). At 390 only Institution + Students are visible.
- Top Q&A (`:305-330`): single-teal bars; data shows non-questions ("That is all from my side.", "And I did a two month front end
  internship…") and the "chapter" is a file name (`03_dc_motors_combined.pdf`) — backend groups every `QnaTurn.question`
  (`dashboard.py:168-195`) with `Lesson.title`, which holds the filename.
- Content pipeline panel (`:333-387`) is a full-width empty state most of the time ("No pipeline jobs right now").
- Shortcut cards (`:389-400`) duplicate the sidebar.
- Comparison of institutions (the core question for the Super Admin) is only possible by reading a table.

**Target structure** — no banner; page header + range select on the right (`Last 7 / 30 / 90 days · This semester · All time`,
default 30 days, in `?range=`).
- **Row 1, KPIs (5):** Institutions (sub "4 universities · 5 colleges"), Active students, Completion rate, Avg assessment score
  (`BandPill`), Watch time (needs backend: platform `watch_minutes` total in `metrics` — today derivable by summing
  `institution_activity[].watch_minutes` on the client, acceptable).
- **Row 2:** left 2/3 "Institution comparison" card with an in-card `TabNav` metric switch (Completion · Avg score · Watch time · Q&A)
  rendering `BarList` over `institution_activity` (one row per college, sub = university; colour: `colorBy="band"` for
  Completion/Avg score, `series` for Watch time / Q&A). Right 1/3 "Attention needed" (existing `loadAttention`, as a plain white
  list with orange dots; keep links).
- **Row 3:** left "Top Q&A queries" as `RankList` (rank colours, count right, `showBand={false}`), right "Activity mix"
  `DonutChart` of `qa` / `assessments` / `interviews` summed over institutions (categorical 1-3).
- **Row 4:** "Content pipeline" only when `content_pipeline.length`; otherwise a one-line row in Attention ("No chapters generating").
- Full table moves to Reports (link "Open institution report").
- Score buckets / trend over time: **needs backend** — per-day series (e.g. `trend: [{date, active_students, watch_minutes, attempts}]`)
  before any `TrendChart`; do not fake.

**Functional gaps**
- `top_qa` needs backend filtering to real student questions and a chapter title (not `Lesson.title` = filename).
- `alerts` is always `[]` (`dashboard.py:237`); front end already ignores it — fine, keep computing attention client-side.
- `pickMetrics` fallback keys (`:54-67`) are dead code for the live shape; remove during the rebuild.

---

## 2. Universities — `/superadmin/universities` (`universities/page.jsx`)

**Purpose (SOW §6.2, §3):** create and manage the University level of the hierarchy; onboard affiliated universities.

**Backend:** `GET /universities?q&is_active&page&page_size≤100` → `UniversityListItem` (`name, code, state, district, city, pincode,
address, is_active, created_at, college_count, student_count`); `GET /universities/{id}`; create / patch / deactivate / reactivate.

**Current problems**
- Banner + hierarchy chips + 4 count KPIs + filter bar + 3-column cards, for 4 records (`audit-superadmin-universities-1440.png`).
- Cards spend 300 px each on a monogram, a code chip, a location line and two stat tiles; the orange "0 Students" tile reads as an alert.
- Location shows "Chennai, Chennai, Tamil Nadu, 600001" (city and district duplicated, `locationLine`).
- KPI 4 "Colleges · Students 5 · 2" is two numbers in one tile, scoped to the listed rows.
- Drawer (`:240-360`) lists member colleges but has no "Add college here" action; link goes to `/superadmin/colleges` without
  `?university=<id>`, so the filter is lost.
- Status counts need 3 extra list calls (`:393-399`) on every refresh.

**Target structure** — one page, no tabs needed at the list level; a **university detail sub-page**
`/superadmin/universities/[id]` with route `ModuleTabs`: **Overview · Colleges · Students**.
- List: header row (title, count, one orange "Add university"), compact filter row (search, status chips All/Active/Inactive,
  state select from India list), default **table** view (University+code, Location `city, state`, Colleges, Students, Status, actions);
  grid toggle optional. Sort by name / students.
- KPIs (above list, 3): Universities (active of total), Colleges onboarded (sum `college_count`, all pages — needs
  `GET /universities` totals or `page_size=100`), Students (sum `student_count`).
- Visual: "Students by university" `BarList` (`student_count`, `colorBy="series"`) in a side card when > 1 university.
- Detail Overview: InfoList (location, created), KPIs colleges/students, "Students by college" `BarList` from
  `GET /colleges?university_id=`; Colleges tab = the college table filtered; Students tab = `GET /users?role=student` — **needs backend
  filter `university_id` on `/users`** (today only `tenant_id`); until then show per-college student counts only.

**Functional gaps**
- Drawer link to Colleges should pass the university filter; Colleges page must read it.
- `?new=1` opener (`:421-430`) works; keep.

---

## 3. Colleges — `/superadmin/colleges` (`colleges/page.jsx`)

**Purpose (SOW §6.2, §3, §5.1):** onboard member colleges under a university and provision their admins (knowledge: atomic
create, `tenants.student_seat_cap`).

**Backend:** `GET /colleges?q&university_id&is_active&page&page_size` → `CollegeListItem` (`university_name, name, code, location,
plan, student_seat_cap, is_active, admin_count, student_count, department_count`); `GET /colleges/{id}` adds `admins[]`
(`name, email, phone_number, status: active|pending_activation|deactivated`). Learning metrics per college exist in
`GET /reports/preview?report_type=institution&college=<id>&range=` (`departments, students, watch_minutes, completion, qa,
assessments, interviews, avg_score`).

**Current problems**
- University filter only loads the first 25 universities: `universitiesApi.list({})` (`:539`) → default `page_size` 25.
- "Seat usage 2 / 7,700 · 0% used" KPI is computed from the current page (`:573-577`) and is meaningless platform-wide.
- Cards: 3 orange/teal stat tiles + seat bar + 3 buttons each; inactive card is greyed but keeps the same weight.
- Drawer (`audit-superadmin-colleges-drawer-1440.png`): admin with "Pending activation" has no **Resend invite** action;
  no learning numbers for the college at all although the reports endpoint has them.
- Seat bar teal at all levels, orange only ≥ 90% — fine, but at 0% it is just an empty grey line on every card.

**Target structure** — list + **college detail sub-page** `/superadmin/colleges/[id]` with route `ModuleTabs`:
**Overview · Departments · Admins · Learning**.
- List filters: search (name, code, admin email), University select (all universities, `page_size=100`, reads `?university=`),
  status chips All/Active/Inactive (default Active), "Near seat cap" chip (client filter `pct ≥ 90`). Default table view: College+code,
  University, Admins, Departments, Students / seat cap (`Distribution`-style mini bar, teal; orange ≥ 90%), Status, actions.
- KPIs (3): Colleges (active of total), Admin invites pending (count of `admins[].status = pending_activation` — **needs backend**
  `pending_admin_count` on the list item, or use `GET /users?role=college_admin&status=pending_activation` total), Seats used (needs
  backend platform totals; or sum over `page_size=100`).
- Detail Overview: InfoList (university, code, location, seat cap), seat `Distribution` (used / free), KPIs from institution report
  row (completion with `BandPill`, avg score, watch time, Q&A).
- Departments tab: department table from `GET /departments?college_id=` + "Students by department" `BarList`.
- Admins tab: admin list with status pills + Resend invite (exists: `usersApi.resendInvite`).
- Learning tab: `GET /reports/preview?report_type=department&college=<id>` → `BarList` completion by department (`colorBy="band"`),
  `BarList` avg score by department (band), Q&A per department (`series`).

**Functional gaps**
- University select capped at 25 (bug).
- No resend / revoke for college admins from the college context (exists on Users only).
- `plan` field is returned by the API; it must not be displayed (no-plans rule) — currently not shown, keep it that way.

---

## 4. Departments — `/superadmin/departments` (`departments/page.jsx`)

**Purpose (SOW §6.2):** University > College > **Department** level of the hierarchy for any college.

**Backend:** `GET /departments?q&college_id&is_active&page&page_size` → `college_name, name, code, hod_user_id, hod_name,
is_active, student_count`; deactivate returns 409 when students are enrolled, `?force=true` archives.

**Current problems**
- 4 KPIs where 3 are page-scoped ("In this list"); "With an HOD 1" is the only useful signal and it is hidden among them.
- Cards repeat "Not set" HOD in an orange tile on almost every card (`audit-superadmin-departments-1440.png`) — correct use of
  "needs focus" but the grid makes it noise; a table with an HOD column + "No HOD" filter would read faster.
- College filter loads active colleges only (`:403`), so departments of an inactive college cannot be filtered.
- Program count not shown (backend schema says programs are not counted; `DepartmentListItem` has no `program_count`).

**Target structure** — this list becomes the **Departments tab of the college detail page**; keep the flat cross-college page as
a table for platform search.
- Filters: search, College select (all colleges, includes inactive with "(inactive)"), status chips, HOD chip "No HOD assigned".
- Columns: Department+code, College, HOD (orange "Not assigned" text), Students (num), Status, actions.
- KPIs (2–3): Departments, Without HOD (orange value when > 0), Students enrolled — only if computed over all rows
  (`page_size=100`) or **needs backend** totals.
- Visual: "Students by department" `BarList` (`series`) when a college is selected.

**Functional gaps:** none broken; force-archive flow (`:449-470`, `:720-750`) works per code reading (not exercised: non-GET blocked).

---

## 5. Academic structure — `/superadmin/academics` (`AcademicStructureWorkspace`, shared module)

**Purpose (SOW §6.2):** Department > Program > Semester > Subject > Chapter for any college.

**Current problems** (`audit-superadmin-academics-1440.png`)
- Same banner + 4 count KPIs; the master-detail layout below it is good (programme list left, semester tabs right) — keep it.
- Filter bar: "All colleges" + "Pick a college first" (disabled department select) — with no college picked the programme list
  mixes colleges; programme names repeat ("B.E. Computer Science" ×2) and are only told apart by small grey meta.
- Semester tabs show "0 subjects" for 7 of 8 semesters; no hint which semesters need content.
- At 390 the semester tabs and programme panel stack into a 2,100 px page.

**Target structure:** owned by the Shared-modules writer. For Super Admin: default the college select to the first college
(stored in `?college=`), add a University select before it, drop the banner, keep KPIs to Programmes / Subjects / Chapters with
content (`2 of 5` as a `Distribution` covered / not covered). Semester tabs: grey text for empty semesters.

**Functional gaps:** none found in the read-only pass.

---

## 6. Platform users — `/superadmin/users` (`users/page.jsx`)

**Purpose (SOW §6.2, §5.1):** manage all users across institutions (any role incl. another Super Admin).

**Backend:** `GET /users?q&role&department_id&is_active&status=active|pending_activation|deactivated&tenant_id&page&page_size≤100`;
create, patch, role change, deactivate/reactivate, resend/revoke invite, bulk import, bulk-promote-year.

**Current problems** (`audit-superadmin-users-1440.png`, `-390.png`)
- Table overflows at 1440: the action column is clipped (`.sa-users-table`, `:840`); the "You" chip on the own row is cut.
- Institution column wraps to 3–4 lines ("VISTAS (VISTAS-002) — inactive").
- Role pills are all the same grey; role is the main way to scan this list.
- Banner role chips ("Super Admin · 2, College Admin · 5 …", `:624`, `:742`) and KPIs Active/Pending/Deactivated are counted
  from the **current page** (`:612-622`) while labelled as totals ("Invite sent, not signed in").
- No department filter (backend supports `department_id`), no last-active sort.
- At 390 the table shows User + half of Role only; status and actions are off-screen.

**Target structure** — module tabs via `useTabParam`: **All users · Students · Staff (College Admin / HOD / Faculty) · Super Admins ·
Pending invites**. Each tab = same table with the role preset.
- Filters: search (debounced), Institution (all colleges, `page_size=100`), Department (enabled after institution), status chips
  All/Active/Pending/Deactivated (hidden on Pending tab). URL-backed.
- Columns: User (name + email), Role pill (categorical: Super Admin `--cat-4`, College Admin `--cat-1`, HOD `--cat-5`, Faculty
  `--cat-2`, Student `--cat-6` — **owner check**: §0b forbids categorical for status, role is a category so it is allowed),
  Institution (name only, code in `small`), Status, Last active, actions in a kebab menu (View · Resend invite · Change role ·
  Deactivate) to stop the overflow.
- KPIs: replace with a "Users by role" `Distribution` bar over true totals — **needs backend** `counts_by_role` and
  `counts_by_status` on `GET /users` (today requires one call per role/status with `page_size=1`, as the dashboard does).
- 390: row cards (name, role pill, status, chevron to drawer).

**Functional gaps:** page-scoped summaries mislabelled as totals; action column clipped.

---

## 7. Upload & content — `/superadmin/content` (`EduVideoContentStudio platformScope`, shared module)

**Purpose (SOW §6.2, §6.1.1–6.1.4):** upload academic content to any college's chapter, trigger AI course generation, follow
SME review to publication.

**Current problems** (`audit-superadmin-content-1440.png`, 2,700 px tall; 5,300 px at 390)
- Upload form, "How generation works" side panel, filter bar, the full status table and "HOD feedback" are one scroll.
  The filter bar sits mid-page below the form.
- Status table rows: "Untitled chapter · Uploaded 11 Sept 2026" ×4 — no college/subject context; actions differ per row
  (Preview, 3 icon buttons, History, delete, "Send to HOD") with no alignment between rows.
- Failed rows show raw reasons ("Planning produced zero scenes — nothing to teach.").
- 6 status chips + a programme select, but no college filter in the bar (the copy says "Select a college above to narrow the list"
  — that select is inside the upload form).

**Target structure:** module tabs (`useTabParam`): **Library · Upload · Review feedback**.
- Library: filters College, Programme, status chips (All · Generating · Awaiting approval · Published · Failed), search. Status
  `Distribution` across the top (Generating / Awaiting approval / Published / Failed, categorical; Failed stays a red status pill
  in rows). Rows: Chapter, College › Subject, Status, Updated, one primary row action + kebab.
- Upload: the form + "How generation works" side card; the one orange action "Upload and generate".
- Review feedback: HOD feedback list with count badge on the tab.
Owned by the Shared-modules writer.

**Functional gaps:** college filter for the library missing from the filter bar; "Untitled chapter" rows lack chapter linkage.

---

## 8. Reports — `/superadmin/reports` (`ReportsWorkspace`, shared module)

**Purpose (SOW §5.1 "views platform-wide reports", §6.5.2 downloadable reports):** search, preview, export.

**Backend:** `GET /reports/preview?report_type=institution|department|student|qa|interview&college&department&range&search&page`
→ `rows, total, columns`; `GET /reports/download?format=csv|xlsx|pdf`.

**Current problems** (`audit-superadmin-reports-1440.png`)
- KPI row is filler (rows in preview, report type, date range = the filter values).
- Report type is a select; switching type is the main task and should be visible.
- Three export buttons in the banner (Excel, PDF, orange Export CSV) — CSV is not more important than Excel.
- Score column is the only coloured cell.

**Target structure:** tabs = report types (**Institutions · Departments · Students · Q&A · Interviews**, `?tab=`). Filters:
search, College, Department (Students/Departments/Q&A tabs), range select (default Last 30 days). One "Export" split button
(CSV / Excel / PDF). Above the table, one small chart per tab from the same rows:
Institutions/Departments → `BarList` completion (`band`); Students → score `Distribution` by band (strong / on track / needs
focus / no data) from `avg_score`; Q&A → `RankList` top askers; Interviews → score `Distribution`. Completion and score cells
use `BandPill`. Owned by the Shared-modules writer.

**Functional gaps:** none broken in preview.

---

## 9. Platform health — `/superadmin/health` (`health/page.jsx`)

**Purpose (SOW §6.2, §6.5.1, §5.1):** system status, uptime, error logs.

**Backend (`health.py`):** `metrics[4]`, `services[]` (`name, status, p95, note, errors_1h, errors_24h`), `overall_status`,
`errors_by_service[]` (`service, errors_1h, errors_24h`), `pipeline_latency[]` (`name, ms, label, samples`), `uptime_30d/24h`,
`checked_at`; `GET /health/errors?days≤30&service&limit≤200`.

**Current problems** (`audit-superadmin-health-1440.png`)
- The same message appears 3 times: banner chip "Platform has a problem", red `SectionState` (`:193-197`) with the same text,
  and the Uptime/Failed KPIs.
- "Voice tutor · Operational" while the error log shows 10,710 + 1,190 + 1,190 voice-tutor errors: service status only reflects
  the **last hour** (`health.py:231-237`) and the UI never shows `errors_24h` per service. `errors_by_service` is returned and unused.
- "Failed jobs · 24h 0" with sub "13,090 server errors logged in 24h" — two different facts in one tile.
- Pipeline latency (`:252-274`): stage names truncated ("Reading the do…", "Writing the less…"), values wrap ("6m / 46s"), single teal.
- Recent errors: no Service filter or day range although the endpoint supports `service` and `days`; 7 rows only (default limit 50
  but grouped); raw SQL exception text as the headline.
- Uptime 37.86% is likely monitoring gaps (checks only while the API runs locally) — label should say "of checked minutes"
  (data caveat, not UI).

**Target structure** — tabs (`useTabParam`): **Overview · Errors**.
- Overview: overall status strip (one line, coloured by worst state) + KPIs Uptime 30d, API p95, Jobs in queue, Failed jobs 24h.
  Left: Service list with status pill + "errors 24h" number (orange when > 0). Right: "Errors by service · 24h" `BarList`
  (`errors_by_service`, `series` colours). Below: "Video pipeline stages" `BarList` (`pipeline_latency`, value = `label`, wide label column).
- Errors: filters Service select (from `errors_by_service`), range chips 24h / 7d / 30d (maps to `days=1|7|30`, default 7), table
  with first line of the error, path, count, last seen, expandable detail.
- Uptime trend: **needs backend** daily uptime series before any `TrendChart`.

**Functional gaps:** per-service 24h errors not surfaced; unused `errors_by_service`; no errors filters.

---

## 10. Notifications — `/superadmin/notifications` (`notifications/page.jsx`)

**Purpose (SOW §7):** activation via email, interview results by email, system notifications (content, assessments,
assignments), admin pipeline-completion notices. Owner Oct 2026: email only — WhatsApp is not a portal channel.

**Backend:** `GET /notifications/events` (11 events, `channels[].state`, `sent_30d, failed_30d, log_only_30d`, provider);
`GET /notifications/deliveries?status&event&channel&q&days≤90&page` (+`summary`); `POST /deliveries/retry-failed` (retries **7 days**, max 200).

**Current problems** (`audit-superadmin-notifications-1440.png`, 2,700 px)
- Event catalogue (11-row table) sits above the delivery log, so the operational part (deliveries, failures) starts at ~1,550 px.
- Retry button label uses the **30-day** failed count (`:141-144`, `summary.failed`) but the backend retries only the last 7 days → the
  label can promise more than it retries.
- No Channel filter and no range although the API has `channel` and `days`.
- Delivery count pill says "12 in 30 days" even when filters are applied (it is `total` for the filtered query).
- Info notice "Emails are recorded but not sent yet" is permanent page chrome while SES is not configured; fine, but it duplicates the banner chip.

**Target structure** — tabs (`useTabParam`): **Deliveries · Events**.
- Deliveries (default): KPIs Delivered / Failed / Log-only (30d) + `Distribution` of the three (Delivered green, Failed orange/red
  per status rule, Log-only grey); filters search, Event, status chips, range (7/30/90 days, default 30); email only;
  table; retry button only when failed > 0, label "Retry failed (last 7 days)".
- Events: catalogue table + "Messages per event · 30d" `BarList` (`sent_30d + log_only_30d`, `series`).

**Functional gaps:** retry count mismatch; missing channel / range filters.

---

## 11. Settings — `/superadmin/settings` (`AccountSettings`, shared)

**Purpose:** own profile and password (not in SOW as a module; needed for the account).
Current: underline tabs Profile / Security, works, no issues beyond the shared shell. Keep as is.

---

## Prioritised build list

**P1 — fixes + structure that changes how the portal reads**
1. Remove the duplicate banner on list pages (topbar already titles the page); compact header row with one orange action. Use the
   kit everywhere (`ModuleBanner`/`Pager` replacements), sentence-case CTAs.
2. Dashboard: range select (`range` param), 5 KPIs incl. watch time, Institution comparison `BarList` with metric tabs, Top Q&A `RankList`,
   Activity mix `DonutChart`, drop shortcut cards, hide empty pipeline.
3. Fix bugs: Colleges university filter capped at 25 (`colleges/page.jsx:539`); Users action column clipped at 1440; Users/Departments/Colleges
   page-scoped KPIs labelled as totals; Notifications retry label (30d vs 7d); Health per-service 24h errors.
4. Debounced search + URL-backed filters on every list (`useTabParam` / query state).
5. Users: role tabs, coloured role pills, kebab actions, 390 row cards.
6. Health: Overview / Errors tabs, errors by service `BarList`, service + range filters, de-duplicate the problem message.

**P2 — sub-pages and colour on data**
7. College detail `/superadmin/colleges/[id]` (Overview · Departments · Admins · Learning) using the institution / department report rows.
8. University detail `/superadmin/universities/[id]` (Overview · Colleges · Students).
9. Notifications tabs (Deliveries default), channel + range filters, delivery `Distribution`.
10. Default table views for Universities / Colleges / Departments; cards optional; remove orange from neutral stat tiles.
11. Content (shared owner): Library · Upload · Review feedback tabs, college filter in the bar.
12. Reports (shared owner): report-type tabs, per-tab chart, single Export split button.

**P3 — needs backend first**
13. `GET /users` `counts_by_role` / `counts_by_status`; `university_id` filter on `/users`.
14. Platform totals for seats (`student_seat_cap` sum, students) and pending admin invites per college.
15. Dashboard time series (`trend[]`) and daily uptime series → `TrendChart`.
16. `top_qa`: only student questions, with chapter title instead of file name.

## Out of SOW scope (do not build)
- **Audit log UI** — backend `GET /audit-logs` exists and is unused; the SOW asks for error logs (§6.2), not an audit trail. *(out of scope)*
- **Platform-wide leaderboard** — leaderboard is college-scoped and the API refuses Super Admin (`leaderboard.py`); SOW leaderboard is a
  student feature. *(out of scope)*
- **Plan / seat licensing UI** — `plan` field exists on colleges; no-plans rule. Seat cap stays a number only. *(out of scope)*
- **Roles & permissions editor** — `rolesApi` (`/roles`) exists in the client; SOW defines fixed roles (§5). *(out of scope)*
- **Interview analytics for Super Admin** — SOW §6.5.2 puts cohort interview analytics on College Admin; interview module has its own SOW. *(out of scope)*
