# Second Brain design system

Canonical copy lives in the Project store (`docs/brain-design.md`). This repo file is the in-tree mirror for `/brain` work.

**Sleek + cute**, not generic SaaS, not childish. Peach-paper dashboard, cocoa-night Canvas 2.5D brain map.

## Implement with these files

- `src/app/brain/brain.css` — CSS tokens and reusable classes (`.brain-card`, `.brain-btn`, `.brain-connector`, …)
- `src/lib/second-brain/design-tokens.ts` — JS hexes, `MAP_CATEGORY_COLORS`, `BRAIN_MAP_THEME`, connector accents

## Category / node colors

| Key | Hex |
|---|---|
| `shift-notes` | `#4C9BE0` |
| `vendor` | `#E8A317` |
| `training` | `#2DB8A0` |
| `incidents` | `#E85A48` |
| `schedules` | `#8B7AE8` |
| `general` | `#B08978` |
| `inbox` | `#F0A87A` |
| `drive` | `#3EC4E0` (live Drive files only) |

## Connector chrome

```html
<section id="drive-panel" class="brain-card brain-connector" data-connector="drive">
```

Accents: Drive `#3EC4E0`, Calendar `#F0B429`, Notion `#6B66D8`. Status: `.brain-status--warn` / `--ok`. Never paint connected without live data. Keep `#integration-panels` and `data-connected`.

## Honesty

- Keep `#brain-login-off` copy: `Login is off — manager dashboard is open` while `BRAIN_LOGIN_ENABLED` is false.
- Drive / Calendar / Notion stay “not wired” until they are.
- Do not restyle JoltCheck. Do not change manager-only rules.
