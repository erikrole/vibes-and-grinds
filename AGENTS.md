# Vibes & Grinds handoff

Follow `/Users/role/Code/AGENTS.md` and the RoleDev handoff contract. Work main-first; preserve unrelated changes. Read README and ROADMAP before changing behavior.

## Boundaries

- Coffee journal and Vest Tracker share the shell; preserve the unrelated mode.
- Keep the existing warm paper/espresso palette, Fraunces for identity/shop names, and Inter for controls. Prefer useful compact rows, sentence-case copy, immediate filtering, and restrained motion with reduced-motion support.
- Production is Cloudflare Pages project `vibes-and-grinds`, custom domain `coffee.erikrole.com`, existing D1 binding `DB`. On 2026-10-04 the production branch is `claude/coffee-shop-tracker-iIWcb`; main is a preview branch. Verify current settings before deployment. Do not change production branch or bindings without approval.
- Never commit credentials, runtime databases, photos, exports, or browser-review artifacts. `.env` files are ignored.
- Ask before credential/auth/infrastructure changes or destructive data operations. A public Maps token still requires explicit provisioning approval; never expose its private signing key.
- Use `VITE_PROXY_READ_ONLY=true` whenever previewing production data locally. Do not create test visits in production.

## Verification

Run `npm --prefix frontend test`, `npm --prefix frontend run build`, and all backend/Pages syntax checks in `.github/workflows/frontend-build.yml`. Review changed flows in the browser, including a narrow mobile viewport and dark mode. Tests using a mocked SDK are not live Maps proof.

Keep README, ROADMAP, and change notes accurate. Report actual checks, commit SHA, deployment URL, and any remaining credential or live verification boundary.
