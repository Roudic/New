# AGENTS.md

## Cursor Cloud specific instructions

This repo contains **two independent Node.js/npm products** (Node 18+; VM has Node 22):

| Product | Path | Dev command | Port | Notes |
|---------|------|-------------|------|-------|
| JoltCheck (kitchen audit / checklist platform) | repo root | `npm run dev` | 3000 | Next.js 14 + Prisma + SQLite |
| J.A.R.V.I.S. (AI computer-control assistant) | `jarvis/` | `npm run dev` (or `npm run jarvis` from root) | 3001 | Express + Vite web UI + OpenAI |

Standard scripts live in each `package.json`; the READMEs (`README.md`, `jarvis/README.md`) cover normal usage. Only the non-obvious caveats are captured below.

### JoltCheck (root)

- **Storage mode is auto-detected at runtime** via `GET /api/health` (see `src/context/AppContext.tsx`). If `DATABASE_URL` is set and the DB is reachable/seeded, the app runs in **cloud mode** (real Prisma DB, NextAuth login). Otherwise it silently falls back to **localStorage "Offline demo mode"** in the browser. The login panel subtitle tells you which mode you're in ("crew assignments sync across devices" = cloud; "Offline demo mode" = local).
- The update script only copies `.env` and runs `prisma generate`. To get a working **cloud-mode** dev environment you must also create + seed the local SQLite DB (these are NOT in the update script because they write files/data):
  ```bash
  npm run db:push   # creates prisma dev.db from schema
  npm run db:seed   # seeds admin + 2 employees + 6 templates + 3 assignments
  ```
  `dev.db` is gitignored, so re-run these on a fresh VM if you need real data.
- Demo accounts (seeded): admin `admin@joltcheck.com` / `admin123`; employees `alex@store.com` / `sam@store.com` / `employee123`. Seeded location is **"Main Street Kitchen"**.
- First page load triggers Next.js on-demand compilation and can be slow; if the dashboard shows "Main Street Location" with all zeros, the session hasn't hydrated yet — hard-refresh and wait a couple seconds.
- Lint: `npm run lint` (one pre-existing `react-hooks/exhaustive-deps` warning in `AppContext.tsx`, not an error). There is **no test suite**.

### J.A.R.V.I.S. (`jarvis/`)

- `npm run dev` runs `scripts/dev.mjs`, which auto-creates `jarvis/.env` from `.env.example`, builds the web UI on first run, and picks the first free port starting at 3001.
- The chat/agent is the core feature and **requires a real `OPENAI_API_KEY`** (or an OpenAI-compatible endpoint via `OPENAI_BASE_URL`, e.g. Ollama). Without a valid key the server, `/api/health`, `/api/config`, and the web UI all still load, but `POST /api/chat` returns an auth error (the `.env.example` placeholder `sk-your-key-here` yields a 401). Set `OPENAI_API_KEY` in `jarvis/.env` (or as a secret) to exercise chat end-to-end.
- `JARVIS_WORKSPACE` sandboxes which directory JARVIS can touch (defaults to the home dir). For repo work, start with `JARVIS_WORKSPACE=/workspace npm run dev`.
- No lint or test scripts are configured for JARVIS.
