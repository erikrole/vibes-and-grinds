# ☕ Vibes & Grinds

A beautiful web app for tracking coffee shop visits during basketball road trips. Rate the vibe, rate the coffee, and keep track of all your caffeinated adventures!

**🚀 Live at:** [coffee.erikrole.com](https://coffee.erikrole.com)

> **Deploying to Cloudflare?** See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete instructions on deploying to Cloudflare Pages with D1 database.

## Features

- **Clean, Modern Interface** - Beautiful card-based design with intuitive layout
- **Color-Coded Ratings** - Visual gradient system (red → yellow → green) for 0-10 ratings
- **Composite Scoring** - Automatically calculates total score (vibe + coffee)
- **Google Places Integration** - Autocomplete for coffee shop names and addresses
- **Date Tracking** - Keep track of when you visited each shop
- **Order History** - Remember what you ordered at each spot
- **Notes** - Add any additional thoughts or memories

## Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Google Maps/Places API** - Autocomplete and location data

### Backend
- **Cloudflare Pages Functions** - Single API source for both prod and local dev
- **Cloudflare D1** - SQLite-compatible, globally distributed database
- **Cloudflare R2** - Photo storage

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Maps API key (for autocomplete feature)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd vibes-and-grinds
```

### 2. Install dependencies

```bash
npm install                         # root tooling (wrangler, concurrently)
npm --prefix frontend install
```

### 3. Initialize the local D1 database

```bash
npm run db:init:local               # applies schema.sql to a local D1
```

### 4. Configure secrets

Create a `.dev.vars` file at the repo root for local Pages Functions:

```env
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here  # optional, for /api/vest/blurb
NET_RANKINGS_URL=                          # optional override
AUTH_TOKEN=                                # leave blank to disable auth locally
```

In production, set the same vars as Cloudflare Pages secrets (Settings → Environment variables).

### 5. Run

```bash
npm run dev
```

This starts both Vite (port 3000) and `wrangler pages dev` (port 8788) concurrently. Vite proxies `/api/*` to the local Pages Functions, which talk to your local D1.

Open `http://localhost:3000`.

### Authentication

The Pages Functions enforce a bearer token when `AUTH_TOKEN` is set in the Cloudflare environment. Locally, leave it blank in `.dev.vars` to skip the check, or set it to test the auth flow. The frontend stores the user-entered token in `localStorage` under `vng:auth-token` and prompts on the first 401.

### 4. Getting a Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API (New)**
4. Create credentials (API key)
5. Restrict the key to the Places API (New) and your deployment usage

## Usage

### Adding a Visit

1. Click the "Add Visit" button
2. Select a date (defaults to today)
3. Start typing a coffee shop name - autocomplete will suggest places
4. Enter what you ordered (optional)
5. Rate the vibe (0-10, decimals allowed)
6. Rate the coffee (0-10, decimals allowed)
7. Add any notes (optional)
8. Click "Add Visit"

### Understanding the Ratings

- **Vibe Rating** - Atmosphere, ambiance, seating, music, etc. (0-10)
- **Coffee Rating** - Taste, quality, temperature, presentation (0-10)
- **Composite Score** - Sum of both ratings (0-20)

### Color Coding

- **Red (0-3)** - Not great
- **Orange/Yellow (4-6)** - Decent
- **Yellow/Green (7-8)** - Good
- **Green (9-10)** - Excellent

## API Endpoints

- `GET /api/visits` - Get all visits
- `GET /api/visits/:id` - Get a single visit
- `POST /api/visits` - Create a new visit
- `PUT /api/visits/:id` - Update a visit
- `DELETE /api/visits/:id` - Delete a visit
- `GET /api/stats` - Get dashboard statistics

## Project Structure

```
vibes-and-grinds/
├── functions/api/          # Cloudflare Pages Functions (the API)
│   ├── _middleware.js      # Bearer-token auth + error handling
│   ├── visits.js
│   ├── visits/[id].js
│   └── vest/...
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── utils/          # Helpers (api.js, auth.js, ...)
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # Entry point
│   └── package.json
├── schema.sql              # D1 schema, applied on deploy and locally
├── package.json            # Root scripts (dev, db:init:local, build)
└── README.md
```

See also **[PRODUCT_PLAN.md](./PRODUCT_PLAN.md)** for v1/v2 scope and roadmap.

## Future Features (v2)

- **Interactive Map** - View all coffee shop locations on a map
- **Dashboard Stats** - Average ratings, favorite shops, total visits
- **Year-End Recap** - Fun visualizations and statistics
- **Filtering & Sorting** - Find visits by date, rating, or shop
- **Trip Snapshot** - See total visits and average ratings at a glance
- **Import from Google Sheets** - Migrate existing data
- **Export Reports** - Generate PDFs or spreadsheets

## Development Commands

```bash
npm run dev            # Vite + wrangler pages dev concurrently
npm run dev:web        # Vite only
npm run dev:api        # wrangler pages dev only
npm run db:init:local  # apply schema.sql to local D1
npm run typecheck      # tsc --noEmit
npm run build          # frontend production build
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full Cloudflare Pages + D1 setup.

## Troubleshooting

**Autocomplete not working?**
- Check that `GOOGLE_MAPS_API_KEY` is set in `.dev.vars` locally (or in Cloudflare Pages env vars in production).
- Make sure Places API (New) is enabled in Google Cloud Console.
- Confirm billing is active for the Google Cloud project (click **Activate** in Billing if shown).
- Check API key restrictions and allow Places API (New) for the project key.

**API calls failing locally?**
- Ensure `wrangler pages dev` is running on port 8788 (or run `npm run dev` to start both).
- Confirm the local D1 schema has been applied: `npm run db:init:local`.

**401 Unauthorized in dev?**
- Either remove `AUTH_TOKEN` from `.dev.vars`, or paste the token at the prompt — it persists in `localStorage`.

## Contributing

Feel free to open issues or submit pull requests!

## License

MIT
