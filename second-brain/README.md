# Second Brain OPs (Phase 1)

Agentic OS for Chick-fil-A Hueytown **managers**. This is **not** JoltCheck employee login.

**Login is temporarily off.** `/brain`, `/brain/map`, and `/api/brain/*` run as Joshua (`vinziant@gmail.com`) with no password and no cookie. The dashboard shows **Login is off — manager dashboard is open**. JoltCheck employee login (`/login`) is unchanged. `SECOND_BRAIN_PASSWORD` is not required while the gate is off. Flip `BRAIN_LOGIN_ENABLED` in `src/lib/second-brain/brain-login.ts` to restore the manager password gate.

**3D map:** `/brain/map` (linked from `/brain`). Canvas 2.5D force graph (no WebGL) of notes and note↔note links. Drive nodes only when a live manager catalog file exists — empty/unwired Drive stays empty on the map. A few in-memory demo notes appear only when the store has too few linked notes.

**Drive is not wired yet.** The shared folder id is `null`. `second-brain/drive-catalog.example.json` is a **fixture** (simulated IDs that 404). The CLI does **not** seed it into the live store. Filing is local JSON / the `SecondBrainState` table. `confirm-share` does **not** activate seats: a folder id in JSON is not proof of Drive share. Joshua is the operator exception.

## Who can use it

Exactly **4 manager seats**:

| Seat | Name | Email | Status |
|---|---|---|---|
| 1 | Joshua Vinziant | `vinziant@gmail.com` | Active (Drive share treated as confirmed for the operator) |
| 2 | *(unknown)* | *(unknown)* | Pending invite |
| 3 | *(unknown)* | *(unknown)* | Pending invite |
| 4 | *(unknown)* | *(unknown)* | Pending invite |

Store team / crew / JoltCheck accounts (`alex@store.com`, `sam@store.com`, `admin@joltcheck.com`, and anyone else not on this list) **cannot** capture or read.

`--actor` is **required**. It is never defaulted to Joshua. Inbox `actor:` is allowed when it matches a **granted** roster email (active or pending). Unknown / store-team claims are discarded and the body is not stored. Unclaimed drops are stored as the processor.

## How the other 3 managers get access

1. An active manager provides the person's name and Google/work email.
2. Fill a pending seat (still 4 max). **Grant does not activate the seat:**

```bash
npx tsx scripts/second-brain.ts grant \
  --actor vinziant@gmail.com \
  --name "Full Name" \
  --email "name@example.com"
```

3. Share the Drive folder **CFA Hueytown Managers — Second Brain** with that Google account as **Editor**. Do **not** use Anyone with the link or the store team.
4. `confirm-share` cannot activate them until **live Drive ACL** exists. Planting a folder id in JSON does not count.

Until live ACL is wired, they cannot CLI-capture or read. They **can** have inbox drops attributed to their granted email when an active manager runs `process`.

## Capture → classify → file → verify

1. **Capture** — CLI (`--actor` required) or `data/second-brain/inbox/*.md`.
2. **Classify & file** — proposes `shift-notes` / `vendor` / `training` / `incidents` / `schedules` / `general`.
3. **Verify** — a **second scorer** (negation-aware, not `classify()` again). Low-confidence and `general` stay in `needs-review`. Placeholder Drive links are refused.
4. **Link** — related **notes** can link. Live Drive file links require a real catalog; folder-only matches are not enough.

```bash
npx tsx scripts/second-brain.ts capture \
  --actor vinziant@gmail.com \
  --title "Sysco short" \
  --body "Truck shorted 2 cases of nuggets, need a credit memo." \
  --process

npx tsx scripts/second-brain.ts process --actor vinziant@gmail.com
npx tsx scripts/second-brain.ts status --actor vinziant@gmail.com
npm run test:second-brain
```

Inbox markdown (no actor claim required; processor identity wins):

```md
---
title: Sysco late
---
Truck was 40 minutes late and the invoice was shorted.
```

## Zapier Drive Calendar Notion sync

Second Brain never calls the Google Drive, Google Calendar, or Notion APIs
directly. **Zapier is the glue.** The Zapier MCP connection for this project
has Google Drive and Google Calendar accounts enabled; Notion is being
enabled. None of that makes `/brain` "connected" by itself — **Joshua has not
named a real Drive folder, calendar, or Notion page/database yet**, so every
panel below stays in an honest "not connected" state until he does and a Zap
is wired to these endpoints.

**Outbound (note → Zap):** when a captured note is filed, the app `POST`s a
summary (title, body, category, destination) to a Zap trigger webhook, if
one is configured. The Zap itself decides where things land — e.g. "create a
Google Doc in folder X" or "create a Notion page in database Y" — since this
app does not know those targets. If the webhook is not configured, or the
call fails, filing still succeeds; the dispatch result is just not marked as
sent. Nothing about this call assumes Drive/Notion/Calendar are already
wired.

**Inbound (Zap → dashboard):** once a Zap actually creates a Drive file,
Notion page, or Calendar event, it calls back to
`POST /api/brain/integrations/zapier` with a shared-secret header (not a
manager cookie — Zapier is not one of the 4 manager seats) and the real
id/url Google or Notion returned. The app validates that payload (rejects
short/placeholder-looking ids, non-Drive/Notion/Calendar urls) before it
ever shows up on `/brain`. Nothing is seeded or faked locally.

### Required environment (names only — set real values in your deploy platform, never in git)

| Variable | Purpose |
|---|---|
| `ZAPIER_CAPTURE_WEBHOOK_URL` | Outbound Zap trigger webhook. Posted to on every filed note. Omit to leave capture→Zapier sync off. |
| `ZAPIER_INBOUND_WEBHOOK_SECRET` | Shared secret a Zap must send as the `x-zapier-secret` header on `POST /api/brain/integrations/zapier`. Omit to leave the inbound endpoint fail-closed (503). |
| `SECOND_BRAIN_DRIVE_FOLDER_NAME` | Set once Joshua names the real shared Drive folder. Only changes the dashboard message from "not connected" to "named, wiring the webhook"; it does not grant access by itself. |
| `SECOND_BRAIN_CALENDAR_NAME` | Set once Joshua names the real shared calendar. Same honesty rule as above. |
| `SECOND_BRAIN_NOTION_TARGET_NAME` | Set once Joshua names the real Notion page/database. Same honesty rule as above. |

`/brain` shows three panels — **Drive files**, **Calendar events**, **Notion
pages** — each reporting "Not connected" until both its target name and the
matching webhook env var are set, and "Connected" only once both are true.
Items only ever come from a validated Zapier callback; there is no demo/seed
data for these three panels (unlike the `/brain/map` note graph, which does
overlay a few in-memory demo **notes** when the store is sparse).
