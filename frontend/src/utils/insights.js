// Pure computation functions for the Insights panel.
import { getShopRepeatKey } from './repeats';
import { isHomeVisit } from './visitTypes';

function rating(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Detect streaks where a rating field stays above a threshold.
 * Visits are ordered oldest-first here, so a newest-first journal list still
 * reports the streak that runs through the latest stop.
 * Returns { current, longest } each as visit arrays.
 */
export function detectStreak(visits, ratingFn, threshold) {
  const ordered = [...visits].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  let longest = [];
  let run = [];

  for (const v of ordered) {
    if (rating(ratingFn(v)) >= threshold) {
      run.push(v);
    } else {
      if (run.length > longest.length) longest = run;
      run = [];
    }
  }
  if (run.length > longest.length) longest = run;

  return { current: run, longest };
}

/**
 * Leaderboard: group visits by a key, compute avg composite, return sorted.
 * minVisits filters out entries with too few data points.
 */
export function leaderboard(visits, keyFn, minVisits = 2) {
  const groups = {};

  for (const v of visits) {
    const key = keyFn(v);
    if (!key) continue;
    if (!groups[key]) groups[key] = { key, visits: [], totalVibe: 0, totalCoffee: 0, totalComposite: 0 };
    groups[key].visits.push(v);
    groups[key].totalVibe += rating(v.vibe_rating);
    groups[key].totalCoffee += rating(v.coffee_rating);
    groups[key].totalComposite += rating(v.composite_score);
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
 *
 * Everyday Madison stops are excluded entirely — they're never game days, so
 * counting them as "non-game days" would drown the road-trip comparison this
 * is actually asking about.
 */
export function sportDayAnalysis(visits) {
  const gameDays = [];
  const nonGameDays = [];
  for (const visit of visits) {
    if (isHomeVisit(visit)) continue;
    (visit.sport ? gameDays : nonGameDays).push(visit);
  }

  if (!gameDays.length || !nonGameDays.length) return null;

  const summarize = (arr) => {
    let vibe = 0;
    let coffee = 0;
    let composite = 0;
    for (const visit of arr) {
      vibe += rating(visit.vibe_rating);
      coffee += rating(visit.coffee_rating);
      composite += rating(visit.composite_score);
    }
    const count = arr.length;
    return {
      count,
      avgVibe: +(vibe / count).toFixed(1),
      avgCoffee: +(coffee / count).toFixed(1),
      avgComposite: +(composite / count).toFixed(1),
    };
  };

  const gameDay = summarize(gameDays);
  const nonGameDay = summarize(nonGameDays);

  return {
    gameDay,
    nonGameDay,
    vibeDelta: +(gameDay.avgVibe - nonGameDay.avgVibe).toFixed(1),
  };
}

/**
 * "Getting pickier?" — compare first half vs second half of visits.
 */
export function trendComparison(visits) {
  if (visits.length < 4) return null;

  const sorted = [...visits].sort((a, b) => new Date(a.date) - new Date(b.date));
  const mid = Math.floor(sorted.length / 2);
  const first = sorted.slice(0, mid);
  const second = sorted.slice(mid);

  const avg = (arr, fn) => +(arr.reduce((s, v) => s + rating(fn(v)), 0) / arr.length).toFixed(1);

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
 * Repeat visit insights — shops visited 2+ times with trend and consistency.
 */
export function repeatShopInsights(visits) {
  const shopMap = {};
  for (const v of visits) {
    const key = getShopRepeatKey(v);
    if (!shopMap[key]) {
      shopMap[key] = {
        name: v.coffee_shop_name,
        visits: [],
      };
    }
    shopMap[key].visits.push(v);
  }

  const repeatShops = Object.values(shopMap)
    .filter(({ visits: vs }) => vs.length >= 2)
    .map(({ name, visits: vs }) => {
      const sorted = [...vs].sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const composites = sorted.map((v) => rating(v.composite_score));
      const avgComposite = +(composites.reduce((s, c) => s + c, 0) / composites.length).toFixed(1);
      const avgVibe = +(sorted.reduce((s, v) => s + rating(v.vibe_rating), 0) / sorted.length).toFixed(1);
      const avgCoffee = +(sorted.reduce((s, v) => s + rating(v.coffee_rating), 0) / sorted.length).toFixed(1);

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

      const ratings = sorted.map((v, index) => ({
        date: v.date,
        composite: composites[index],
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
