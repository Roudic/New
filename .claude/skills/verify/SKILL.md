# Verify: JoltCheck / KitchenCheck

How to build, run, and drive this app for verification.

## Setup + launch (cloud mode with local SQLite)

```bash
npm install
cd drive-thru-pulse && npm install && cd ..   # pulse sub-app needs its own deps or the build fails
cp .env.example .env                           # DATABASE_URL=file:./dev.db etc.
npm run db:push && npm run db:seed
npm run dev                                    # http://localhost:3000
curl -s http://localhost:3000/api/health       # expect {"ok":true,...,"needsSeed":false}
```

Without `.env`/DB, the app falls back to localStorage "offline demo mode" — a different code path. Verify cloud mode unless the change is demo-mode-specific.

`npm run build` runs prisma generate + the pulse Vite build + next build.

## Accounts (from seed)

- Admin: `admin@joltcheck.com` / `admin123` → lands on `/admin`
- Employees: `alex@store.com`, `sam@store.com` / `employee123` → `/employee`

## Driving it (Playwright, mobile viewport)

Launch with `executablePath: '/opt/pw-browsers/chromium'` (pinned version mismatch otherwise).
Use viewport 390x844, isMobile — this app is phone-first.

Flows worth driving: admin login → `/admin/team` (invite crew, copy `/invite/<token>` link) →
accept invite in a second browser context (sets password, then "Go to sign in" button — no
auto-redirect) → `/admin/assign` (selects are `#template` and `#employee`, value = email) →
crew `/employee` → "Start Audit" → run page tasks.

## Gotchas

- Storage mode resolves async (`/api/health`); login button shows "Connecting..." until then.
  Anything read from context before that resolves is empty by design — don't "fix" it back
  to demo data.
- Checkbox tasks render a "Mark Complete" **button**, not an `<input type=checkbox>`.
- The invite/team pages are DB-backed only; each test run needs a unique invite email
  (accounts persist in dev.db).
- "Start Audit" card buttons re-render mid-click (label flips to "Continue Audit") — fire
  the click without awaiting it, then `waitForURL('**/run/**')`.
- Benign noise in dev log: `prisma:error ... duplicate column name` on every health check
  (idempotent auto-migration by catch).
