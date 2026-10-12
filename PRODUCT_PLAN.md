# Vibes & Grinds — Product Plan

Personal app: coffee journal (default) and Vest Tracker, live at [coffee.erikrole.com](https://coffee.erikrole.com) on Cloudflare Pages + D1 + Pages Functions. Local: Express + SQLite.

## Shipped

### Coffee journal
- Visit records with vibe and coffee ratings (decimals 0–10, including zero) and an overall sum out of 20
- Saved-shop search, return visits, order, notes, and photo
- Road vs Around Madison, with Madison detected from coordinates or Wisconsin place text
- Filters, sort, map, insights, badges, and July–June road season reviews
- Shareable entry, shop, view, and season URLs with browser Back
- Apple Maps when a public domain-restricted token is configured; Google Places and OpenStreetMap remain the fallback

### Vest Tracker
- Opened from the footer, or via `vests.*` / `?app=vest`
- Saved games, NET rankings, and factual score summaries
- Browsing does not write games. Outfit recommendations and generated blurbs are retired

### Owner access
- Mutations require an owner session. Reads stay public
- The access key is 256 bits of entropy. The server stores only `OWNER_KEY_HASH` (SHA-256). The browser keeps an HttpOnly, same-origin cookie for 12 hours
- Missing `OWNER_KEY_HASH` fails closed. A different origin is rejected before the session is checked
- Visits can be soft-deleted and restored. Owner export omits credentials and sessions. Vest saves keep recovery snapshots and reject stale revisions

### Platform
- Production API is Pages Functions. Local API is Express. Both use `shared/` for auth, visits, shops, and Vest
- Schema source is `schema.sql`. Existing production databases use the additive `migrations/0001_owner_shops_recovery.sql` once, after a backup

## Next

| Item | Status |
|------|--------|
| Finish coffee journal design tokens (semantic Tailwind colors on top of the existing CSS variables) | Follow-up on `main` |
| Split `App.jsx` into coffee and Vest shells | Follow-up on `main` |
| Add Visit flow, mobile filters, first viewport, and Vest hostname entry | Open PRs #45 and #49–#51, written against the old tracker branch; rebase onto `main` |
| Photo storage (keep the current upload vs R2) | Decision |
| Move the Cloudflare production branch to `main` if it is still pinned elsewhere | Infrastructure approval |

## Not a future rewrite

Interactive map, insights, season review, filtering, and owner-only editing already shipped. Do not re-plan them as greenfield.

## Open decisions
- Photos: current upload path vs Cloudflare R2
- Apple Maps token restrictions when preview hostnames need to render maps
- Wider sharing would be a new auth design. The owner session is the gate for this personal site
