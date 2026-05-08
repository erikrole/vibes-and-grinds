// Pure derivations for the Vibes & Grinds visits view: filtering, sorting,
// and the small aggregations the homepage shows (top orders, repeat-shop
// counts, average ratings).

/**
 * Apply the search query and sport filter to the visits array.
 * - searchQuery is matched (case-insensitive) against shop name, city,
 *   opponent, coffee order, and notes.
 * - sportFilter is an exact-match against `visit.sport` (empty string =
 *   "all sports").
 */
export function filterVisits(visits, { searchQuery = '', sportFilter = '' } = {}) {
  return visits.filter((visit) => {
    if (sportFilter && visit.sport !== sportFilter) return false;
    if (!searchQuery) return true;

    const q = searchQuery.toLowerCase();
    return (
      visit.coffee_shop_name.toLowerCase().includes(q) ||
      visit.city?.toLowerCase().includes(q) ||
      visit.opponent?.toLowerCase().includes(q) ||
      visit.coffee_order?.toLowerCase().includes(q) ||
      visit.notes?.toLowerCase().includes(q)
    );
  });
}

/**
 * Sort by date / vibe / coffee / composite. The default (ascending=false)
 * is the natural display order: newest dates first, highest ratings first.
 *
 * The original component had this inverted (default produced oldest-first
 * dates, contradicting the down-chevron in the UI). This util fixes that
 * along with the extraction.
 */
export function sortVisits(visits, { sortBy = 'date', ascending = false } = {}) {
  const dir = ascending ? 1 : -1;
  return [...visits].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return dir * (new Date(a.date) - new Date(b.date));
      case 'vibe':
        return dir * (a.vibe_rating - b.vibe_rating);
      case 'coffee':
        return dir * (a.coffee_rating - b.coffee_rating);
      case 'composite':
        return dir * (a.composite_score - b.composite_score);
      default:
        return 0;
    }
  });
}

export function averageRatings(visits) {
  if (!visits.length) {
    return { vibe: '0.0', coffee: '0.0', composite: '0.0' };
  }
  const total = visits.reduce(
    (acc, v) => {
      acc.vibe += v.vibe_rating;
      acc.coffee += v.coffee_rating;
      acc.composite += v.composite_score;
      return acc;
    },
    { vibe: 0, coffee: 0, composite: 0 }
  );
  return {
    vibe: (total.vibe / visits.length).toFixed(1),
    coffee: (total.coffee / visits.length).toFixed(1),
    composite: (total.composite / visits.length).toFixed(1),
  };
}

export function topCoffeeOrders(visits, limit = 3) {
  const counts = {};
  for (const visit of visits) {
    const order = visit.coffee_order?.trim();
    if (order) counts[order] = (counts[order] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([order, count]) => ({ order, count }));
}

export function shopVisitCounts(visits) {
  const counts = {};
  for (const v of visits) {
    const key = v.coffee_shop_name.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}
