# Roadmap

## Implemented in the current UI/maps update

- Compact journal summary and navigation; quieter copy and restrained motion.
- Correct newest/best sorting, saved-shop autofill, optional trip/photo details, precise ratings, and visible save action.
- Preserve drafts on failed saves and confirm before discarding unsaved changes.
- Provider-safe Apple place IDs and Apple Maps links for new, existing, and manual entries.
- Conditional MapKit JS map/search integration; repaired OpenStreetMap fallback.
- Accessible search keyboard controls, coordinate validation, and mapping/sorting regression checks.

## Remaining acceptance

- The production Apple Maps token was provisioned with approval on 2026-10-04 and restricted to `coffee.erikrole.com`. Live search/map acceptance follows deployment.
- Verify actual Apple search, canonical place identity, map markers, dark mode, and attribution on the approved domains after configuration.
- Successful create/edit persistence, including zero and decimal ratings, passed against a temporary local SQLite database. Photo upload remains an additional acceptance step; production data was not changed during testing.

## Follow-up maintenance

- Review existing dependency audit findings separately; this change is not a dependency security remediation.
- Consider moving the Cloudflare production branch to main after explicit infrastructure approval. Current releases can target the existing production branch without changing its setting.
