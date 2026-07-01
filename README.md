# JoltCheck

A Jolt-inspired operations checklist platform with **login**, **admin assignments**, and a **team progress dashboard**.

## Features

- **Login system** — Admin and employee roles with secure sessions
- **Admin dashboard** — Track pending, in-progress, and completed assignments per employee
- **Assign checklists** — Admins assign any checklist to team members with due dates and notes
- **Employee portal** — See assigned work, start checklists, complete tasks with photo/temp proof
- **Custom checklist builder** — Admins create and edit operational checklists
- **Built-in templates** — Opening, closing, food safety, and more
- **Completion history** — Full audit trail with timestamps

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@joltcheck.com` | `admin123` |
| Employee | `alex@store.com` | `employee123` |
| Employee | `sam@store.com` | `employee123` |

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

## Deploy on Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Add environment variables:
   - `NEXTAUTH_SECRET` — long random string
   - `NEXTAUTH_URL` — your Vercel URL (e.g. `https://your-app.vercel.app`)
   - `DATABASE_URL` — see database note below
3. Deploy, then run `npm run db:push && npm run db:seed` once against your production database

### Database for production

Local dev uses SQLite (`file:./dev.db`). **Vercel requires a hosted database** because serverless functions can't persist SQLite files.

Recommended: [Neon](https://neon.tech) (free PostgreSQL)

1. Create a Neon project and copy the connection string
2. Change `provider` in `prisma/schema.prisma` from `sqlite` to `postgresql`
3. Set `DATABASE_URL` on Vercel to your Neon connection string
4. Run `npm run db:push && npm run db:seed` locally with that URL, or use Neon's SQL console

Pushes to `main` auto-deploy on Vercel if the project is connected.

## Admin Workflow

1. Sign in as admin
2. **Dashboard** — View team completion rates and recent activity
3. **Assign** — Pick a checklist and assign it to an employee
4. **Create** — Build custom checklists with the checklist builder

## Employee Workflow

1. Sign in as employee
2. See assigned checklists on **My Tasks**
3. Start or continue a checklist
4. Complete tasks (photos, temperatures, etc.)
5. View finished work in **History**

## Tech Stack

- Next.js 14, TypeScript, Tailwind CSS
- NextAuth (credentials login)
- Prisma + SQLite (local) / PostgreSQL (production)
