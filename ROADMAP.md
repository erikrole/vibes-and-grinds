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
- With explicit approval, all 251 older unguarded Pages deployments were retired on 2026-10-04 (the first 25, then 226 found through pagination). All 251 `/api/visits` URLs return 404. A complete inventory leaves only the protected production release and protected previews; every remaining deployment and production/main alias rejects guest writes. Every journal/shop/alias/game/recovery field matches the pre-retirement export: 34 visits, 33 shops, 35 games, Vest revision 0.
- Wrangler lists only the first 25 deployments: always inspect every Cloudflare API page when auditing deployment history. Handoff CI `37255032376` passed; the production source remains `c75bb59`.
- Native photo-picker automation is unavailable in the current in-app browser; isolated upload and image read-back passed; manual picker acceptance remains distinct.
- Approved data cleanup on 2026-10-04 mapped the two missing locations against exact Apple place pages. All 34 visits across 33 shops now have coordinates. Corrected Finca's municipality, seven meet labels, home event context, Pike Place spelling, and formatting. All 35 games have exact ESPN links; BYU is neutral-site. Stable IDs, ratings, dates, photos, and personal note wording were preserved. Vest revision is now 1 with the original game list retained in a recovery snapshot.
- Score-loading safeguards and Madison-scoped Apple search pass 16 frontend and 8 isolated SQLite tests plus the build and syntax checks. Both ESPN schedule types produced all 35 actual scores in an isolated copy; results agree and saved games remain unchanged. Live verification of the new code follows deployment.
- Seven missing photos and 17 empty notes remain optional personal additions. Black Vest, Black Zipup Vest, and Black Pullover are distinct garments, confirmed by the owner; keep their labels separate.

## Follow-up maintenance

- Review existing dependency audit findings separately.
- Consider changing the Cloudflare production branch to main only with explicit infrastructure approval. Releases target the existing production branch.
