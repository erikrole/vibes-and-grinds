# Deploying to coffee.erikrole.com

This guide will walk you through deploying Vibes & Grinds to Cloudflare Pages at `coffee.erikrole.com`.

## Prerequisites

- Cloudflare account with erikrole.com domain
- Wrangler CLI installed: `npm install -g wrangler`
- GitHub repository (already set up)

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

## Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open your browser to authenticate with Cloudflare.

## Step 3: Create D1 Database

```bash
# Create the database
wrangler d1 create vibes-and-grinds-db
```

You'll get output like:
```
Created database vibes-and-grinds-db
Database ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Copy the database ID** and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "vibes-and-grinds-db"
database_id = "paste-your-database-id-here"  # <-- Update this
```

## Step 4: Initialize Database Schema

```bash
# Apply the schema to your D1 database
wrangler d1 execute vibes-and-grinds-db --file=./schema.sql
```

You should see: "Executed 3 commands in X.XXs"

## Step 5: Deploy to Cloudflare Pages

### Option A: Deploy via GitHub (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
2. Click "Create a project" → "Connect to Git"
3. Select your GitHub repository
4. Configure build settings:
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/` (leave empty)

5. Add environment variable:
   - **Variable name**: `VITE_GOOGLE_MAPS_API_KEY`
   - **Value**: `AIzaSyDPyA8g_KNAnANLi4CnjvAxUs9jPPoz2XY`

6. Click "Save and Deploy"

### Option B: Deploy via Wrangler CLI

```bash
# Build the frontend
cd frontend
npm install
npm run build
cd ..

# Deploy to Cloudflare Pages
wrangler pages deploy frontend/dist --project-name=vibes-and-grinds
```

## Step 6: Bind D1 Database to Pages

After deploying, bind the D1 database:

1. Go to Cloudflare Dashboard → Pages → Your project
2. Go to Settings → Functions
3. Scroll to "D1 database bindings"
4. Click "Add binding"
   - **Variable name**: `DB`
   - **D1 database**: Select `vibes-and-grinds-db`
5. Save

**OR** via CLI:

```bash
wrangler pages project create vibes-and-grinds
```

Then add this to `wrangler.toml` and redeploy.

## Step 7: Set Custom Domain

1. Go to Cloudflare Dashboard → Pages → Your project
2. Click "Custom domains" tab
3. Click "Set up a custom domain"
4. Enter: `coffee.erikrole.com`
5. Click "Continue"

Cloudflare will automatically configure DNS for you since erikrole.com is already on Cloudflare.

## Step 8: Secure Your Google Maps API Key

Once deployed, restrict your API key to only work on your domain:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Click on your API key
4. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add: `coffee.erikrole.com/*`
   - Add: `https://coffee.erikrole.com/*`
5. Save

## Step 9: Test Your Deployment

Visit `https://coffee.erikrole.com` and:
1. Try adding a coffee shop visit
2. Check that autocomplete works
3. Verify ratings display correctly

## Updating the App

Every time you push to your GitHub branch, Cloudflare will automatically rebuild and deploy.

Or manually deploy:
```bash
cd frontend
npm run build
cd ..
wrangler pages deploy frontend/dist --project-name=vibes-and-grinds
```

## Viewing Database

To query your production database:

```bash
# View all visits
wrangler d1 execute vibes-and-grinds-db --command="SELECT * FROM coffee_visits ORDER BY date DESC LIMIT 10"

# Get stats
wrangler d1 execute vibes-and-grinds-db --command="SELECT COUNT(*) as total FROM coffee_visits"
```

## Troubleshooting

**API calls failing (404)?**
- Make sure D1 binding is set up (Step 6)
- Check that Functions are enabled in Pages settings

**Autocomplete not working?**
- Verify Google Maps API key is set in environment variables
- Check that Places API is enabled in Google Cloud Console
- Make sure API key restrictions allow your domain

**Database not found?**
- Verify database ID in `wrangler.toml` matches your D1 database
- Check D1 binding in Cloudflare Pages settings

**Build failing?**
- Make sure build command includes `cd frontend &&`
- Verify `frontend/dist` is the output directory

## Local Development with D1

To develop locally with the same D1 database:

```bash
# Run the frontend with local backend
cd backend
npm install
npm start  # Runs on port 3001

# In another terminal
cd frontend
npm run dev  # Runs on port 3000
```

The local backend uses SQLite (`backend/vibes-and-grinds.db`), which is compatible with D1.

## Success! 🎉

Your coffee tracker should now be live at:
**https://coffee.erikrole.com**

Start tracking those basketball road trip coffee adventures!
