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
- **Node.js & Express** - RESTful API (local development)
- **Cloudflare Pages Functions** - Production API
- **SQLite / Cloudflare D1** - Lightweight, globally distributed database
- **CORS enabled** - Frontend/backend communication

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Maps API key (for autocomplete feature)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd vibes-and-grinds
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env if needed (default port is 3001)
npm start
```

The backend will:
- Start on `http://localhost:3001`
- Create a SQLite database file (`vibes-and-grinds.db`)
- Initialize the database schema automatically

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

**Important:** Edit `frontend/.env` and add your Google Maps API key:

```env
VITE_API_URL=http://localhost:3001
```

Then in the project root `.env` (for the backend), add:

```env
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
NET_RANKINGS_URL=https://big-ten-standings.erikrole.workers.dev  # optional override
```

If you want the frontend to call your worker directly instead of the API proxy, you can also set:

```env
VITE_NET_RANKINGS_URL=https://big-ten-standings.erikrole.workers.dev  # optional direct browser override
```

The vest tracker accepts either a dedicated NET rankings payload, your Big Ten standings worker shape (`{ standings: [{ team, netRank, ... }] }`), or a full D1 map shape (`{ netRankings: { "DUKE": 1, ... } }`). If no env var is set on the API, it defaults to `https://www.warrennolan.com/basketball/2026/net` and parses all teams from HTML.

Vest games now sync via `/api/vest/games` backed by DB storage (instead of device-only localStorage), so updates on one device can appear on another once both are online.

If using Cloudflare D1, re-run migrations/schema apply so `vest_games` exists.

Then start the development server:

```bash
npm run dev
```

The frontend will open at `http://localhost:3000`

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
├── backend/
│   ├── server.js           # Express server
│   ├── database.js         # Database initialization
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── utils/          # Helper functions
│   │   ├── App.jsx         # Main app component
│   │   ├── main.jsx        # Entry point
│   │   └── index.css       # Tailwind styles
│   ├── index.html
│   ├── package.json
│   └── .env.example
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

### Backend
```bash
npm run dev    # Start with nodemon (auto-reload)
npm start      # Start production server
```

### Frontend
```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run preview # Preview production build
```

## Deployment

### Frontend (Vercel)
1. Connect your GitHub repo to Vercel
2. Set environment variable: `GOOGLE_MAPS_API_KEY` (and optionally `VITE_GOOGLE_MAPS_API_KEY` for legacy frontend usage)
3. Build command: `cd frontend && npm install && npm run build`
4. Output directory: `frontend/dist`

### Backend (Railway/Heroku)
1. Deploy the `backend` folder
2. Set environment variable: `PORT` (provided by platform)
3. For production, consider upgrading to PostgreSQL

## Troubleshooting

**Autocomplete not working?**
- Check that `GOOGLE_MAPS_API_KEY` is set in the backend/root `.env` (or in Cloudflare Pages env vars).
- Make sure Places API (New) is enabled in Google Cloud Console.
- Confirm billing is active for the Google Cloud project (click **Activate** in Billing if shown).
- Check API key restrictions and allow Places API (New) for the project key.

**Backend not connecting?**
- Ensure backend is running on port 3001
- Check that `VITE_API_URL` in frontend `.env` matches backend URL

**Database issues?**
- Delete `backend/vibes-and-grinds.db` and restart the server to reset

## Contributing

Feel free to open issues or submit pull requests!

## License

MIT
