# Graph Report - .  (2026-08-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 440 nodes · 498 edges · 51 communities (44 shown, 7 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `13c167d9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 49|Community 49]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `scripts` - 9 edges
3. `normalizeLoginSession()` - 7 edges
4. `resolveLivekitBrowserUrl()` - 7 edges
5. `B2B Project K — SuperAdmin Frontend` - 7 edges
6. `useAppDispatch()` - 6 edges
7. `useAuth()` - 5 edges
8. `Graphify token memory` - 5 edges
9. `AppSidebar()` - 4 edges
10. `SuperAdminSidebar()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `LoginPage()` --calls--> `useAppDispatch()`  [INFERRED]
  src/app/auth/login/page.js → src/store/hooks.js
- `SuperAdminLayout()` --calls--> `useAppDispatch()`  [INFERRED]
  src/app/superadmin/layout.jsx → src/store/hooks.js
- `RoleGuard()` --calls--> `useAuth()`  [INFERRED]
  src/components/shared/RoleGuard.jsx → src/hooks/useAuth.js
- `normalizeLoginSession()` --calls--> `getPermissions()`  [INFERRED]
  src/lib/auth/rbac.js → src/lib/permissions.js
- `AppSidebar()` --calls--> `getSidebarWidth()`  [INFERRED]
  src/components/shared/AppSidebar.jsx → src/lib/constants/layout.js

## Import Cycles
- 1-file cycle: `src/lib/axios.js -> src/lib/axios.js`

## Communities (51 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (17): LoginPage(), SuperAdminLayout(), AppSidebar(), BlurredSection(), UpgradeOverlay(), RoleGuard(), getInitials(), NAV_ITEMS (+9 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (39): dependencies, axios, clsx, @hookform/resolvers, lucide-react, next, react, react-dom (+31 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (17): adminAnalyticsApi, adminReportsApi, studentsApi, dashboardApi, contentApi, facultyStudentsApi, jobsApi, paymentsApi (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (11): metadata, Providers(), NAV_ITEMS, USER_MENU, Logo(), PLAN_CONFIG, PlanBadge(), queryClient (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (18): authApi, loginViaAuthEndpoint(), loginWithRbac(), applySuperAdminCookies(), normalizeSuperAdminResponse(), superAdminLogin(), superAdminLoginViaPlaceholder(), BACKEND_USER_TYPE_TO_ROLE (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (11): InterviewCard(), ScoreRing(), SkillBar(), formatDate(), PLAN_STYLE, STATUS_STYLE, getApiBaseUrl(), getApiOrigin() (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (21): compilerOptions, allowJs, baseUrl, esModuleInterop, ignoreDeprecations, incremental, isolatedModules, jsx (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.19
Nodes (12): extractSessionId(), interviewApi, parseLivekitStartResponse(), normalizeLivekitSession(), persistLivekitSession(), readLivekitSession(), getLivekitUrlForCurrentOrigin(), INTERNAL_LIVEKIT_HOSTS (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (14): AI_USAGE, AUDIT_LOGS, COLLEGE_VIEW_DEPTS, COLLEGES, DASHBOARD_METRICS, DEPARTMENTS, DEPT_SNAPSHOT, EMAILS (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (3): REQUIRED_COLS, ROLE_OPTIONS, usersApi

### Community 11 - "Community 11"
Cohesion: 0.20
Nodes (9): child, data, file, fs, lockFile, now, outDir, path (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (7): billingPeriodLabel(), formatInr(), normalizePlan(), normalizePlansList(), PLAN_COPY, PLAN_ID_BY_TYPE, resolveApiPlanId()

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (7): Auth, B2B Project K — SuperAdmin Frontend, Getting started, Repository, Routes, Scripts, Tech stack

### Community 16 - "Community 16"
Cohesion: 0.43
Nodes (6): buildTrendAxisLabel(), formatTrendDate(), SKILL_LABELS, sortTrendItems(), toDisplayScore(), transformDashboardResponse()

### Community 17 - "Community 17"
Cohesion: 0.48
Nodes (6): DEFAULT_POPULAR_ROLES, filterRoleSuggestions(), getRecentRoles(), getRoleSuggestions(), normalizeRole(), saveRecentRole()

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (6): forgotPasswordSchema, loginSchema, otpSchema, profileSchema, resetPasswordSchema, signupSchema

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (5): fs, graphPath, hasGraph, path, reportPath

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (5): After every change, Do not, Every prompt / run, First-time / rebuild, Graphify token memory

### Community 23 - "Community 23"
Cohesion: 0.50
Nodes (3): fs, hasGraph, path

## Knowledge Gaps
- **157 isolated node(s):** `fs`, `path`, `hasGraph`, `fs`, `path` (+152 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `axios` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `normalizeLoginSession()` (e.g. with `loginViaAuthEndpoint()` and `loginWithRbac()`) actually correct?**
  _`normalizeLoginSession()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `fs`, `path`, `hasGraph` to the rest of the system?**
  _157 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06262626262626263 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05398110661268556 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07526881720430108 - nodes in this community are weakly interconnected._