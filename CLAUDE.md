# CLAUDE.md

This repo's agent instructions live in **[`AGENTS.md`](AGENTS.md)** — read it first and follow it.

Then, in this order:

1. **[`docs/agent/HANDOFF.md`](docs/agent/HANDOFF.md) § Current (2 Nov 2026)** — live session memory. Older HANDOFF sections are history.
2. **[`docs/knowledge/product.md`](docs/knowledge/product.md)** — how the whole product works (roles, hierarchy, content→student loop, what is off).
3. **[`docs/knowledge/index.md`](docs/knowledge/index.md)** — one file per role, flow, table, API, metric. Open only the concept you need.

## Every change

- Operating pack: [`docs/agent/`](docs/agent/) — follow `task.md` BEFORE / DURING / AFTER.
- UI: [`docs/agent/design-system.md`](docs/agent/design-system.md) is the source of truth. Run §6 BEFORE and §7 AFTER for any visual change.
- Product facts: [`docs/knowledge/product.md`](docs/knowledge/product.md) then the one file in [`docs/knowledge/`](docs/knowledge/index.md) the task touches. If a role, rule, flow, table, API, or metric changes, update that file and `docs/knowledge/log.md`, then `node scripts/check-knowledge.mjs`.
- Always-apply rules in `.cursor/rules/*.mdc` apply to Claude Code as well.
- Graph: `py -m graphify query "<intent>" --budget 1500` before exploring; `py -m graphify update . --no-cluster` after edits. (`graphify.exe` is blocked by Windows Application Control on this machine.)

## Standing locks (do not re-ask)

- Login UI is **frozen** (centered Quirri card). Auth logic may change; visuals may not.
- No mocks in `src/`. Missing API → loading / empty / error.
- No plan / licence / subscription UI. Colleges use **student seat cap** only.
- One orange `#F5821F` (`--accent` / `--highlight`). Never `#AC5B16` in product UI.
- Poppins 400/500 (700 only ≥28px). Radii 6 / 8 / 16. Canvas `#EEF0F0`. White sidebar.
- Commit / push **only when the owner asks**. Never echo passwords.

## Local run (Windows + WSL)

| Piece | Where |
|---|---|
| Frontend | this repo · `npm run dev` · `http://localhost:3000` · proxy `API_PROXY_TARGET=http://localhost:8000` |
| API | `E:\b2b\b2b_projectk` · uvicorn `app.main:app --host 127.0.0.1 --port 8000` **without `--reload`** |
| Python env | `E:\b2b\b2b_env` |
| DB | **WSL Postgres 18** (not Windows Postgres) · Alembic head **0050** |

If the API looks down: `wslrelay` can hold port 8000 after a hung distro. `wsl --shutdown`, wait, start Postgres (`pg_isready`), then uvicorn without `--reload` (bind on `/mnt/e` takes ~2 min). Alive check: `GET /api/v1/health` returns **401** (auth required). API docs are local only.

Seed emails (the owner holds the password; QA helpers read `QA_PASSWORD` from the environment — never store it in the repo): `xplain@yopmail.com` · `college1@yopmail.com` · `hod@yopmail.com` · `faculty@yopmail.com` · `student@yopmail.com`. Login rate limit ~5/min.
