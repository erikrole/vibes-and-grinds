// Computes all data needed for the Year-in-Review / Wrapped experience.

import { computeBadges } from './badges';
import { detectStreak } from './insights';

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

/**
 * Compute year-in-review data for a specific year.
 */
export function computeYearReview(visits, year) {
  const yearVisits = visits.filter(v => new Date(v.date).getFullYear() === year);
  if (!yearVisits.length) return null;

  const sorted = [...yearVisits].sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalVisits = yearVisits.length;
  const uniqueShops = new Set(yearVisits.map(v => v.coffee_shop_name)).size;
  const uniqueCities = new Set(yearVisits.map(v => v.city).filter(Boolean)).size;
  const uniqueOrders = new Set(yearVisits.map(v => v.coffee_order).filter(Boolean)).size;

  const avgVibe = +(yearVisits.reduce((s, v) => s + v.vibe_rating, 0) / totalVisits).toFixed(1);
  const avgCoffee = +(yearVisits.reduce((s, v) => s + v.coffee_rating, 0) / totalVisits).toFixed(1);
  const avgComposite = +(yearVisits.reduce((s, v) => s + v.composite_score, 0) / totalVisits).toFixed(1);

  const bestVisit = yearVisits.reduce((a, b) => a.composite_score >= b.composite_score ? a : b);
  const worstVisit = yearVisits.reduce((a, b) => a.composite_score <= b.composite_score ? a : b);

  // Most visited shop
  const shopCounts = {};
  yearVisits.forEach(v => { shopCounts[v.coffee_shop_name] = (shopCounts[v.coffee_shop_name] || 0) + 1; });
  const [topShopName, topShopCount] = Object.entries(shopCounts).sort(([, a], [, b]) => b - a)[0];
  const mostVisitedShop = { name: topShopName, count: topShopCount };

  // Top order
  const orderCounts = {};
  yearVisits.forEach(v => { if (v.coffee_order) orderCounts[v.coffee_order] = (orderCounts[v.coffee_order] || 0) + 1; });
  const topOrderEntry = Object.entries(orderCounts).sort(([, a], [, b]) => b - a)[0];
  const topOrder = topOrderEntry ? { order: topOrderEntry[0], count: topOrderEntry[1] } : null;

  // Monthly breakdown
  const months = {};
  for (let m = 0; m < 12; m++) months[m] = { count: 0, totalComposite: 0 };
  yearVisits.forEach(v => {
    const m = new Date(v.date).getMonth();
    months[m].count++;
    months[m].totalComposite += v.composite_score;
  });
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyBreakdown = Object.entries(months)
    .map(([m, d]) => ({
      month: monthNames[m],
      count: d.count,
      avgComposite: d.count ? +(d.totalComposite / d.count).toFixed(1) : 0,
    }));

  // Busiest month
  const busiestMonth = monthlyBreakdown.reduce((a, b) => a.count >= b.count ? a : b);

  // Persona
  const reviewData = { totalVisits, uniqueShops, uniqueCities, avgVibe, avgCoffee, avgComposite, mostVisitedShop };
  const persona = PERSONAS.find(p => p.test(reviewData));

  // Longest streak this year
  const vibeStreak = detectStreak(sorted, v => v.vibe_rating, 8);
  const longestStreak = Math.max(vibeStreak.current.length, vibeStreak.longest.length);

  // Badges earned with this year's data
  const yearBadges = computeBadges(yearVisits).filter(b => b.level > 0);

  // Total photos
  const totalPhotos = yearVisits.filter(v => v.photo_url).length;

  // First and last visit
  const firstVisit = sorted[0];
  const lastVisit = sorted[sorted.length - 1];

  return {
    year,
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
    yearBadges,
    totalPhotos,
    firstVisit,
    lastVisit,
  };
}

/**
 * Get available years from visits.
 */
export function getAvailableYears(visits) {
  const years = new Set(visits.map(v => new Date(v.date).getFullYear()));
  return [...years].sort((a, b) => b - a);
}
