# JoltCheck

Operations checklist app for teams — login, admin assignments, checklist builder, and progress tracking.

> **Also in this repo:** [Drive-Thru Pulse](./drive-thru-pulse/) — a tap-timer app for measuring drive-thru window departure timing at CFA #03339. See [`drive-thru-pulse/README.md`](./drive-thru-pulse/README.md) for setup.

The app **automatically uses a cloud database** when `DATABASE_URL` is configured (Turso on Vercel, SQLite locally). Without a database, it falls back to **localStorage demo mode** on that device.

## JARVIS AI Assistant

A JARVIS-like AI that controls your computer lives in [`jarvis/`](jarvis/README.md). See that README for setup and usage.

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@joltcheck.com` | `admin123` |
| Employee | `alex@store.com` | `employee123` |
| Employee | `sam@store.com` | `employee123` |

## Local Setup (with cloud database)

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000/login

## Deploy on Vercel with Turso (recommended)

### 1. Create a Turso database

1. Sign up at [turso.tech](https://turso.tech)
2. Create a database: `turso db create joltcheck`
3. Copy the **libsql URL** and **auth token**

### 2. Add Vercel environment variables

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `libsql://your-db-name.turso.io` |
| `TURSO_AUTH_TOKEN` | your Turso auth token |
| `NEXTAUTH_SECRET` | any long random string |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `SETUP_SECRET` | random string (optional, for one-time seeding) |

### 3. Deploy and seed

After the first deploy, seed the database **once**:

```bash
# From your computer (with Turso env vars set)
npm run db:push
npm run db:seed
```

Or call the setup API:

```bash
curl -X POST https://your-app.vercel.app/api/setup \
  -H "x-setup-secret: YOUR_SETUP_SECRET"
```

Verify: open `https://your-app.vercel.app/api/health` — should show `{ "ok": true, "needsSeed": false }`.

### 4. Sign in

Use the demo accounts above. Data syncs across all devices.

## Offline demo mode

If no database is configured, the login page shows **Offline demo mode**. Data stays in the browser on that device only.

## Journal & Notebooks (with AI)

Also in this app: a personal **journal / notebook** at [`/journal`](http://localhost:3000/journal).

- **Notebooks** to organize entries, with search, pinning, and tags
- **Live autosave** — entries save as you type (cloud sync when logged in, localStorage in demo mode)
- **Responsive** — three-pane on desktop, swipeable panes on mobile
- **AI Dashboard** at `/journal/dashboard` powered by Claude:
  - Summarize the last 7/30/90 days of writing
  - Reflect on mood and recurring patterns
  - Auto-organize: tag every entry by topic, detect mood, add one-line summaries
  - Ask your journal anything ("when did I last mention the gym?")

AI features require the cloud database plus `ANTHROPIC_API_KEY` in your environment
(get one at [console.anthropic.com](https://console.anthropic.com)). Stats, streaks,
and the journal itself work without it.

## Features

- Admin dashboard with team progress
- Assign checklists to employees
- Custom checklist builder
- 6 built-in templates (opening, closing, food safety, etc.)
- Task types: checkbox, yes/no, temperature, text, photo, number
