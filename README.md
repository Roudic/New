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

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Local storage for persistence (no backend required)

## Usage

1. Go to **Settings** and enter your name and location.
2. Browse **Checklists** and start a template.
3. Complete each task — photos and temperatures are validated inline.
4. Review completed runs in **History**.

Data is stored in your browser's local storage.
