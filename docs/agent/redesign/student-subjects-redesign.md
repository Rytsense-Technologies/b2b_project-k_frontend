# Student → My subjects: industry-standard redesign (owner, 21 Oct 2026)

Owner (with screenshots of `/student/subjects?s=…` for "Data Structures" and "Other lectures"): "The UI and this module dashboard is confusing and not as regular as industry-standard UI. Make it easy to access, easy to understand, aligned correctly, with proper card divs."

## What is confusing today
- Subjects are text tabs with cryptic counts ("1/1", "1/2").
- The summary card crams an icon tile, 3 stats, "Ask AI tutor" and "How learning works" into one strip.
- "Recommended next step" is a second card that repeats information from the chapter list.
- A heavy teal filter bar (search + status + Clear + Search) sits above 1–2 chapters.
- The section title "Chapters" is teal while everything else is ink.
- Chapter rows end with inconsistent right-side text ("Assessment ready", "20% Needs focus", "Locked") and have no explicit action button — users don't know what to click.

## Target (pattern used by Coursera / Udemy / LinkedIn Learning "My learning")
### Level 1 — `/student/subjects` (no `s=`): subject overview
- Header (title + subtitle, from pageMeta).
- Optional slim summary strip: subjects · lectures watched x/y · assessments done x/y · average (one white card, 4 stats, no buttons).
- **Subject cards grid** (3 columns ≥1280, 2 ≥768, 1 on phone; equal heights): each card = colour tile with code, subject name (2 lines max), meta (programme · semester or "Other lectures"), a progress `ScoreRing` (md) for lecture completion, 3 small stats (Lectures x/y · Assessments x/y · Average % or "—"), a one-line "Next: …" hint, and ONE primary action at the bottom ("Continue" → the next lecture/assessment, or "Open subject"). Whole card clickable to the subject page; button is the primary.
- Empty state inside a card.

### Level 2 — `/student/subjects?s=<key>`: subject page
- Back link "← All subjects" + breadcrumb-like context (keep the header title "My subjects" or show the subject name as the page title — pick what reads best).
- **Subject header card**: tile + name + meta on the left; on the right a progress ring + 3 stats; secondary actions as quiet text buttons below/at right ("Ask AI tutor", "How learning works") — no crowding; on phone it stacks.
- **"Up next" card** (only if there is a next action): one sentence + ONE orange primary button (Resume lecture / Take assessment / Review results). This replaces "Recommended next step"; don't repeat it in the list.
- **Chapters**: section title in ink with count ("Chapters · 2"). Search + status filter only when there are more than 6 chapters, as a light inline toolbar (not the heavy teal bar); otherwise none.
- **Chapter cards/rows** (consistent columns, aligned): number · title · meta (duration · published date) · **status chip** (text + dot, one vocabulary: Not started / In progress 15% / Watched / Assessment ready / Locked / Completed – score%) · **one explicit action button** on the right (Watch / Resume / Take assessment / View result; Locked shows a disabled "Locked" with the reason on hover-free text below, e.g. "Watch 100% to unlock"). Whole row also opens the classroom; the button is the obvious target. Progress for in-progress lectures as a thin line under the row is OK (functional progress).
- Pager only when > 10 chapters.

## Rules
- Keep every existing feature, data source, link and URL param (s=, q, f, p, job, tab=classroom/tutor); keep the classroom view (`?job=`) and AI tutor exactly working — restyle only what's listed. Keep the "How learning works" dialog.
- Spacing tokens `--qs-*` and design rules from `docs/agent/redesign/qa-clean-pass-plan.md`; modern components from `docs/agent/redesign/modern-cards-plan.md` (ScoreRing, MetricList; no horizontal data bars); status = text + dot; one orange primary per region; India formats; no native title tooltips; a11y (links/buttons, focus-visible, 44px targets).
- Files: `src/app/student/(portal)/subjects/page.jsx`, `src/styles/student-learning.css` (+ `src/lib/student/*` helpers if needed). Preserve line endings. No `next build`, no restarts, no commits.
- Verify with the shared helper (`<scratchpad>/qa-lib.cjs`, role `student`) at 1440, 1024 and 390: overview, both subjects, a classroom view, AI tutor tab, empty/filter states; no console errors, no horizontal scroll. Screenshots `subj2-*`.
