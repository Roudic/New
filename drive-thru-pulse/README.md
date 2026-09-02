# Depart Rate

Standalone drive-thru speed-of-service app. Pull timer + depart rate. No login.

Tap every car that leaves the window. A countdown tells the leader **when to pull** the next car so the line holds the target depart rate.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173 on a phone or iPad at the window.

## How to run a session

1. Pick daypart, lane (single/double), and a **depart-rate target** (140 / 150 / 160 / 180 CPH).
2. Start the session. The pull clock counts down from the pace interval (160 CPH = 22.5 seconds).
3. When the clock hits **PULL**, send the next car.
4. Tap **Car departed** when they leave — that logs the car, updates depart rate, and resets the pull clock.
5. End the session for cars, CPH vs target, 15-minute blocks, and gap stalls.

## Deploy on Vercel

Create a new Vercel project from this folder (or set **Root Directory** to this app):

- Framework: Vite
- Build command: `npm run build`
- Output: `dist`

The site root **is** Depart Rate. It is not KitchenCheck.

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
