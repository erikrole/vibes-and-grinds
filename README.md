# Vibes & Grinds

Personal dual-mode tracker for basketball road-trip culture:

1. **Vibes & Grinds** — coffee-shop journal: rate vibe + coffee, log order/notes/photo, tag road trips vs Madison home stops, filter/search, map, insights, badges, season review, share cards.
2. **Vest Tracker** — Wisconsin basketball outfit/game tracker (scoreboard UI, NET rankings, game stats, leaderboards) in the same app shell and Cloudflare/D1 backend.

**Live:** [coffee.erikrole.com](https://coffee.erikrole.com) · Vest mode also via a `vests.*` hostname or the in-app switch.

Production deploy: **Cloudflare Pages + D1 + Pages Functions**. See [DEPLOYMENT.md](./DEPLOYMENT.md). Local API: Express + SQLite for parity.

## Features (shipped)

### Coffee journal
- Add / edit / delete visits with vibe + coffee ratings (0–10) and composite score (0–20)
- Color-coded rating ramp; journal hero with visit count + averages
- Google Places autocomplete (name, address, coords when available)
- Order, notes, photo upload + crop
- Road trip vs **Around Madison** (`visit_type`: `road` | `home`), with auto-Madison detection
- Search, filters (road/Madison, regulars, sport, etc.), sorting
- Visit detail modal; return-visit logging
- Map explorer (Leaflet)
- Insights panel + badges
- Season-in-review (road trips only — Madison stays out of season reports)
- Share cards; dark mode; keyboard shortcuts (`n`, `/`, `v`, `?`)

### Vest Tracker
- Game log with outfit / result; DB-backed sync via `/api/vest/games` (not device-only localStorage)
- Scoreboard aesthetic, leaderboards, timeline / lock-in extras
- NET rankings feed (worker or Warren Nolan HTML parse fallback)
- Game stats panels (ESPN-shaped data where wired)

## Tech stack

| Layer | Local | Production |
|-------|--------|------------|
| UI | React 18 + Vite + Tailwind | Same build → Pages |
| API | Node Express (`backend/`) | Cloudflare Pages Functions (`functions/`) |
| Data | SQLite file | Cloudflare D1 |
| Places | Google Places API (New) | Same (env on Pages) |

## Getting started

### Prerequisites
- Node.js 18+ and npm
- Google Maps / Places API key (autocomplete)

### Backend (local)

```bash
cd backend
npm install
cp .env.example .env
npm start   # http://localhost:3001 — creates SQLite + schema
```

### Frontend (local)

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:3001
npm run dev   # http://localhost:3000
```

Root / backend `.env` (and Cloudflare Pages env in prod):

```env
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
NET_RANKINGS_URL=https://big-ten-standings.erikrole.workers.dev  # optional
```

Optional frontend override:

```env
VITE_NET_RANKINGS_URL=https://big-ten-standings.erikrole.workers.dev
```

### Google Places API key
1. [Google Cloud Console](https://console.cloud.google.com/) → enable **Places API (New)**
2. Create an API key; restrict to Places + your domains
3. Billing must be active for Places (New)

## Usage highlights

### Adding a visit
1. **Add Visit** → confirm **Road trip** or **Around Madison**
2. Date (defaults today) → shop via Places → order → vibe + coffee → notes/photo → save

### Madison coffee shops
Everyday Madison-area stops use `visit_type = 'home'`:
- ~25 miles of Madison auto-tags home when Places supplies coords (city/address fallback requires Wisconsin)
- Manual **Around Madison** locks the choice for that form
- **Road & Madison** list filter; Madison scope pre-sets Add Visit to home
- Season-in-review covers **road trips only**; list/hero/map/insights/badges include Madison

Existing D1 DBs need a one-time column if missing:

```bash
wrangler d1 execute vibes-and-grinds-db --remote \
  --command "ALTER TABLE coffee_visits ADD COLUMN visit_type TEXT DEFAULT 'road'"
```

Local Express applies schema/migrations on start. Also ensure `vest_games` / related tables exist (`schema.sql`).

### Ratings
- **Vibe** — atmosphere, seating, music (0–10)
- **Coffee** — taste, quality (0–10)
- **Composite** — sum (0–20); red → green color bands by score

## API (overview)

Coffee:
- `GET/POST /api/visits`, `GET/PUT/DELETE /api/visits/:id`
- `GET /api/stats`, upload + Places helpers under `/api/*`

Vest:
- `/api/vest/games`, net-rankings, scores, game-stats, blurb (see `functions/api/vest/`)

**Write protection:** `POST` / `PUT` / `PATCH` / `DELETE` require header `X-Write-Key` matching the Pages Functions secret `WRITE_KEY`. Reads stay public. A missing or placeholder secret fails closed (503) unless local `ALLOW_INSECURE_WRITES=true`. See [DEPLOYMENT.md](./DEPLOYMENT.md) Step 9.

## Project structure

```
vibes-and-grinds/
├── backend/                 # Express + SQLite (local)
├── frontend/                # React app
│   └── src/components/      # Journal + Vest UI
├── functions/               # Cloudflare Pages Functions (prod API)
├── shared/write-gate.mjs    # Shared mutating-request decision
├── workers/                 # Related Workers (e.g. basketball/NET)
├── schema.sql               # D1 / SQLite schema
├── DEPLOYMENT.md            # Cloudflare Pages + D1
├── PRODUCT_PLAN.md          # Shipped vs next
└── README.md
```

## What’s next (true future)

Not a re-list of map/insights/season — those already shipped. Real follow-ups:

- **Add Visit UX rebuild** — shop → order → ratings first (PR #45)
- **Design tokens** — finish coffee journal token migration (PR #46)
- **Shell split** — extract coffee vs Vest from `App.jsx` (PR #47)
- Photo storage decision (R2 vs current upload path)
- API parity / smoke tests across Express and Functions
- Stronger place identity for honest Maps deep-links

See [PRODUCT_PLAN.md](./PRODUCT_PLAN.md).

## Development commands

```bash
# backend/
npm run dev    # nodemon
npm start

# frontend/
npm run dev
npm run build
npm run preview
```

## Deployment

**Production is Cloudflare Pages + D1 + Functions** — not Vercel/Railway. Full steps: [DEPLOYMENT.md](./DEPLOYMENT.md). Short path: [QUICKSTART.md](./QUICKSTART.md).

## Troubleshooting

**Autocomplete not working?**
- `GOOGLE_MAPS_API_KEY` on backend/root `.env` or Pages env; Places API (New) + billing enabled; check `/api/places-autocomplete` error fields

**Backend not connecting (local)?**
- Express on `:3001`; `VITE_API_URL` matches

**Database issues?**
- Local: delete `backend/vibes-and-grinds.db` and restart
- D1: confirm binding `DB` and `schema.sql` / one-off `ALTER`s

## License

MIT
