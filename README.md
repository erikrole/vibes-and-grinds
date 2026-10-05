# Vibes & Grinds

AJ Harrison’s coffee journal for road trips and stops around Madison. Live at [coffee.erikrole.com](https://coffee.erikrole.com).

## What the app does

- Records a shop, date, order, vibe and coffee ratings, notes, and photo.
- Searches saved shops and fills their location for return visits.
- Supports Apple Maps search and maps when a public domain-restricted token is configured. Existing Google Places search and OpenStreetMap tiles remain available when it is absent. All entry links open Apple Maps.
- Filters and sorts the journal, shows mapped stops, and summarizes ratings and road seasons.
- Includes the separate Vest Tracker, with database-backed games and NET rankings.

Ratings accept decimals from 0 to 10, including zero. Overall score is their sum, out of 20. Madison-area shops are detected from coordinates or Wisconsin city/address text. Manually choosing Road trip or Around Madison locks that choice for the entry. Road season reviews exclude Madison stops.

## Development

Use Node 20 or newer. The frontend uses React, Vite, Tailwind, and MapKit JS. Local APIs use Express and SQLite; production uses Cloudflare Pages Functions and the existing D1 `DB` binding.

```sh
npm --prefix frontend ci
npm --prefix backend ci
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Start the API from the backend directory so its SQLite database is created there:

```sh
cd backend
npm start
```

In another terminal:

```sh
cd frontend
npm run dev
```

The frontend runs at http://localhost:3000 and proxies `/api` to http://localhost:3001. Backend `.env` supplies optional mapping credentials. Saved shops and manual entry work without them. No database reset is needed for this UI/maps update.

For a local preview of production data, use the read-only guard:

```sh
cd frontend
VITE_PROXY_TARGET=https://coffee.erikrole.com VITE_PROXY_READ_ONLY=true npm run dev
```

Never use an unguarded production proxy to test writes. Keep databases, photos, tokens, and generated exports out of Git.

## Apple Maps setup

Set `APPLE_MAPS_TOKEN` on the API to a public MapKit JS token restricted to the intended domains. `/api/maps-config` returns this browser token with `Cache-Control: no-store`. **Never put a private `.p8` signing key in this variable or in browser code.** The frontend uses Apple’s official loader and SDK 6. Saved Apple place IDs use the `apple:` prefix in the existing place-ID column; existing Google records keep their identity and coordinates.

A selected search result must resolve to exactly one place before it fills the entry. Changing a shop, city, or address clears stale place identity and coordinates. Entries without coordinates stay in the list without a fabricated pin.

When no token is configured, Google Places lookup uses the existing backend `GOOGLE_MAPS_API_KEY`; map tiles use OpenStreetMap. Apple token provisioning and domain restrictions require account access and approval. See [Apple Maps on the web](https://developer.apple.com/maps/web/) and [DEPLOYMENT.md](DEPLOYMENT.md).

## Checks

```sh
npm --prefix frontend test
npm --prefix frontend run build
```

The tests cover place identity, cancellation, ambiguous results, links, coordinate validation, public config, and sorting. The GitHub workflow also checks backend and Pages function syntax. Browser review should cover saved-shop selection, draft retention on save failure, discard confirmation, mobile layouts, maps, and light/dark themes. Mocked SDK tests do not establish live Apple authentication or rendering.

## API and data

Coffee visit CRUD is under `/api/visits`, with aggregate stats at `/api/stats`. Mapping config is `/api/maps-config`; Google fallback lookup uses `/api/places-autocomplete` and `/api/places-details`. Photos use `/api/upload`. Vest endpoints are under `/api/vest`.

`NET_RANKINGS_URL` can override the backend feed. `VITE_NET_RANKINGS_URL` optionally uses a browser feed directly. Existing payload shapes include dedicated NET rankings, Big Ten `standings`, and a D1 `netRankings` map.

Existing older D1 databases may need the `visit_type` column or Vest tables; check their schema and the original [schema.sql](schema.sql) before planning any migration. This change requires no migration. Back up data and obtain approval before destructive changes.

See [ROADMAP.md](ROADMAP.md) for remaining work and [CHANGELOG.md](CHANGELOG.md) for change notes.
