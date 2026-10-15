// Playful, factual tallies for the Insights tab. Pure: visits in, numbers out.
import { getVisitCoordinates } from './coords.js';
import { parseLocalDate } from './dates.js';

const MADISON = { lat: 43.0731, lng: -89.4012 };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function milesBetween(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

const rating = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function stateOf(city = '') {
  const part = String(city).split(',')[1]?.trim().split(/\s/)[0]?.toUpperCase();
  return part && /^[A-Z]{2}$/.test(part) ? part : null;
}

export function funStats(visits = []) {
  const list = visits.filter((v) => v && v.date);
  const shops = new Set(list.map((v) => v.shop_id || String(v.coffee_shop_name || '').trim().toLowerCase()).filter(Boolean));
  const cities = new Set(list.map((v) => String(v.city || '').trim()).filter(Boolean));
  const states = new Set(list.map((v) => stateOf(v.city)).filter(Boolean));

  const located = list
    .map((v) => ({ v, at: getVisitCoordinates(v) }))
    .filter((item) => item.at)
    .sort((a, b) => a.v.date.localeCompare(b.v.date));
  let farthest = null;
  for (const { v, at } of located) {
    const miles = milesBetween(MADISON, at);
    if (!farthest || miles > farthest.miles) farthest = { miles, shop: v.coffee_shop_name, city: v.city };
  }
  // Straight-line legs between consecutive dated stops, a floor on real driving.
  let legMiles = 0;
  for (let i = 1; i < located.length; i += 1) legMiles += milesBetween(located[i - 1].at, located[i].at);

  const sportCounts = new Map();
  for (const v of list) {
    const sport = String(v.sport || '').trim();
    if (sport) sportCounts.set(sport, (sportCounts.get(sport) || 0) + 1);
  }
  const sports = [...sportCounts].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

  const weekdays = DAYS.map((label) => ({ label, total: 0, count: 0 }));
  for (const v of list) {
    const coffee = rating(v.coffee_rating);
    if (coffee === null) continue;
    const bucket = weekdays[parseLocalDate(v.date).getDay()];
    bucket.total += coffee;
    bucket.count += 1;
  }
  const weekdayCoffee = weekdays.filter((d) => d.count).map((d) => ({ label: d.label, value: +(d.total / d.count).toFixed(1), count: d.count }));

  const spread = [
    { label: '0–4', min: 0, max: 4.99 },
    { label: '5–6', min: 5, max: 6.99 },
    { label: '7–8', min: 7, max: 8.99 },
    { label: '9–10', min: 9, max: 10 },
  ].map(({ label, min, max }) => ({
    label,
    value: list.filter((v) => { const c = rating(v.coffee_rating); return c !== null && c >= min && c <= max; }).length,
  }));

  const orders = new Map();
  for (const v of list) {
    const key = String(v.coffee_order || '').trim().toLowerCase();
    if (key) orders.set(key, (orders.get(key) || 0) + 1);
  }
  const topOrder = [...orders].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

  const months = new Map();
  for (const v of list) {
    const date = parseLocalDate(v.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    months.set(key, (months.get(key) || 0) + 1);
  }
  const busiest = [...months].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0];

  return {
    stops: list.length,
    shops: shops.size,
    cities: cities.size,
    states: states.size,
    perfectTens: list.filter((v) => rating(v.coffee_rating) === 10).length,
    farthest: farthest && { ...farthest, miles: Math.round(farthest.miles) },
    legMiles: Math.round(legMiles),
    sports,
    weekdayCoffee,
    spread,
    topOrder: topOrder ? { order: topOrder[0], count: topOrder[1] } : null,
    busiestMonth: busiest ? { label: `${MONTHS[Number(busiest[0].split('-')[1])]} ${busiest[0].split('-')[0]}`, count: busiest[1] } : null,
  };
}
