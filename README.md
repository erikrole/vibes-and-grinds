# Vibes & Grinds

AJ Harrison’s coffee journal for road trips and stops around Madison. Live at [coffee.erikrole.com](https://coffee.erikrole.com).

## What the app does

- Records a shop, date, order, vibe and coffee ratings, notes, and photo.
- Searches saved shops and fills their location for return visits.
- Supports Apple Maps search and maps when a public domain-restricted token is configured. Existing Google Places search and OpenStreetMap tiles remain available when it is absent. All entry links open Apple Maps.
- Filters and sorts the journal, shows mapped stops, and summarizes ratings and road seasons.
- Opens the separate Vest Tracker from the footer, with saved games and NET rankings.
- Publishes entry, shop-history, comparison, and season links with browser Back support.
- Keeps editing behind owner sign-in. Visits have recoverable deletion and a private export; Vest game changes retain recovery snapshots.

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

The frontend runs at http://localhost:3000 and proxies `/api` to http://localhost:3001. Backend `.env` supplies optional mapping credentials and the owner access-key hash. Set `LOCAL_ORIGIN=http://localhost:3000` to the exact frontend origin (use `http://127.0.0.1:3000` if that is how you open it). Writes require that origin. Saved shops and manual entry work without them. Local startup adds missing recovery tables and backfills shop IDs without resetting data.

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
npm --prefix backend test
npm --prefix frontend run build
```

The tests cover place identity, cancellation, ambiguous results, links, coordinate validation, public config, and sorting. Backend tests cover owner sessions, origin checks, throttling, shop matching, deletion/restoration, and conflicting Vest updates. The GitHub workflow also checks backend, shared modules, and all Pages functions. Browser review should cover saved-shop selection, draft retention on save failure, discard confirmation, mobile layouts, maps, and light/dark themes. Mocked SDK tests do not establish live Apple authentication or rendering.

## API and data

Coffee visit CRUD is under `/api/visits`, with aggregate stats at `/api/stats`. Mapping config is `/api/maps-config`; Google fallback lookup uses `/api/places-autocomplete` and `/api/places-details`. Photos use `/api/upload`. Vest endpoints are under `/api/vest`.

`NET_RANKINGS_URL` can override the backend feed. `VITE_NET_RANKINGS_URL` optionally uses a browser feed directly. Existing payload shapes include dedicated NET rankings, Big Ten `standings`, and a D1 `netRankings` map.

Fresh databases use [schema.sql](schema.sql). Existing production databases require the one-time additive [owner/shop/recovery migration](migrations/0001_owner_shops_recovery.sql), after a backup and schema inspection. Do not run the fresh schema as a migration. The owner-only `POST /api/owner/backfill` assigns internal shop IDs to existing visits; provider aliases can converge only with matching physical-location evidence. Unknown manual locations remain separate.

Owner sign-in uses a generated 256-bit access key, with only its SHA-256 digest in `OWNER_KEY_HASH`. Never use a human password as this key. Use the footer’s Owner sign-in to enter the private key; a secure, HttpOnly, same-origin session lasts 12 hours. Rotating the configured hash invalidates previous sessions. Missing configuration disables writes. Every Pages API mutation and local API mutation is protected, including photo upload. Owner export includes visits, deleted visits, shops, aliases, and Vest recovery data, and excludes credentials and sessions. Store the access key securely and never commit it.

Season reviews cover July through June and road visits only. Current seasons say “so far”; single visits do not imply a trend. Insights starts with one-visit samples and links to the records behind comparisons. Vest comparisons describe completed-game records without generated narratives or recommendations; simply browsing never saves game records.

Older immutable Pages deployments must be retired or access-restricted before owner-only editing is considered complete; their old code can still reach shared production data. The approved first 25 were retired on 2026-10-04; a paginated audit revealed 226 additional older copies awaiting retirement approval. Wrangler shows only the first 25 deployments, so audit the complete API history. See [DEPLOYMENT.md](DEPLOYMENT.md).

See [ROADMAP.md](ROADMAP.md) for remaining work and [CHANGELOG.md](CHANGELOG.md) for change notes.
