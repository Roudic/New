# Depart Rate

Standalone speed-of-service app for the drive-thru leader. Not part of KitchenCheck.

Tap every car that leaves the window. A countdown tells the leader **when to pull** the next car so the line holds the target depart rate.

## Quick start

```bash
cd drive-thru-pulse
npm install
npm run dev
```

Open http://localhost:5173 on a phone or iPad at the window.

## Deployed URL

When the root JoltCheck project is deployed, this app is a separate SPA at **`/pulse/`**:

```
https://your-app.vercel.app/pulse/
```

No login. Works offline after first load.

## How to run a session

1. Pick daypart, lane (single/double), and a **depart-rate target** (140 / 150 / 160 / 180 CPH).
2. Start the session. The pull clock counts down from the pace interval (160 CPH = 22.5 seconds).
3. When the clock hits **PULL**, send the next car.
4. Tap **Car departed** when they leave — that logs the car, updates depart rate, and resets the pull clock.
5. End the session for cars, CPH vs target, 15-minute blocks, and gap stalls.

## Features

- **Pull timer** — countdown to the next pull; turns red and beeps when it's time
- **Depart rate** — rolling cars/hour vs the target you set
- **Car counts** — session total plus 15-minute blocks
- **Flags** — pull-forward lag, payment delay, order not ready, lane blocked
- **Export** — CSV and a copy-paste summary
- **Offline** — localStorage, autosave, resume after crash

## Tech

- Vite + React (TypeScript)
- Tailwind CSS
- No backend, no login
