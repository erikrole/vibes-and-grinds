# Quick Start Guide

Coffee journal + Vest Tracker. **Production = Cloudflare Pages + D1 + Functions** ([DEPLOYMENT.md](./DEPLOYMENT.md)). Local = Express + SQLite.

## Running Locally Right Now

**Terminal 1 - Backend:**
```bash
cd backend
cp .env.example .env   # includes ALLOW_INSECURE_WRITES=true for local
npm install
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Then open: http://localhost:3000

Set your Google Maps API key (backend/root `GOOGLE_MAPS_API_KEY` and/or frontend `.env`) before relying on autocomplete. `VITE_API_URL=http://localhost:3001` for local API.

Local writes work after `cp .env.example .env` because that file sets `ALLOW_INSECURE_WRITES=true` and leaves `WRITE_KEY` unset. For production-like local writes, set the same long random `WRITE_KEY` in `backend/.env` and optionally `VITE_WRITE_KEY` in `frontend/.env` (see [DEPLOYMENT.md](./DEPLOYMENT.md) Step 9). Never commit the real key.

---

## Deploy to coffee.erikrole.com

### The Fast Way

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Create D1 Database:**
   ```bash
   wrangler d1 create vibes-and-grinds-db
   ```

   Copy the database ID it gives you.

3. **Remember the database ID** for the Pages `DB` binding (Step 6). Optional: put it in a local `wrangler.toml` if you deploy via CLI.

4. **Initialize Database:**
   ```bash
   wrangler d1 execute vibes-and-grinds-db --remote --file=./schema.sql
   ```

5. **Deploy via GitHub:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
   - Click "Create a project" → "Connect to Git"
   - Select your `vibes-and-grinds` repository
   - Build settings:
     - Build command: `cd frontend && npm install && npm run build`
     - Build output: `frontend/dist`
   - Add environment variables:
     - `GOOGLE_MAPS_API_KEY` = `your_new_google_maps_api_key`
     - (Optional legacy fallback) `VITE_GOOGLE_MAPS_API_KEY` = `your_new_google_maps_api_key`
     - `WRITE_KEY` = long random secret (`openssl rand -hex 32`) as a Functions secret. Required. Do not set `VITE_WRITE_KEY` unless the key may live in the JS bundle.
   - Click "Save and Deploy"

6. **Bind Database:**
   - After deployment, go to Settings → Functions
   - Add D1 binding:
     - Variable name: `DB`
     - Database: Select `vibes-and-grinds-db`

7. **Set Custom Domain:**
   - Go to Custom domains tab
   - Add: `coffee.erikrole.com`
   - Cloudflare handles DNS automatically

**Done!** Visit https://coffee.erikrole.com

> Security tip: Rotate/restrict your key in Google Cloud (HTTP referrers + API restrictions) and do not commit real keys to git.

---

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
