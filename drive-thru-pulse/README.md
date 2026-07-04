# Drive-Thru Pulse

Tap-timer app for measuring drive-thru window departure timing at Chick-fil-A Vestavia Hills (#03339).

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 on an iPad or phone at the drive-thru window.

## Deployed URL

When deployed via the root Vercel project (JoltCheck), Pulse is served at **`/pulse/`** on the same domain:

```
https://your-app.vercel.app/pulse/
```

The root `npm run build` bundles Pulse into `public/pulse/` automatically.

## Build

```bash
npm run build
```

Static files output to `dist/` — deploy anywhere or open locally.

## Features

- **Live session** — giant tap button logs every car departure with instant feedback
- **Rolling CPH** — 10-minute window pace indicator (green ≥160, yellow 150–159, red <150)
- **Flags** — one-tap tagging for pull-forward lag, payment delay, etc.
- **Session report** — 15-min block bar chart, gap analysis, stall events
- **Export** — CSV download and Slack-ready summary copy
- **Offline** — localStorage persistence, autosave on every tap, resume after crash

## Tech

- Vite + React (TypeScript)
- Tailwind CSS
- No backend, no login — works fully offline after first load
