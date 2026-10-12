# Quick Start

Coffee journal and Vest Tracker. Production is Cloudflare Pages + D1 + Pages Functions at [coffee.erikrole.com](https://coffee.erikrole.com). Local development is Express + SQLite. Editing requires an owner session. Reads stay public.

## Run locally

Use Node 20 or newer.

```bash
npm --prefix frontend ci
npm --prefix backend ci
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**Terminal 1 — API** (start it from `backend/` so SQLite is created there):

```bash
cd backend
npm start
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
```

Open http://localhost:3000. Vite proxies `/api` to http://localhost:3001.

Set `LOCAL_ORIGIN=http://localhost:3000` in `backend/.env` to the exact origin you open (use `http://127.0.0.1:3000` if that is the host). Writes require that origin.

Owner sign-in uses a generated 256-bit access key. Put only its SHA-256 digest in `OWNER_KEY_HASH`. Never commit the key, and never use a human password. Without the hash, mutations fail closed. Sign in from the footer; the session cookie is HttpOnly and lasts 12 hours.

Saved shops and manual entry work without map credentials. Optional `APPLE_MAPS_TOKEN` is a public MapKit JS token. `GOOGLE_MAPS_API_KEY` is the Places fallback. Never put a private `.p8` signing key in either variable.

To preview production data without writing to it:

```bash
cd frontend
VITE_PROXY_TARGET=https://coffee.erikrole.com VITE_PROXY_READ_ONLY=true npm run dev
```

## Checks

```bash
npm --prefix frontend test
npm --prefix backend test
npm --prefix frontend run build
```

## Release

The live site and database already exist. Do not create a second D1 database or Pages project. Merge to `main` and follow [DEPLOYMENT.md](./DEPLOYMENT.md).
