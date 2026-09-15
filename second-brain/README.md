# Second Brain OPs (Phase 1)

Agentic OS for Chick-fil-A Hueytown **managers**. Google Drive is the file layer. This module captures, classifies, files, **verifies**, and links notes. There is **no custom app UI** and this is **not** JoltCheck employee login.

## Who can use it

Exactly **4 manager seats**:

| Seat | Name | Email | Status |
|---|---|---|---|
| 1 | Joshua Vinziant | `vinziant@gmail.com` | Active |
| 2 | *(unknown)* | *(unknown)* | Pending invite |
| 3 | *(unknown)* | *(unknown)* | Pending invite |
| 4 | *(unknown)* | *(unknown)* | Pending invite |

Store team / crew / JoltCheck accounts (`alex@store.com`, `sam@store.com`, `admin@joltcheck.com`, and anyone else not on this list) **cannot** capture or read.

## How the other 3 managers get access

Names and emails are not known yet. That does not block Phase 1. When Joshua has them:

1. An active manager provides the person's name and Google/work email.
2. Fill a pending seat (still 4 max):

```bash
npx tsx scripts/second-brain.ts grant \
  --actor vinziant@gmail.com \
  --name "Full Name" \
  --email "name@example.com"
```

3. Share the Drive folder **CFA Hueytown Managers — Second Brain** with that same Google account as **Editor**.
4. Do **not** use Anyone with the link, the whole store, or a crew/team group.

They can then drop notes into the shared Inbox.

## Capture → classify → file → verify → link

1. **Capture** — any of the 4 managers drops a messy note (CLI or `data/second-brain/inbox/*.md`). No folder-picking.
2. **Classify & file** — the agent proposes a category (`shift-notes`, `vendor`, `training`, `incidents`, `schedules`, `general`) and a Drive folder destination.
3. **Verify** — an independent pass re-classifies and checks destination + Drive-link safety. Notes are **not** marked `filed` unless this pass succeeds (`needs-review` otherwise).
4. **Link** — filed notes point at related manager-only Drive files and other notes. Store-team / public Drive files are refused.

```bash
# Drop a note
npx tsx scripts/second-brain.ts capture \
  --actor vinziant@gmail.com \
  --title "Sysco short" \
  --body "Truck shorted 2 cases of nuggets, need a credit memo." \
  --process

# Or drop unorganized markdown into the inbox, then:
npx tsx scripts/second-brain.ts process --actor vinziant@gmail.com

npx tsx scripts/second-brain.ts status --actor vinziant@gmail.com
npm run test:second-brain
```

Inbox markdown:

```md
---
actor: vinziant@gmail.com
title: Sysco late
---
Truck was 40 minutes late and the invoice was shorted.
```

Runtime data lives in `data/second-brain/` (gitignored). Live ops notes should live in the restricted Drive folder, not in git and not in the JoltCheck web app.
