import { getShopRepeatKey } from './repeats.js';
import { titleCaseOrder } from './display.js';
import { parseLocalDate } from './dates.js';
import { getVisitType, VISIT_TYPES } from './visitTypes.js';

const num = (value) => (value === '' || value == null ? NaN : Number(value));
const mean = (items, pick) => items.reduce((sum, item) => sum + pick(item), 0) / items.length;
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export const RATING_BINS = ['<5', '5s', '6s', '7s', '8s', '9+'];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ratingBin(rating) {
  if (rating < 5) return 0;
  return Math.min(5, Math.floor(rating) - 4);
}

export function haversineMiles(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

function groupBy(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function bestGroup(groups, labelOf, minVisits) {
  let best = null;
  for (const group of groups.values()) {
    if (group.length < minVisits) continue;
    const total = mean(group, (visit) => visit.vibe + visit.coffee);
    if (!best || total > best.total || (total === best.total && group.length > best.visits)) {
      best = { label: labelOf(group[0]), total, visits: group.length };
    }
  }
  return best;
}

/**
 * Playful roll-ups for the Insights tab. Pure and tolerant of sparse data:
 * every field is null (or zero) when the journal can't support it yet.
 */
export function computeFunStats(visits = []) {
  const rated = visits
    .map((visit) => ({ ...visit, vibe: num(visit.vibe_rating), coffee: num(visit.coffee_rating) }))
    .filter((visit) => Number.isFinite(visit.vibe) && Number.isFinite(visit.coffee) && visit.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!rated.length) return null;

  const cities = new Set();
  const states = new Set();
  for (const visit of rated) {
    const city = normalize(visit.city);
    if (!city) continue;
    cities.add(city);
    const state = String(visit.city).split(',')[1]?.trim().toUpperCase();
    if (state && /^[A-Z]{2}$/.test(state)) states.add(state);
  }

  // Longest run of back-to-back stops where the coffee scored 8 or better.
  let streak = { length: 0, from: null, to: null };
  let run = [];
  for (const visit of rated) {
    if (visit.coffee >= 8) {
      run.push(visit);
      if (run.length > streak.length) streak = { length: run.length, from: run[0].date, to: visit.date };
    } else run = [];
  }

  const orders = groupBy(rated, (visit) => normalize(visit.coffee_order));
  let topOrder = null;
  for (const group of orders.values()) {
    if (group.length >= 2 && (!topOrder || group.length > topOrder.count)) {
      topOrder = { label: titleCaseOrder(group[0].coffee_order), count: group.length };
    }
  }

  const histogram = RATING_BINS.map(() => 0);
  for (const visit of rated) histogram[ratingBin(visit.coffee)] += 1;

  const weekdays = WEEKDAYS.map(() => 0);
  for (const visit of rated) {
    const day = parseLocalDate(visit.date).getDay();
    if (Number.isInteger(day)) weekdays[day] += 1;
  }
  const busiest = Math.max(...weekdays);

  const avgVibe = mean(rated, (visit) => visit.vibe);
  const avgCoffee = mean(rated, (visit) => visit.coffee);
  const gap = avgVibe - avgCoffee;

  const roadStops = rated
    .filter((visit) => getVisitType(visit) === VISIT_TYPES.ROAD)
    .map((visit) => ({ lat: num(visit.coffee_shop_lat), lng: num(visit.coffee_shop_lng) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  let miles = 0;
  for (let i = 1; i < roadStops.length; i++) {
    const leg = haversineMiles(roadStops[i - 1], roadStops[i]);
    // A stop with bad coordinates shouldn't turn the odometer into a world tour.
    if (leg < 2500) miles += leg;
  }

  const shops = groupBy(rated, (visit) => getShopRepeatKey(visit));
  const cityGroups = groupBy(rated, (visit) => normalize(visit.city));
  const gapShop = [...shops.values()].map((group) => ({
    label: group[0].coffee_shop_name,
    gap: mean(group, (visit) => visit.vibe - visit.coffee),
  })).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];

  return {
    total: rated.length,
    shops: shops.size,
    cities: cities.size,
    states: states.size,
    miles: Math.round(miles),
    perfectTens: rated.filter((visit) => visit.vibe + visit.coffee >= 18).length,
    streak,
    topOrder,
    histogram,
    weekdays,
    busiestDay: busiest > 0 ? WEEKDAYS[weekdays.indexOf(busiest)] : null,
    palate: {
      avgVibe,
      avgCoffee,
      gap,
      leaning: gap > 0.3 ? 'room' : gap < -0.3 ? 'cup' : 'balanced',
    },
    bestCity: bestGroup(cityGroups, (visit) => visit.city, 2),
    bestShop: bestGroup(shops, (visit) => visit.coffee_shop_name, 2),
    hotTake: gapShop && Math.abs(gapShop.gap) >= 1 ? { ...gapShop, kind: gapShop.gap > 0 ? 'room' : 'cup' } : null,
    lastEight: rated.slice(-24).map((visit) => ({ id: visit.id, hot: visit.coffee >= 8, coffee: visit.coffee })),
  };
}
