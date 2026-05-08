# Plan: Men's Basketball Calendar Sync for Vest Tracker

## Overview

Add the ability to subscribe to the Wisconsin men's basketball schedule as a calendar feed (`.ics`) so users can have upcoming games appear automatically in Apple Calendar, Google Calendar, Outlook, etc. — and optionally include vest/outfit data alongside each event.

---

## What "Calendar Sync" Means

Two complementary approaches, both worth building:

### Approach A — ICS Feed (Subscribe URL)
A server-generated `.ics` (iCalendar) endpoint that calendar apps can subscribe to. The calendar auto-refreshes on a schedule (typically every few hours).

**Endpoint:** `GET /api/vest/calendar.ics`

**What each event contains:**
- **Title:** `Wisconsin vs. Michigan State` or `Wisconsin @ Ohio State`
- **Date/Time:** Game date (and tip-off time if available from ESPN)
- **Location:** Arena name + city (from ESPN data)
- **Description:** Outfit worn, result (W/L), OT flag, ranking context
- **Status:** `TENTATIVE` for future games, `CONFIRMED` for played games

**Why this is great:**
- One-click subscribe from the Vest Tracker UI
- Works with every major calendar app
- Auto-updates as games are played and outfits/results are logged
- Zero ongoing effort from the user after subscribing

### Approach B — "Add to Calendar" Buttons (Single Event)
For individual games, offer quick "Add to Calendar" links (Google Calendar URL, `.ics` download, Outlook deeplink).

**Use case:** Sharing a specific game with someone, or manually adding just one game.

---

## Technical Design

### 1. New API Endpoint: `/api/vest/calendar.ics`

**Implementation (Cloudflare Pages Function + local Express):**

```
functions/api/vest/calendar.js   (Cloudflare)
backend route in server.js       (local dev)
```

**Logic:**
1. Fetch all vest games from the database (same as `GET /api/vest/games`)
2. Optionally fetch ESPN schedule for tip-off times + arena info
3. Generate an iCalendar (RFC 5545) document with:
   - `VCALENDAR` wrapper with `PRODID`, `VERSION`, `X-WR-CALNAME`
   - One `VEVENT` per game
   - `DTSTART` / `DTEND` (all-day if no time, timed if ESPN provides tip-off)
   - `SUMMARY`: "Wisconsin {vs/@} {Opponent}"
   - `DESCRIPTION`: Outfit, result, ranking, OT
   - `LOCATION`: Arena (if available)
   - `UID`: Stable unique ID per game (e.g., `vest-game-{game_id}@coffee.erikrole.com`)
   - `STATUS`: TENTATIVE (future) / CONFIRMED (played)
4. Return with `Content-Type: text/calendar; charset=utf-8`

**Query params:**
- `?outfit=true` — include outfit info in event description (default: true)
- `?results=true` — include W/L results (default: true)
- `?future_only=true` — only include upcoming games

**No auth needed** — this is a personal app, and the data is non-sensitive.

### 2. ICS Generation

**Option A: Build strings manually** — iCalendar format is simple enough that we can template it without a library. Keeps bundle small for Cloudflare Functions.

**Option B: Use `ics` npm package** — More robust, handles escaping and edge cases. ~15KB, reasonable for this use.

**Recommendation:** Build it manually. The format is straightforward, we control the data, and it avoids a dependency for Cloudflare Functions.

Example output:
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Vibes & Grinds//Vest Tracker//EN
X-WR-CALNAME:Wisconsin Basketball (Vest Tracker)
BEGIN:VEVENT
UID:vest-game-25@coffee.erikrole.com
DTSTART;VALUE=DATE:20260213
SUMMARY:Wisconsin vs. Michigan State (#10)
DESCRIPTION:Outfit: Gray Suit Coat\nResult: W\nRanking: #10
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
```

### 3. Frontend UI Changes

**Location:** `VestTrackerDashboard.jsx`

**New elements:**
- **"Sync to Calendar" button** in the dashboard header/toolbar area
  - Click opens a small popover/modal with:
    - Calendar subscribe URL (copyable)
    - `webcal://` link (one-click subscribe for Apple Calendar)
    - Google Calendar subscribe link
    - Brief instructions
  - Icon: calendar icon (can use inline SVG, consistent with existing icon style)

- **Per-game "Add to Calendar" link** (optional, lower priority)
  - Small calendar icon on each game chip in the timeline
  - Generates a single-event `.ics` download or Google Calendar URL

### 4. ESPN Schedule Enhancement

The existing `/api/vest/schedule` endpoint already fetches from ESPN. We can enhance it to also capture:
- **Tip-off time** (currently not stored)
- **Arena/venue name** (currently not stored)

These would make calendar events much more useful (timed events > all-day events).

**Schema addition to `vest_games`:**
```sql
ALTER TABLE vest_games ADD COLUMN tip_off TEXT;     -- e.g., "7:00 PM ET"
ALTER TABLE vest_games ADD COLUMN venue TEXT;        -- e.g., "Kohl Center, Madison, WI"
```

---

## Implementation Steps

### Phase 1 — Core ICS Feed
1. Add ICS generation utility function (`frontend/src/utils/icsGenerator.js` or `functions/api/vest/calendar.js`)
2. Create `functions/api/vest/calendar.js` Cloudflare Function
3. Add matching route in `backend/server.js` for local dev
4. Test with Apple Calendar and Google Calendar

### Phase 2 — Frontend Subscribe UI
5. Add "Sync to Calendar" button + popover to `VestTrackerDashboard.jsx`
6. Generate proper `webcal://` and Google Calendar subscribe URLs
7. Copy-to-clipboard for the raw URL

### Phase 3 — Enriched Events (Optional Enhancement)
8. Add `tip_off` and `venue` columns to `vest_games` schema
9. Enhance ESPN schedule fetch to capture time + venue
10. Update ICS generation to use timed events when tip-off is available

---

## Scope & Complexity

| Item | Effort | Priority |
|------|--------|----------|
| ICS endpoint (manual generation) | Small | P0 |
| Local Express route | Small | P0 |
| Subscribe UI button + popover | Medium | P0 |
| Per-game "Add to Calendar" | Small | P1 |
| Tip-off time + venue enrichment | Medium | P2 |

**Overall: Small-Medium scope.** The ICS format is simple, the data already exists, and the UI addition is a single button + popover.

---

## Open Questions

1. **Include past games or future only?** Default to all games (full season view is useful), but offer a `?future_only=true` param.
2. **Calendar name?** Suggest: "Wisconsin Basketball (Vest Tracker)" — fun but clear.
3. **Should results auto-update in the calendar?** Yes — since it's a feed, subscribers get updates when games are played and results/outfits are logged.
4. **Tip-off times — worth the ESPN enrichment now?** Nice-to-have. Can ship Phase 1 without it (all-day events) and add later.
