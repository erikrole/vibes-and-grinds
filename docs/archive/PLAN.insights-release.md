# Analytics & Insights Release — Implementation Plan

## Overview

Add a new **Insights** tab/section to the Vibes & Grinds mode that surfaces streaks, leaderboards, trends, and deep dives from existing visit data. All computation is client-side (visits are already loaded). Charts use a lightweight library. No backend changes needed.

---

## 1. Charting Library

**Add `recharts`** — React-native, composable, lightweight (~45KB gzipped), Tailwind-friendly, dark mode via props. No canvas — pure SVG so it renders crisp on Retina/mobile.

```
npm install recharts
```

---

## 2. New Component: `InsightsPanel.jsx`

Lazy-loaded like VestTrackerDashboard. Rendered inside App.jsx when user taps an "Insights" tab below the snapshot cards. Receives `visits` as a prop.

### Internal structure (sub-components, all in one file to start):

```
InsightsPanel
├── StreaksSection        — active streaks + personal bests
├── LeaderboardsSection   — top shops, cities, orders, sport-day analysis
├── TrendsSection         — rolling average chart, frequency chart, distribution
└── DeepDivesSection      — per-city cards, coffee-to-game crossover
```

---

## 3. Feature Breakdown

### 3A. Streaks & Milestones

**Data** — derived from `visits` sorted by date.

| Insight | Logic |
|---------|-------|
| Active vibe streak | Consecutive visits with vibe ≥ threshold (8.0) |
| Active composite streak | Consecutive visits with composite ≥ 16 |
| Longest streak ever | Max consecutive above threshold |
| Personal bests | Highest vibe, highest coffee, highest composite, lowest composite |
| Milestone badges | 10th visit, 25th visit, 50th; first 10.0 vibe; first 10.0 coffee; first 20/20 composite |

**UI** — Horizontal scrollable badge row (reuses vest tracker badge style) + "Active Streak" highlight card.

### 3B. Leaderboards

**Data** — aggregated from visits with `useMemo`.

| Leaderboard | Logic | Min threshold |
|-------------|-------|---------------|
| Top shops by composite | avg composite per shop | ≥2 visits |
| Top cities by vibe | avg vibe per city | ≥2 visits |
| Top coffee orders | avg composite when ordering X | ≥2 orders |
| Sport-day bonus | avg vibe on game days vs non-game days | — |
| Best opponent matchups | avg composite when visiting before/after playing X | ≥2 visits |

**UI** — Ranked list with position badges (#1, #2, #3 gold/silver/bronze), mini progress bars showing relative scores. Each leaderboard is a collapsible section.

### 3C. Trends & Charts (recharts)

| Chart | Type | Data |
|-------|------|------|
| Rating trend | Line chart | Rolling 5-visit average of vibe + coffee over time |
| Visit frequency | Bar chart | Visits per month |
| Rating distribution | Histogram | Count of visits in each 0.5 rating bucket (0–10) |
| Composite heatmap | Simple grid | Vibe (y) × Coffee (x) with dot count per cell |

**UI** — Each chart in its own card with section headers. Recharts `ResponsiveContainer` for mobile. Dark mode colors via Tailwind's CSS variables passed to recharts theme.

### 3D. Deep Dives

| Insight | Logic |
|---------|-------|
| City cards | Per-city: visit count, avg ratings, top shop, top order, best/worst visit |
| Coffee × Game result | If sport data exists: win rate correlation with coffee order (leverages vest tracker game data) |
| Day-of-week patterns | Avg ratings by day of week — "You rate 0.6 higher on Saturdays" |
| Time trends | "Getting pickier?" — compare first-half vs second-half average ratings |

**UI** — City cards as a grid (like outfit cards in vest tracker). Cross-mode insights only shown if both vibes data and vest data exist.

---

## 4. Navigation / UX

Add a segmented control below the snapshot cards in App.jsx:

```
[ Visits ]  [ Insights ]
```

- Default: Visits (current view)
- Insights: Replaces the visit list with InsightsPanel
- Persisted in viewPrefs (localStorage)

The snapshot cards (Total Visits, Avg Vibe, etc.) stay visible in both views — they're the shared header.

---

## 5. File Changes

| File | Change |
|------|--------|
| `package.json` | Add `recharts` dependency |
| `App.jsx` | Add Insights tab toggle, lazy-load InsightsPanel |
| `components/InsightsPanel.jsx` | **NEW** — all analytics sections |
| `utils/insights.js` | **NEW** — pure computation functions (streaks, leaderboards, trends) |

No backend changes. No database changes. No new API endpoints.

---

## 6. Implementation Order

1. Install recharts, create `utils/insights.js` with pure data functions
2. Build `InsightsPanel.jsx` shell with section layout
3. Implement Streaks & Milestones section
4. Implement Leaderboards section
5. Implement Trends & Charts section (recharts)
6. Implement Deep Dives section
7. Wire into App.jsx with tab toggle
8. Dark mode + mobile polish
9. Build, test, commit
