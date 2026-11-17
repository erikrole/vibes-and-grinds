---
name: verify
description: Prove a Vibes & Grinds change works before committing or opening a PR by running the tests and build, starting the local backend and Vite dev server, and driving the changed flow in a real browser at desktop and phone width.
---

# Verify a Vibes & Grinds change

Goal: evidence, not a green unit test. Run the cheap checks first, then the real app.
Runs from the repo root on Erik's Mac. Everything stays local: Express + SQLite on :3001,
Vite on :3000 proxying `/api` to it. **Never deploy** (no `wrangler`, no Pages, no `--remote`,
no `VITE_PROXY_TARGET` pointing at production). All output goes under `.claude/verify-output/`
(ignored by `.claude/*`). Judge every step by its exit code, not by `tail`.

## 0. Setup (always)

```bash
O=.claude/verify-output; mkdir -p $O
for p in 3000 3001; do lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null && echo "PORT $p BUSY: stop, don't start a second copy" || echo "port $p free"; done
grep -HE '^(VITE_PROXY_TARGET|VITE_API_URL|NET_RANKINGS_URL)=' frontend/.env backend/.env .env 2>/dev/null   # anything not localhost/empty: stop and ask
[ -f backend/vibes-and-grinds.db ] && cp backend/vibes-and-grinds.db $O/db-before.db && echo "backed up local db" || echo "no local db"
export NODE_PATH="${NODE_PATH:-$HOME/Code/wisconsin-creative/node_modules}"   # playwright is not a repo dependency
node -e "require('playwright')" && echo "playwright ok"
```

A busy port is a stop: Vite would silently move to 3001+ and the backend would fail.
If playwright doesn't resolve, point `NODE_PATH` at any `node_modules` that has it; don't
add it to package.json and don't run `playwright install` (the driver uses installed Chrome).

## 1. Cheap checks (always, ~15 s after `npm ci`)

```bash
(cd frontend && npm ci --no-audit --no-fund > ../$O/ci-frontend.log 2>&1); echo "frontend ci exit $?"   # only if node_modules is missing or a lockfile changed
(cd backend && npm ci --no-audit --no-fund > ../$O/ci-backend.log 2>&1); echo "backend ci exit $?"
(cd frontend && npm test > ../$O/test-frontend.log 2>&1); echo "frontend test exit $?"
grep -E "Test Files|Tests |FAIL|×" $O/test-frontend.log
(cd backend && npm test > ../$O/test-backend.log 2>&1); echo "backend test exit $?"
grep -E "^ℹ (tests|pass|fail|cancelled)|✖" $O/test-backend.log
(cd frontend && npm run build > ../$O/build.log 2>&1); echo "build exit $?"
rc=0; for f in backend/server.js $(find functions -name '*.js'); do node --check "$f" || { echo "FAIL $f"; rc=1; }; done; echo "node --check exit $rc"
```

Pass = every exit 0, vitest `Tests  N passed (N)` with no `FAIL`/`×` line, `node --test`
`ℹ fail 0` with no `✖` line. Report both totals. The `node --check` loop covers every file in
`functions/` (CI's list in `.github/workflows/frontend-build.yml` is a subset). The
"Browserslist: caniuse-lite is old" note is not a failure; don't run the update it suggests.

## 2. Start the real app (always, ~2 s)

```bash
(cd backend && node server.js > ../$O/backend.log 2>&1 & echo $! > ../$O/backend.pid)          # what `npm start` runs
(cd frontend && VITE_PROXY_TARGET=http://localhost:3001 ./node_modules/.bin/vite --port 3000 --strictPort > ../$O/frontend.log 2>&1 & echo $! > ../$O/frontend.pid)   # what `npm run dev` runs
for i in $(seq 30); do curl -sf localhost:3001/api/health >/dev/null && curl -sf -o /dev/null localhost:3000 && break; sleep 1; done
curl -sf localhost:3001/api/health && curl -sf -o /dev/null localhost:3000 && echo "both up" || { echo "FAIL: not up after 30 s"; cat $O/backend.log $O/frontend.log; }
```

Pass = `{"status":"ok"}` and "both up". The backend writes `backend/vibes-and-grinds.db`
(SQLite, gitignored); step 4 puts it back the way it was. There is no Maps key locally,
so Places lookups return 503 (see step 3).

## 3. Drive the changed flow

The driver (`drive.cjs`, headless Chrome, deviceScaleFactor 1) loads the app, adds a visit
through the real form, reloads to check it persisted, switches to Vest mode, then repeats both
modes at 390x844 and checks there's no horizontal scroll. It aborts and reports any non-GET
request to a non-local host.

```bash
node .claude/skills/verify/drive.cjs $O/shots; echo "drive exit $?"    # ~6 s
curl -s localhost:3001/api/visits | head -c 300; echo
```

Pass = exit 0, every `checks` value `true`, `blockedWrites` and `pageErrors` empty, and the
new "Verify Cafe <n>" row in the API output. The one expected error is
`503 GET /api/places-autocomplete` (no Maps key); any other `consoleErrors` or
`failedRequests` entry is a failure. Then **open the PNGs yourself** (`$O/shots/`:
`desktop-vibes-before/after`, `desktop-add-visit-form`, `desktop-vest`, `phone-vibes`,
`phone-vest`) and look at the screens you changed.

Pick the extra coverage that matches the change:

- **UI / layout / copy:** add a `shot()` for the screen you changed in `drive.cjs`, at both
  widths. For dark mode, click the "Switch to dark mode" button before the shot.
- **Visit form, list, filters, journal math:** extend the desktop block (edit, delete, filter)
  and assert the result through `curl localhost:3001/api/visits` as well as on screen.
- **Vest tracker:** the Dashboard tab reads `/api/vest/games` from local SQLite (covered above).
  Only when the diff touches Game Stats or NET Rankings, click those tabs in `drive.cjs` too:
  the backend fetches them from ESPN / Warren Nolan with plain GETs (not run in the dry run).
  "Generate AI take" (`/api/vest/blurb`) is a Pages function with no Express route, so it
  can't be verified locally.
- **`functions/` (Cloudflare Pages handlers):** they don't run locally; `backend/test/handlers.test.mjs`
  is the coverage. Add a test there. Don't use `wrangler pages dev` against a remote D1.
- **Places autocomplete, photo upload:** need a Maps key / R2, so they can't be covered here.
  Say so in the trailer.

Look at the output yourself. "It built" is not verification.

## 4. Clean up (always)

```bash
kill $(cat $O/backend.pid) $(cat $O/frontend.pid)          # only the two we started; never pkill node
for i in 1 2 3 4 5; do lsof -nP -iTCP:3000 -iTCP:3001 -sTCP:LISTEN >/dev/null || break; sleep 1; done
lsof -nP -iTCP:3000 -iTCP:3001 -sTCP:LISTEN || echo "ports free"
[ -f $O/db-before.db ] && cp $O/db-before.db backend/vibes-and-grinds.db || rm -f backend/vibes-and-grinds.db
git status --short    # want nothing new outside .claude/verify-output/
```

The driver closes its own Chrome; `pgrep -fl -- --headless` should print nothing.

## 5. Report the evidence

In the commit message, add one trailer line:

```
Verified: frontend vitest N passed, backend node --test M passed, vite build, local app on :3000/:3001, <what you drove and saw>
```

Use `Verified: none (<reason>)` if you truly couldn't verify. Never leave it out.
In the thread reply, attach or link the screenshots and give the test counts.

## Rules when something fails

- **Three strikes.** Fix and rerun up to 3 rounds. If it still fails, stop and tell Erik
  what fails, what you tried and the exact output. Don't keep going.
- **Never game the check.** No skipping or disabling tests, no adding sleeps, no rerunning
  until it passes, no loosening an assertion to match new output, no editing this skill to
  make your change pass.
- **Flaky test?** Find the root cause. If you can't, say so to Erik with the evidence;
  don't silently delete or retry it.
- **When a bug slips past this skill**, add the check that would have caught it here
  (one line in the table or step 3), in the same PR as the fix.
