# Deploying Vibes & Grinds

The existing Cloudflare Pages project is `vibes-and-grinds`, serving [coffee.erikrole.com](https://coffee.erikrole.com) and `vibes-and-grinds.pages.dev`. It already has the production D1 `DB` binding. Do not recreate the project or database.

As verified on 2026-10-04, production tracks `claude/coffee-shop-tracker-iIWcb`; pushes to main produce previews. Verify this in the current deployment list before releasing. Changing that branch is an infrastructure change requiring approval.

## Release an update

Run frontend and backend tests and the frontend build and the syntax checks from `.github/workflows/frontend-build.yml`. Commit only source/docs; omit databases, private files, credentials, and generated review artifacts.

From the repository root, an authorized direct release can target the existing production branch, preserving current bindings and environment configuration:

```sh
npx wrangler pages deployment list --project-name=vibes-and-grinds
npx wrangler pages deploy frontend/dist --project-name=vibes-and-grinds --branch=claude/coffee-shop-tracker-iIWcb
```

Running from the repository root includes `functions/`. Record the returned deployment URL and source SHA. Verify the actual custom domain, journal data, map, and changed entry flows; a successful upload alone is not acceptance.

## Mapping configuration

The optional `APPLE_MAPS_TOKEN` is a public MapKit JS token restricted to the approved website domains. Obtain explicit approval before provisioning credentials or changing Cloudflare environment configuration. Use Apple Developer’s Maps setup and store only the browser token, never the `.p8` private signing key. `/api/maps-config` deliberately exposes the public token to the browser.

After approved configuration and redeployment, check live autocomplete, exact selected shop/address/coordinates, map markers, light/dark themes, and browser-console errors. Domain-restricted tokens need the actual domain to test; localhost or preview hosts need separate authorized restrictions.

Without a token, saved-shop/manual entry still works, remote autocomplete uses the existing `GOOGLE_MAPS_API_KEY`, and the map uses OpenStreetMap tiles with visible attribution. Do not change existing Google credentials as part of this update.

## Data and rollback

The whole-site update requires `migrations/0001_owner_shops_recovery.sql` once on existing D1. Inspect columns first and export a private database backup. The migration adds columns/tables; original journal and game rows remain intact. Configure the generated owner access-key hash as production `OWNER_KEY_HASH`; missing keys fail closed. After deploying, sign in and run owner-only `/api/owner/backfill`, then compare all original fields and counts with the backup. Never create production test visits.

A code rollback must retain the owner-write middleware and recovery contracts. Do not roll back to the old public-write release. Retire or restrict **all** older unguarded production and preview deployments, not just the custom domain: immutable Pages URLs can still invoke their old functions against shared bindings. Retirement removes deployment URLs/history and requires explicit approval under the workspace contract. Preserve source in Git and retain the private backup before retirement. Preserve the current production bindings. Inspect and back up data before any migration; destructive changes require approval. Roll back code by redeploying a previously verified source/build or using the Pages deployment rollback capability. Do not reset a database to diagnose a frontend issue.

Local development uses SQLite; see README. A local production-data preview must have `VITE_PROXY_READ_ONLY=true`.
