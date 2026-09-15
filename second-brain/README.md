# Second Brain OPs (Phase 1)

Agentic OS for Chick-fil-A Hueytown **managers**. This is **not** JoltCheck employee login.

**3D map:** `/brain/map` (linked from `/brain`). Notes and note↔note links. Drive nodes only when a live manager catalog file exists — empty/unwired Drive stays empty on the map. A few in-memory demo notes appear only when the store has too few linked notes.

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
