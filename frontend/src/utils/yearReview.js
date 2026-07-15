// Computes all data needed for the Season-in-Review / Wrapped experience.
// Seasons roll over July 1: the "2025-26" season = Jul 1 2025 – Jun 30 2026.

import { computeBadges } from './badges';
import { detectStreak } from './insights';
import { titleCaseOrder } from './display';

const PERSONAS = [
  { id: 'explorer', name: 'The Explorer', emoji: '🧭', description: 'You chase the new — always discovering a different shop.', test: (d) => d.uniqueShops / d.totalVisits > 0.7 },
  { id: 'regular', name: 'The Regular', emoji: '🏠', description: 'You found your spot and you\'re sticking to it.', test: (d) => d.mostVisitedShop && d.mostVisitedShop.count / d.totalVisits > 0.4 },
  { id: 'road-warrior', name: 'The Road Warrior', emoji: '✈️', description: 'Coffee in every city — you\'re always on the move.', test: (d) => d.uniqueCities >= 8 },
  { id: 'vibes-chaser', name: 'The Vibes Chaser', emoji: '🎵', description: 'Atmosphere matters more than anything in the cup.', test: (d) => d.avgVibe - d.avgCoffee > 1.5 },
  { id: 'connoisseur', name: 'The Connoisseur', emoji: '🫘', description: 'It\'s all about the coffee — quality over vibes.', test: (d) => d.avgCoffee > 8 && d.totalVisits >= 10 },
  { id: 'critic', name: 'The Critic', emoji: '🧐', description: 'High standards, tough love — only the best will do.', test: (d) => d.avgComposite < 12 && d.totalVisits >= 10 },
  { id: 'enthusiast', name: 'The Enthusiast', emoji: '🤩', description: 'You love it all — great vibes and great coffee everywhere.', test: (d) => d.avgComposite >= 16 },
  { id: 'casual', name: 'The Casual', emoji: '😎', description: 'You take it easy — no rush, just enjoying the ride.', test: () => true }, // fallback
];

// Month indices in season order (Jul through Jun)
const SEASON_MONTH_INDICES = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Map a date to its season label. Seasons roll over July 1.
 * e.g. Sep 2025 → "2025-26", Feb 2026 → "2025-26"
 */
function getSeasonForDate(date) {
  const d = new Date(date);
  const month = d.getMonth(); // 0-indexed: 0=Jan, 6=Jul
  const year = d.getFullYear();
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

/**
 * Get the current season label.
 */
export function getCurrentSeason() {
  return getSeasonForDate(new Date());
}

/**
 * Get available seasons from visits, sorted most recent first.
 */
export function getAvailableSeasons(visits) {
  const seasons = new Set(visits.map(v => getSeasonForDate(v.date)));
  return [...seasons].sort((a, b) => b.localeCompare(a));
}

/**
 * Compute season-in-review data for a specific season (e.g. "2025-26").
 */
export function computeSeasonReview(visits, season) {
  const seasonVisits = visits.filter(v => getSeasonForDate(v.date) === season);
  if (!seasonVisits.length) return null;

  const sorted = [...seasonVisits].sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalVisits = seasonVisits.length;
  const uniqueShops = new Set(seasonVisits.map(v => v.coffee_shop_name)).size;
  const uniqueCities = new Set(seasonVisits.map(v => v.city).filter(Boolean)).size;
  const uniqueOrders = new Set(seasonVisits.map(v => titleCaseOrder(v.coffee_order)).filter(Boolean)).size;

  const avgVibe = +(seasonVisits.reduce((s, v) => s + v.vibe_rating, 0) / totalVisits).toFixed(1);
  const avgCoffee = +(seasonVisits.reduce((s, v) => s + v.coffee_rating, 0) / totalVisits).toFixed(1);
  const avgComposite = +(seasonVisits.reduce((s, v) => s + v.composite_score, 0) / totalVisits).toFixed(1);

  const bestVisit = seasonVisits.reduce((a, b) => a.composite_score >= b.composite_score ? a : b);
  const worstVisit = seasonVisits.reduce((a, b) => a.composite_score <= b.composite_score ? a : b);

  // Most visited shop
  const shopCounts = {};
  seasonVisits.forEach(v => { shopCounts[v.coffee_shop_name] = (shopCounts[v.coffee_shop_name] || 0) + 1; });
  const [topShopName, topShopCount] = Object.entries(shopCounts).sort(([, a], [, b]) => b - a)[0];
  const mostVisitedShop = { name: topShopName, count: topShopCount };

  // Top order
  const orderCounts = {};
  seasonVisits.forEach(v => {
    const order = titleCaseOrder(v.coffee_order);
    if (order) orderCounts[order] = (orderCounts[order] || 0) + 1;
  });
  const topOrderEntry = Object.entries(orderCounts).sort(([, a], [, b]) => b - a)[0];
  const topOrder = topOrderEntry ? { order: topOrderEntry[0], count: topOrderEntry[1] } : null;

  // Monthly breakdown (season order: Jul → Jun)
  const months = {};
  for (const m of SEASON_MONTH_INDICES) months[m] = { count: 0, totalComposite: 0 };
  seasonVisits.forEach(v => {
    const m = new Date(v.date).getMonth();
    months[m].count++;
    months[m].totalComposite += v.composite_score;
  });
  const monthlyBreakdown = SEASON_MONTH_INDICES.map(m => ({
    month: MONTH_NAMES[m],
    count: months[m].count,
    avgComposite: months[m].count ? +(months[m].totalComposite / months[m].count).toFixed(1) : 0,
  }));

  // Busiest month
  const busiestMonth = monthlyBreakdown.reduce((a, b) => a.count >= b.count ? a : b);

  // Persona
  const reviewData = { totalVisits, uniqueShops, uniqueCities, avgVibe, avgCoffee, avgComposite, mostVisitedShop };
  const persona = PERSONAS.find(p => p.test(reviewData));

  // Longest streak this season
  const vibeStreak = detectStreak(sorted, v => v.vibe_rating, 8);
  const longestStreak = Math.max(vibeStreak.current.length, vibeStreak.longest.length);

  // Badges earned with this season's data
  const seasonBadges = computeBadges(seasonVisits).filter(b => b.level > 0);

  // Total photos
  const totalPhotos = seasonVisits.filter(v => v.photo_url).length;

  // First and last visit
  const firstVisit = sorted[0];
  const lastVisit = sorted[sorted.length - 1];

  return {
    season,
    dateRange: `July 1, ${season.split('-')[0]} to July 1, ${Number(season.split('-')[0]) + 1}`,
    totalVisits,
    uniqueShops,
    uniqueCities,
    uniqueOrders,
    avgVibe,
    avgCoffee,
    avgComposite,
    bestVisit,
    worstVisit,
    mostVisitedShop,
    topOrder,
    monthlyBreakdown,
    busiestMonth,
    persona,
    longestStreak,
    seasonBadges,
    totalPhotos,
    firstVisit,
    lastVisit,
  };
}
