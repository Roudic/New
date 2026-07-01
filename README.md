# JoltCheck

Operations checklist platform with login, admin assignments, and team progress tracking.

## Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@joltcheck.com` | `admin123` |
| Employee | `alex@store.com` | `employee123` |

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000/login

## Deploy on Vercel (fix for errors)

Most errors on Vercel happen because of **missing env vars** or **SQLite not working on serverless**.

### Step 1 — Create a Turso database (free)

1. Sign up at [turso.tech](https://turso.tech)
2. Create a database
3. Copy the **libsql URL** and **auth token**

### Step 2 — Add Vercel environment variables

In your Vercel project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `libsql://your-db-xxx.turso.io` |
| `TURSO_AUTH_TOKEN` | your Turso auth token |
| `NEXTAUTH_SECRET` | any long random string |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `SETUP_SECRET` | random string (for one-time seeding) |

### Step 3 — Deploy, then seed the database

After the first deploy succeeds, run once from your computer:

```bash
# Push schema to Turso
DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npm run db:push

# Seed demo users and checklists
DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npm run db:seed
```

Or use the setup API:

```bash
curl -X POST https://your-app.vercel.app/api/setup \
  -H "x-setup-secret: YOUR_SETUP_SECRET"
```

### Step 4 — Verify

Visit `https://your-app.vercel.app/api/health`

You should see: `{ "ok": true, "users": 3, "needsSeed": false }`

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm run dev` crashes immediately | Fixed — was a script syntax error |
| Login returns 500 / Configuration error | Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` on Vercel |
| Login works but "Invalid password" for demo accounts | Run `db:seed` or POST `/api/setup` |
| Build fails on Vercel | Ensure env vars are set before redeploying |
| `file:./dev.db` on Vercel | Use Turso `libsql://` URL instead |

## Features

- Admin dashboard with team completion tracking
- Assign checklists to employees
- Custom checklist builder
- Employee task portal with photo/temperature proof
- Completion history and audit trail

## Tech Stack

Next.js 14 · NextAuth · Prisma · SQLite (local) / Turso (production)
