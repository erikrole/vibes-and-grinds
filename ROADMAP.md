# Roadmap

## Implemented in the whole-site update

- Compact journal, clear sorting/filtering, warm light/dark themes, and restrained motion.
- Shareable entry, shop, view, and season URLs with browser Back and full shop histories.
- Stable internal shop IDs and evidence-based Apple/Google provider aliases; chain branches stay separate.
- Return visits reset event context and ratings. Meets use event labels; around-Madison visits omit game context.
- Comparisons include single visits, display sample counts, and open their source entries.
- Factual July–June road-season reviews distinguish active and completed seasons, actual new shops, and single samples.
- Server-enforced owner editing, private export, recoverable visits, and versioned/conflict-safe Vest saves.
- Explicit Vest footer navigation. Browsing never saves games. Generated hype and outfit recommendations removed.
- Missing locations have an owner repair flow; pins represent shops rather than duplicate visits.

## Verification and release gates

- Apple Maps was enabled with approval and restricted to `coffee.erikrole.com`; verify it on that domain after each affected release.
- Frontend and isolated SQLite API regression tests pass. Local review covers owner sign-in, return save, deletion/restoration, shop history/Back, comparison counts, current/completed seasons, narrow dark layout, Vest game save/snapshot restore, and draft retention through owner-session expiry.
- Production released at https://305b1af5.vibes-and-grinds.pages.dev (source `c75bb59b4cd9e7ead59c45079addf8f92d853b66`), serving https://coffee.erikrole.com. GitHub CI run `37251590037` passed. Every original field and ID matches the private backup: 34 coffee visits, 35 Vest games, no deleted original rows; all visits have stable shop IDs.
- Live checks passed: guest mutations rejected on visit CRUD/upload/Vest/backfill; owner sign-in/backfill/export; Apple rendering and exact Williamson Street autofill; shop history/Back; factual active/completed seasons; mobile dark journal.
- Retire or restrict old unguarded Pages deployment URLs before considering owner-write protection complete. Retirement needs separate explicit approval.
- Native photo-picker automation is unavailable in the current in-app browser; isolated upload and image read-back passed; manual picker acceptance remains distinct.
- Two original visits lack location coordinates. The repair flow exposes them; do not guess a business branch or fabricate pins.

## Follow-up maintenance

- Review existing dependency audit findings separately.
- Consider changing the Cloudflare production branch to main only with explicit infrastructure approval. Releases target the existing production branch.
