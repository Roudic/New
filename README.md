# JoltCheck

Operations checklist app for teams — login, admin assignments, checklist builder, and progress tracking.

**Works instantly on your phone** with no database setup. Data is saved in the browser (localStorage) on each device.

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@joltcheck.com` | `admin123` |
| Employee | `alex@store.com` | `employee123` |
| Employee | `sam@store.com` | `employee123` |

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000/login on your phone or computer (same Wi‑Fi: use the URL printed in the terminal).

## Deploy on Vercel

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Deploy — **no environment variables required**

The app runs entirely in the browser after load. Each device keeps its own data.

## Features

- **Admin dashboard** — track assignments and team progress
- **Assign checklists** — send built-in or custom checklists to employees
- **Employee portal** — complete assigned tasks with timestamps
- **Custom checklist builder** — create your own operational checklists
- **6 built-in templates** — opening, closing, food safety, cleaning, shift change, audit
- **Task types** — checkbox, yes/no, temperature, text, photo, number

## Notes

- Demo assignments are pre-loaded for Alex and Sam on first visit
- Sign in as admin to assign more checklists or create custom ones
- Use Settings → Reset to clear data on a device and start fresh
