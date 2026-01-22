# Quick Start Guide

## Running Locally Right Now

**Terminal 1 - Backend:**
```bash
cd backend
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

Your Google Maps API key is already configured in `frontend/.env`

---

## Deploy to coffee.erikrole.com

### The Fast Way (5 minutes)

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

3. **Update wrangler.toml:**

   Open `wrangler.toml` and paste your database ID:
   ```toml
   database_id = "paste-the-id-here"
   ```

4. **Initialize Database:**
   ```bash
   wrangler d1 execute vibes-and-grinds-db --file=./schema.sql
   ```

5. **Deploy via GitHub:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
   - Click "Create a project" → "Connect to Git"
   - Select your `vibes-and-grinds` repository
   - Build settings:
     - Build command: `cd frontend && npm install && npm run build`
     - Build output: `frontend/dist`
   - Add environment variable:
     - `VITE_GOOGLE_MAPS_API_KEY` = `AIzaSyDPyA8g_KNAnANLi4CnjvAxUs9jPPoz2XY`
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

---

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
