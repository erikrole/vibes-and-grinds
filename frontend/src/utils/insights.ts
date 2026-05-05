// Pure computation functions for the Insights panel.
// All functions take a sorted-by-date visits array and return derived data.

import type { Visit } from '../types';

/**
 * Detect streaks where a rating field stays above a threshold.
 * Returns { current, longest } each with { count, visits }.
 */
export function detectStreak(visits: Visit[], ratingFn: (v: Visit) => number, threshold: number): any {
  let current: Visit[] = [];
  let longest: Visit[] = [];
  let run: Visit[] = [];

  for (const v of visits) {
    if (ratingFn(v) >= threshold) {
      run.push(v);
    } else {
      if (run.length > longest.length) longest = run;
      run = [];
    }
  }
  if (run.length > longest.length) longest = run;
  // Current streak = run that reaches the end of the array
  current = run;

  return { current, longest };
}

/**
 * Personal bests — highest and lowest for each rating dimension.
 */
export function personalBests(visits: Visit[]): any {
  if (!visits.length) return null;

  let bestVibe = visits[0], bestCoffee = visits[0], bestComposite = visits[0];
  let worstComposite = visits[0];

  for (const v of visits) {
    if (v.vibe_rating > bestVibe.vibe_rating) bestVibe = v;
    if (v.coffee_rating > bestCoffee.coffee_rating) bestCoffee = v;
    if (v.composite_score > bestComposite.composite_score) bestComposite = v;
    if (v.composite_score < worstComposite.composite_score) worstComposite = v;
  }

  return { bestVibe, bestCoffee, bestComposite, worstComposite };
}

/**
 * Milestone badges the user has earned.
 */
export function milestones(visits: Visit[]): any {
  const badges: Array<{ icon: string; text: string }> = [];
  const count = visits.length;

  if (count >= 10) badges.push({ icon: '🔟', text: '10 visits logged' });
  if (count >= 25) badges.push({ icon: '🏅', text: '25 visits logged' });
  if (count >= 50) badges.push({ icon: '🏆', text: '50 visits logged' });
  if (count >= 100) badges.push({ icon: '💯', text: '100 visits logged' });

  if (visits.some(v => v.vibe_rating === 10)) badges.push({ icon: '✨', text: 'Perfect 10 vibe' });
  if (visits.some(v => v.coffee_rating === 10)) badges.push({ icon: '☕', text: 'Perfect 10 coffee' });
  if (visits.some(v => v.composite_score === 20)) badges.push({ icon: '👑', text: 'Perfect 20/20' });

  const cities = new Set(visits.map(v => v.city).filter(Boolean));
  if (cities.size >= 5) badges.push({ icon: '🗺️', text: `${cities.size} cities visited` });
  if (cities.size >= 10) badges.push({ icon: '🌎', text: '10+ cities explored' });

  return badges;
}

/**
 * Leaderboard: group visits by a key, compute avg composite, return sorted.
 * minVisits filters out entries with too few data points.
 */
export function leaderboard(visits: Visit[], keyFn: (v: Visit) => string | null | undefined, minVisits = 2): any {
  const groups: Record<string, { key: string; visits: Visit[]; totalVibe: number; totalCoffee: number; totalComposite: number }> = {};

  for (const v of visits) {
    const key = keyFn(v);
    if (!key) continue;
    if (!groups[key]) groups[key] = { key, visits: [], totalVibe: 0, totalCoffee: 0, totalComposite: 0 };
    groups[key].visits.push(v);
    groups[key].totalVibe += v.vibe_rating;
    groups[key].totalCoffee += v.coffee_rating;
    groups[key].totalComposite += v.composite_score;
  }

  return Object.values(groups)
    .filter(g => g.visits.length >= minVisits)
    .map(g => ({
      key: g.key,
      count: g.visits.length,
      avgVibe: +(g.totalVibe / g.visits.length).toFixed(1),
      avgCoffee: +(g.totalCoffee / g.visits.length).toFixed(1),
      avgComposite: +(g.totalComposite / g.visits.length).toFixed(1),
    }))
    .sort((a, b) => b.avgComposite - a.avgComposite);
}

/**
 * Sport-day analysis: compare avg ratings on game days vs non-game days.
 */
export function sportDayAnalysis(visits: Visit[]): any {
  const gameDays = visits.filter(v => v.sport);
  const nonGameDays = visits.filter(v => !v.sport);

  if (!gameDays.length || !nonGameDays.length) return null;

  const avg = (arr: Visit[], fn: (v: Visit) => number) => arr.length ? +(arr.reduce((s, v) => s + fn(v), 0) / arr.length).toFixed(1) : 0;

  return {
    gameDay: {
      count: gameDays.length,
      avgVibe: avg(gameDays, v => v.vibe_rating),
      avgCoffee: avg(gameDays, v => v.coffee_rating),
      avgComposite: avg(gameDays, v => v.composite_score),
    },
    nonGameDay: {
      count: nonGameDays.length,
      avgVibe: avg(nonGameDays, v => v.vibe_rating),
      avgCoffee: avg(nonGameDays, v => v.coffee_rating),
      avgComposite: avg(nonGameDays, v => v.composite_score),
    },
    vibeDelta: +(avg(gameDays, v => v.vibe_rating) - avg(nonGameDays, v => v.vibe_rating)).toFixed(1),
  };
}

/**
 * Rolling average for trend charts. windowSize = number of visits to average over.
 */
export function rollingAverage(visits: Visit[], windowSize = 5): any {
  const sorted = [...visits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const points: any[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const windowStart = Math.max(0, i - windowSize + 1);
    const window = sorted.slice(windowStart, i + 1);
    const avgVibe = +(window.reduce((s, v) => s + v.vibe_rating, 0) / window.length).toFixed(1);
    const avgCoffee = +(window.reduce((s, v) => s + v.coffee_rating, 0) / window.length).toFixed(1);

    points.push({
      date: sorted[i].date,
      label: formatShortDate(sorted[i].date),
      vibe: avgVibe,
      coffee: avgCoffee,
      index: i + 1,
    });
  }

  return points;
}

/**
 * Monthly visit frequency for bar chart.
 */
export function monthlyFrequency(visits: Visit[]): any {
  const months: Record<string, number> = {};

  for (const v of visits) {
    const d = new Date(v.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = (months[key] || 0) + 1;
  }

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => {
      const [y, m] = month.split('-');
      const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return { month, label, count };
    });
}

/**
 * Rating distribution: count visits in each 0.5-wide bucket for a rating field.
 */
export function ratingDistribution(visits: Visit[], ratingFn: (v: Visit) => number): any {
  const buckets: Array<{ range: string; low: number; high: number; count: number }> = [];
  for (let low = 0; low < 10; low += 0.5) {
    buckets.push({ range: `${low.toFixed(1)}`, low, high: low + 0.5, count: 0 });
  }

  for (const v of visits) {
    const val = ratingFn(v);
    const idx = Math.min(Math.floor(val / 0.5), buckets.length - 1);
    buckets[idx].count++;
  }

  return buckets;
}

/**
 * Per-city stats cards.
 */
export function cityStats(visits: Visit[]): any {
  const cities: Record<string, { city: string; visits: Visit[]; totalVibe: number; totalCoffee: number; totalComposite: number; shops: Set<string>; orders: Record<string, number> }> = {};

  for (const v of visits) {
    const city = v.city;
    if (!city) continue;
    if (!cities[city]) cities[city] = { city, visits: [], totalVibe: 0, totalCoffee: 0, totalComposite: 0, shops: new Set(), orders: {} };
    cities[city].visits.push(v);
    cities[city].totalVibe += v.vibe_rating;
    cities[city].totalCoffee += v.coffee_rating;
    cities[city].totalComposite += v.composite_score;
    if (v.coffee_shop_name) cities[city].shops.add(v.coffee_shop_name);
    if (v.coffee_order) cities[city].orders[v.coffee_order] = (cities[city].orders[v.coffee_order] || 0) + 1;
  }

  return Object.values(cities)
    .map(c => {
      const topOrder = Object.entries(c.orders).sort(([, a], [, b]) => b - a)[0];
      const best = c.visits.reduce((a, b) => a.composite_score > b.composite_score ? a : b);
      return {
        city: c.city,
        count: c.visits.length,
        shops: c.shops.size,
        avgVibe: +(c.totalVibe / c.visits.length).toFixed(1),
        avgCoffee: +(c.totalCoffee / c.visits.length).toFixed(1),
        avgComposite: +(c.totalComposite / c.visits.length).toFixed(1),
        topOrder: topOrder ? topOrder[0] : null,
        bestVisit: best,
      };
    })
    .sort((a, b) => b.avgComposite - a.avgComposite);
}

/**
 * Day-of-week rating patterns.
 */
export function dayOfWeekPatterns(visits: Visit[]): any {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets = days.map(d => ({ day: d, totalVibe: 0, totalCoffee: 0, count: 0 }));

  for (const v of visits) {
    const dow = new Date(v.date).getDay();
    buckets[dow].count++;
    buckets[dow].totalVibe += v.vibe_rating;
    buckets[dow].totalCoffee += v.coffee_rating;
  }

  return buckets
    .filter(b => b.count > 0)
    .map(b => ({
      day: b.day,
      count: b.count,
      avgVibe: +(b.totalVibe / b.count).toFixed(1),
      avgCoffee: +(b.totalCoffee / b.count).toFixed(1),
    }));
}

/**
 * "Getting pickier?" — compare first half vs second half of visits.
 */
export function trendComparison(visits: Visit[]): any {
  if (visits.length < 4) return null;

  const sorted = [...visits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const mid = Math.floor(sorted.length / 2);
  const first = sorted.slice(0, mid);
  const second = sorted.slice(mid);

  const avg = (arr: Visit[], fn: (v: Visit) => number) => +(arr.reduce((s, v) => s + fn(v), 0) / arr.length).toFixed(1);

  return {
    firstHalf: {
      count: first.length,
      avgVibe: avg(first, v => v.vibe_rating),
      avgCoffee: avg(first, v => v.coffee_rating),
      avgComposite: avg(first, v => v.composite_score),
    },
    secondHalf: {
      count: second.length,
      avgVibe: avg(second, v => v.vibe_rating),
      avgCoffee: avg(second, v => v.coffee_rating),
      avgComposite: avg(second, v => v.composite_score),
    },
  };
}

/**
 * Coffee order profile — top orders, signature drink, diversity metrics.
 */
export function orderProfile(visits: Visit[]): any {
  const withOrders = visits.filter(v => v.coffee_order?.trim());
  if (!withOrders.length) return null;

  const groups: Record<string, { order: string; count: number; totalVibe: number; totalCoffee: number; totalComposite: number }> = {};
  const seenOrders = new Set<string>();
  let newOrderCount = 0;

  const sorted = [...withOrders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const v of sorted) {
    const order = (v.coffee_order as string).trim();
    if (!groups[order]) groups[order] = { order, count: 0, totalVibe: 0, totalCoffee: 0, totalComposite: 0 };
    groups[order].count++;
    groups[order].totalVibe += v.vibe_rating;
    groups[order].totalCoffee += v.coffee_rating;
    groups[order].totalComposite += v.composite_score;

    if (!seenOrders.has(order)) {
      newOrderCount++;
      seenOrders.add(order);
    }
  }

  const orderList = Object.values(groups)
    .map(g => ({
      order: g.order,
      count: g.count,
      avgVibe: +(g.totalVibe / g.count).toFixed(1),
      avgCoffee: +(g.totalCoffee / g.count).toFixed(1),
      avgComposite: +(g.totalComposite / g.count).toFixed(1),
    }))
    .sort((a, b) => b.count - a.count);

  const topOrders = orderList.slice(0, 8);
  const mostOrdered = orderList[0] || null;
  const bestRated = [...orderList].filter(o => o.count >= 2).sort((a, b) => b.avgComposite - a.avgComposite)[0] || mostOrdered;
  const signatureDrink = mostOrdered && mostOrdered.count >= 5 ? mostOrdered : null;
  const uniqueOrders = seenOrders.size;
  const diversityScore = +(uniqueOrders / withOrders.length * 100).toFixed(0);
  const adventurousness = +(newOrderCount / withOrders.length * 100).toFixed(0);

  return { topOrders, signatureDrink, mostOrdered, bestRated, uniqueOrders, diversityScore, adventurousness };
}

/**
 * Repeat visit insights — shops visited 2+ times with trend and consistency.
 */
export function repeatShopInsights(visits: Visit[]): any {
  const shopMap: Record<string, Visit[]> = {};
  for (const v of visits) {
    const name = v.coffee_shop_name;
    if (!shopMap[name]) shopMap[name] = [];
    shopMap[name].push(v);
  }

  const repeatShops = Object.entries(shopMap)
    .filter(([, vs]) => vs.length >= 2)
    .map(([name, vs]) => {
      const sorted = [...vs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const composites = sorted.map(v => v.composite_score);
      const avgComposite = +(composites.reduce((s, c) => s + c, 0) / composites.length).toFixed(1);
      const avgVibe = +(sorted.reduce((s, v) => s + v.vibe_rating, 0) / sorted.length).toFixed(1);
      const avgCoffee = +(sorted.reduce((s, v) => s + v.coffee_rating, 0) / sorted.length).toFixed(1);

      // Linear regression slope for trend
      const n = composites.length;
      const xMean = (n - 1) / 2;
      const yMean = composites.reduce((s, c) => s + c, 0) / n;
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += (i - xMean) * (composites[i] - yMean);
        den += (i - xMean) ** 2;
      }
      const slope = den ? num / den : 0;
      const trend = slope > 0.3 ? 'improving' : slope < -0.3 ? 'declining' : 'stable';

      // Consistency: 1 - normalized stddev (lower variance = higher score)
      const variance = composites.reduce((s, c) => s + (c - yMean) ** 2, 0) / n;
      const stddev = Math.sqrt(variance);
      const consistency = Math.max(0, +(1 - stddev / 10).toFixed(2)); // max possible stddev ~10

      const ratings = sorted.map(v => ({
        date: v.date,
        composite: v.composite_score,
      }));

      return { name, visitCount: n, avgVibe, avgCoffee, avgComposite, trend, slope: +slope.toFixed(2), consistency, ratings };
    })
    .sort((a, b) => b.visitCount - a.visitCount);

  const repeatVisitCount = repeatShops.reduce((s, sh) => s + sh.visitCount, 0);
  const loyaltyRate = visits.length ? +(repeatVisitCount / visits.length * 100).toFixed(0) : 0;

  const improvingShops = repeatShops.filter(s => s.trend === 'improving').sort((a, b) => b.slope - a.slope);
  const decliningShops = repeatShops.filter(s => s.trend === 'declining').sort((a, b) => a.slope - b.slope);

  return {
    shops: repeatShops,
    loyaltyRate,
    mostImproved: improvingShops[0] || null,
    mostDeclining: decliningShops[0] || null,
  };
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
