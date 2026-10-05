# Change notes

## 2026-10-04 — Journal UI and maps

Prepared for release: compact journal counts and average ratings; clearer add/edit/return flows; saved-shop autofill; optional trip/photo details; precise ratings including zero; draft retention and discard confirmation; immediate filtering and corrected newest/best sorting.

Apple Maps links now work for all entries. MapKit JS search and maps activate when a domain-restricted `APPLE_MAPS_TOKEN` is configured. Google Places search and repaired OpenStreetMap tiles remain the fallback. Apple place IDs are namespaced without a database migration; manual location edits clear stale coordinates.

Verification: frontend tests and build, API syntax checks, and browser review. Successful create/edit persistence passed in an isolated SQLite database. A production domain-restricted Apple Maps token was created and configured with approval; live authentication/rendering is checked after deployment. Photo upload remains a separate acceptance step. See ROADMAP for remaining work. Deployment status will be recorded after release.
