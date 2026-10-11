# Vibes & Grinds — Product Plan

Personal dual-mode app: **coffee journal** (default) + **Vest Tracker**, live at [coffee.erikrole.com](https://coffee.erikrole.com) on **Cloudflare Pages + D1 + Functions**. Local: Express + SQLite.

## Shipped (treat as current product)

### Coffee journal
- Visit CRUD with vibe + coffee ratings and composite score
- Places autocomplete, order/notes/photo
- Road vs Madison (`visit_type`), filters/search/sort, return visits
- Map explorer, insights, badges, season-in-review (road only)
- Share cards, dark mode, keyboard shortcuts
- Journal hero snapshot (counts + averages)

### Vest Tracker
- Mode switch + `vests.*` hostname entry
- DB-backed vest games (`/api/vest/games`), scoreboard UI, leaderboards
- NET rankings + game stats wiring

### Platform
- Dual API: Express (local) and Pages Functions (prod) over aligned SQLite/D1 schema
- Workers for basketball/NET-related feeds where used
- Mutating APIs require `WRITE_KEY` / `X-Write-Key`; reads stay public. See DEPLOYMENT.md Step 9.

## Next (in flight or decided backlog)

| Item | Status |
|------|--------|
| Rebuild Add Visit around where → order → ratings | PR #45 |
| Finish coffee design tokens (purge mixed utilities) | PR #46 |
| Split `App.jsx` into coffee / Vest shells | PR #47 |
| Photo object storage (R2 vs keep simple uploads) | Decision |
| API parity checklist + smoke tests (Express ↔ Functions) | Backlog |
| Canonical place IDs / honest Maps deep-links | Backlog |

## Not “v2 wishlist” anymore

These were listed as future in older docs; they **already shipped**: interactive map, dashboard/insights stats, season/year review, filtering & sorting, trip/journal snapshot. Do not re-plan them as greenfield.

## Technical approach
- **Frontend:** React + Vite + Tailwind
- **Prod API/data:** Cloudflare Pages Functions + D1
- **Local API/data:** Express + SQLite (`schema.sql` as source of truth)
- **Main structural risk:** schema/behavior drift between local and cloud; dual-mode growth inside one shell

## Open decisions
- Photos: keep current upload path vs Cloudflare R2 (or similar)
- Google Maps budget / key restrictions
- Privacy: the shared write key is the lightweight gate; Cloudflare Access or fuller auth only if sharing widens
