# JoltCheck

A Jolt-inspired digital operations checklist app for deskless teams. Replace paper checklists with timestamped, accountable workflows.

## Features

- **Pre-built templates** — Opening, closing, food safety, shift handoff, cleaning, and weekly audit checklists
- **Multiple task types** — Checkbox, yes/no, temperature logs, text notes, photo proof, and numeric entries
- **Team accountability** — Every completion records employee name and timestamp
- **Photo proof** — Require camera/upload evidence to eliminate pencil-whipping
- **Temperature validation** — Out-of-range temps flagged with corrective action prompts
- **Operations dashboard** — Track in-progress, due, and completed checklists at a glance
- **Completion history** — Full audit trail of past runs
- **Mobile-first UI** — Bottom nav on phones, responsive layout on tablets and desktop
- **Custom checklist builder** — Create, edit, and delete your own checklists with any task types

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Use on your phone (same Wi-Fi)

1. Run `npm run dev` on your computer.
2. Look in the terminal for the **Phone** URL (e.g. `http://192.168.1.42:3000`).
3. Open that URL in your phone browser — **not** `localhost`.

If it still won't load:
- Make sure phone and computer are on the **same Wi-Fi**
- On Windows, set your Wi-Fi network to **Private** (not Public)
- Allow port 3000 through your firewall if prompted

For photo tasks over Wi-Fi, some browsers require HTTPS. If the camera won't open, use file upload instead or deploy to Vercel for a secure URL.

## Deploy (recommended for phone use)

The easiest way to use JoltCheck on your phone is to deploy it — you get an HTTPS link that works anywhere.

### Vercel (free, ~2 minutes)

1. Go to **[vercel.com/new](https://vercel.com/new)** and sign in with GitHub.
2. Import the **`Roudic/New`** repository.
3. Leave all settings as default and click **Deploy**.
4. When it finishes, open the URL Vercel gives you on your phone (e.g. `https://new.vercel.app`).

No environment variables or database are required. Checklist data stays in each user's browser.

**One-click import:** [Deploy to Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRoudic%2FNew&project-name=joltcheck&repository-name=New)

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Local storage for persistence (no backend required)

## Usage

1. Go to **Settings** and enter your name and location.
2. Tap **Create** to build your own checklist, or browse **Checklists** for built-in templates.
3. Complete each task — photos and temperatures are validated inline.
4. Review completed runs in **History**.

Data is stored in your browser's local storage.
