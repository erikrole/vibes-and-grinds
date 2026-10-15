# Change notes

## 2026-10-15 — Share card uses the visit photo

The share card fell back to the placeholder cup because the R2 photo host sends no CORS headers, so the canvas couldn't read the image. Cross-origin photos now load through a same-origin `GET /api/photo?url=…` stream that only fetches the configured `R2_PUBLIC_URL` host (other hosts, plain http and look-alike hosts return 400). No bucket or Cloudflare setting changed; adding CORS to the bucket would be the alternative. Checked with the real happy coffee photo against a local backend.

## 2026-10-15 — Note over the photo; steam removed

In the visit detail, the note no longer sits as a separate block under a photo. The photo stays untouched by default with a small frosted "Note" pill in its corner; tapping it opens the note on a blurred glass panel over the lower part of the photo (max 55% of its height, scrollable), and "Hide note" closes it. Visits without a photo keep the Notes block. The animated steam next to the stop count is removed: it floated between the numeral and its label and read as a rendering glitch.

## 2026-10-15 — Color system pass

Filled accent controls used white text on the accent (3.3:1 light, 2.5:1 dark). They now use `--accent-fill` with `--on-accent`. Recurring literals became tokens (`--on-solid`, `--cream`, `--scrim`, the Vest red), and cream/accent alpha literals became `color-mix()` so they follow the theme. Hex and `rgba()` literals outside the token block fell from 129 to 82; the rest are listed in `DESIGN_SYSTEM.md`. Vest checked in light and dark, journal Insights in light.

## 2026-10-15 — Design system audit

Audited the design language (see `DESIGN_SYSTEM.md`) and fixed what was objectively wrong: light-theme text and rating colours that missed WCAG contrast, an accent colour used as text, radius tokens missing in dark mode, unused Tailwind palettes, and one-off easings/radii/font stacks. Added shared scales (type, space, radius, motion, layers), a global reduced-motion safety net, and tests that keep light/dark parity and contrast from regressing. Slight visible changes: light-theme secondary text and accent text are a little darker, and the mid/good rating colours are a touch deeper.

## 2026-10-15 — Livelier visit detail

The visit detail ratings now count up, with a fill bar that shows each score against its maximum, and each score shows where the visit ranks in the journal ("#7 of 34 · +0.5 vs avg"). Highlight chips appear when earned: best stop yet, best cup or vibe yet, top 3 stop, first stop in a state, best in a city. Ranks need at least three visits, and everything is computed from saved visits (`visitStanding.js`). Animations honor reduced motion.

## 2026-10-15 — More coffee fun

Built on the animated stats: a save celebration card (stop number, confetti at 18+ out of 20, milestone note at 25/50/75/100/150/200 stops, new-badge callout or a "next badge" hint); flip-open awards (best cup, best vibe, most visited, furthest from Madison, biggest comeback); a 50-state passport grid; a counts-only personality line; best coffee by sport and game-day stats from the saved sport field; a road-trip replay on the Map tab with a running straight-line mile counter; a "Share season wrapped" image; and a bit of steam by the stop count. Everything is computed from saved visits (`funExtras.js`, `funStats.js`), nothing is stored or generated, and animations honor reduced motion. Checked on read-only production data and a local test database at desktop and 375px in dark and light.

## 2026-10-15 — Coffee by the numbers

The Insights tab opens with an animated "Coffee by the numbers" section: count-up tiles (stops, shops, cities, states, straight-line road miles, perfect 10 cups), a few facts (farthest cup from Madison, go-to order, busiest month) and animated bars for stops by sport, average coffee rating by weekday and how the cups rated. Everything is computed from saved visits (`frontend/src/utils/funStats.js`); nothing is stored or invented. Animations start when the section scrolls into view and are off under reduced motion. Hand-typed shops without coordinates are left out of the distance stats. Verified on read-only production data at desktop and 375px mobile.

## 2026-10-14 — Game-day suggestions in Add visit

Picking a date in a new road-trip visit now looks up Wisconsin games that day and offers a one-tap fill for sport, opponent and the game's city. It reads Sidearm's public iCal feeds on uwbadgers.com (football, men's basketball, men's hockey, men's track and field, cross country) through `GET /api/badger-games?date=YYYY-MM-DD`, and falls back to ESPN for men's basketball when that feed is down. Typed values are never overwritten, Madison games don't fill the city (that would flip the visit to a home stop), and a failed lookup just shows no suggestion. Visits still have no home/away field; the suggestion shows at, vs or neutral but only saves sport, opponent and city. The men's track feed still shows the 2025–26 season, so it matches no 2026–27 dates yet. Nothing writes to the database and no Cloudflare settings changed.

## 2026-10-04 — Verified data cleanup and score safeguards

With approval and a fresh private database backup, repaired Madison Chocolate Company's Odana Road branch and Yaw Farm using exact Apple place IDs and coordinates. All 34 visits across 33 stable shops are now mapped. Corrected Finca's municipality to Fitchburg, cleared a leftover home opponent, repaired seven track meet labels, corrected Pike Place Coffee, and standardized order capitalization and whitespace without rewriting personal notes. Linked all 35 Vest games to exact ESPN events and corrected BYU to neutral-site using Wisconsin's official schedule. The versioned owner save retains the original games in a recovery snapshot (revision 1). Ratings, dates, photos, and internal IDs were preserved. The owner confirmed the three black garment labels describe distinct items.

Score loading now derives the correct season from saved games, includes NCAA tournament events, parses ESPN's structured scores, and uses Chicago game dates. Public reads cache supplementary scores only; they cannot rewrite saved game links or change owner revisions. Cached responses exclude other seasons and unlinked events. Around-Madison Apple autocomplete now requires the metro region; road searches retain entered city context.

The ESPN stats screen now uses the existing readable Vest surfaces, leads with final scores and expandable box scores, preserves neutral-site and overtime labels, includes one-game outfit samples, and replaces generated-style labels with factual descriptions. Missing halftime scores are excluded instead of appearing as zero; available halftime records report their coverage. Box scores keep Wisconsin and opponent turnovers in their proper columns, and changing the selected game cannot show a previous game's delayed response.

Verification: 17 frontend and 8 isolated SQLite tests pass, frontend build and backend/shared/Pages syntax checks pass. The actual ESPN schedules produced all 35 expected scores in an isolated database; saved results agree and game records remain unchanged. Authenticated production read-back confirms the planned corrections, stable IDs, and retained snapshot. Live code verification follows deployment. Seven photos and 17 personal notes remain blank rather than invented.

## 2026-10-04 — Whole-site flows and owner editing

The journal now has full shop histories, shareable URLs and browser Back, clearer sorting, sample-aware comparisons, and factual road-season summaries. Return visits start with fresh event context and ratings; track/cross country labels use events rather than head-to-head matchups. The compact warm-paper UI includes narrow-screen and dark treatments, and missing locations have an owner repair flow.

Owner sign-in protects server-side changes, including uploads and Vest saves. Visits move to a recoverable deleted list; a private export includes all journal/recovery records. Stable internal shop IDs reconcile provider aliases only with physical-location evidence. Vest saves validate the complete list, reject stale revisions, preserve ESPN IDs, and create recoverable snapshots. Public browsing never saves games. Generated hype, outfit recommendations, misleading confidence percentages, and the hidden logo mode switch are removed. Outfit summaries show actual completed-game records and games worn.

Verification: 15 frontend and 5 isolated SQLite API tests pass, production frontend build passes. Local owner return-save, deletion/restoration, history/Back, comparisons, season labels, mobile and dark rendering reviewed. Vest saves/restoration and draft retention after session expiry passed. Isolated photo upload and image read-back passed; the native picker could not be automated. Production data backed up; additive migration applied. Production release: https://305b1af5.vibes-and-grinds.pages.dev, source `c75bb59b4cd9e7ead59c45079addf8f92d853b66`, serving https://coffee.erikrole.com. GitHub CI `37251590037` passed. Every original field and ID in the 34 coffee visits and 35 games matches the private backup. Live guest-write denial, owner sign-in/backfill/export, Apple map/autofill, shop links/Back, active/completed seasons, and mobile dark UI passed. With explicit approval, all 251 older unguarded deployments were retired: the original 25, then 226 discovered through a complete paginated inventory. Every retired `/api/visits` URL returns 404. Only protected production/previews remain, and every remaining deployment plus production/main aliases rejects guest writes. An authenticated export confirms all journal/shop/alias/game/recovery fields remain unchanged (34 visits, 33 shops, 35 games, Vest revision 0). Handoff CI `37255032376` passed. Fresh local verification passed all 20 tests, frontend build, and backend/shared/Pages syntax checks.

## 2026-10-04 — Journal UI and maps

Released: compact journal counts and average ratings; clearer add/edit/return flows; saved-shop autofill; optional trip/photo details; precise ratings including zero; draft retention and discard confirmation; immediate filtering and corrected newest/best sorting.

Apple Maps links now work for all entries. MapKit JS search and maps activate when a domain-restricted `APPLE_MAPS_TOKEN` is configured. Google Places search and repaired OpenStreetMap tiles remain the fallback. Apple place IDs are namespaced without a database migration; manual location edits clear stale coordinates.

Verification: frontend tests and build, API syntax checks, and browser review. Successful create/edit persistence passed in an isolated SQLite database. A production domain-restricted Apple Maps token was created and configured with approval; live map rendering, dark mode, and exact business selection/address autofill passed on `coffee.erikrole.com` without changing journal data. Photo upload remains a separate acceptance step. See ROADMAP for remaining work. Production release: https://5d79808d.vibes-and-grinds.pages.dev, source `834fdb3ba02ff9bf97f4d1ce32c4fb11e6a08f81`, serving https://coffee.erikrole.com. Final map polish groups nearby markers and limits autocomplete to businesses. GitHub CI run `37247353845` passed, including all 12 tests, frontend build, and 14 API syntax checks. Live Apple rendering and exact Colectivo Williamson Street autofill passed on the custom domain. Mobile layout, dark/light themes, saved-shop keyboard selection, draft retention, and local create/edit persistence were reviewed. Apple cluster-click zoom was not automated because the SDK uses a closed shadow root; grouped markers rendered successfully. Existing dependency audit findings and photo-upload acceptance remain follow-ups.
