// More playful, factual tallies. Pure: visits in, plain data out. Nothing is stored or generated.
import { getVisitCoordinates } from './coords.js';
import { milesBetween } from './funStats.js';
import { computeBadges, detectNewBadges } from './badges.js';

const num = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const byDate = (a, b) => String(a.date).localeCompare(String(b.date)) || (Number(a.id) || 0) - (Number(b.id) || 0);
const shopKey = (v) => v.shop_id || String(v.coffee_shop_name || '').trim().toLowerCase();
const score = (v) => num(v.composite_score) ?? ((num(v.vibe_rating) ?? 0) + (num(v.coffee_rating) ?? 0));

const STATE_CODES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
export { STATE_CODES };

/** Visited states in a 50-state list, with how many stops each. DC and unknown codes are ignored. */
export function statePassport(visits = []) {
  const counts = new Map();
  for (const v of visits) {
    const code = String(v.city || '').split(',')[1]?.trim().split(/\s/)[0]?.toUpperCase();
    if (STATE_CODES.includes(code)) counts.set(code, (counts.get(code) || 0) + 1);
  }
  return STATE_CODES.map((code) => ({ code, count: counts.get(code) || 0 }));
}

/** Superlatives, each with the visit behind it. Entries that can't be computed are left out. */
export function awards(visits = []) {
  const list = visits.filter((v) => v && v.date);
  const out = [];
  const best = (field) => list.filter((v) => num(v[field]) !== null).reduce((top, v) => (!top || num(v[field]) > num(top[field]) ? v : top), null);
  const cup = best('coffee_rating');
  if (cup) out.push({ id: 'cup', title: 'Best cup', headline: cup.coffee_shop_name, detail: `${num(cup.coffee_rating)} / 10${cup.coffee_order ? ` · ${cup.coffee_order}` : ''}`, visit: cup });
  const vibe = best('vibe_rating');
  if (vibe) out.push({ id: 'vibe', title: 'Best vibe', headline: vibe.coffee_shop_name, detail: `${num(vibe.vibe_rating)} / 10${vibe.city ? ` · ${vibe.city}` : ''}`, visit: vibe });

  const perShop = new Map();
  for (const v of list) {
    const key = shopKey(v);
    if (!key) continue;
    if (!perShop.has(key)) perShop.set(key, []);
    perShop.get(key).push(v);
  }
  const loyal = [...perShop.values()].sort((a, b) => b.length - a.length)[0];
  if (loyal && loyal.length > 1) out.push({ id: 'loyal', title: 'Most visited', headline: loyal[0].coffee_shop_name, detail: `${loyal.length} stops`, visit: loyal[0] });

  let far = null;
  const origin = { lat: 43.0731, lng: -89.4012 };
  for (const v of list) {
    const at = getVisitCoordinates(v);
    if (!at) continue;
    const miles = milesBetween(origin, at);
    if (!far || miles > far.miles) far = { miles, visit: v };
  }
  if (far) out.push({ id: 'far', title: 'Furthest from Madison', headline: far.visit.coffee_shop_name, detail: `about ${Math.round(far.miles).toLocaleString()} miles${far.visit.city ? ` · ${far.visit.city}` : ''}`, visit: far.visit });

  let comeback = null;
  for (const group of perShop.values()) {
    const rated = group.filter((v) => num(v.coffee_rating) !== null).sort(byDate);
    for (let i = 1; i < rated.length; i += 1) {
      const gain = num(rated[i].coffee_rating) - num(rated[i - 1].coffee_rating);
      if (gain > 0 && (!comeback || gain > comeback.gain)) comeback = { gain, from: rated[i - 1], to: rated[i] };
    }
  }
  if (comeback) out.push({ id: 'comeback', title: 'Biggest comeback', headline: comeback.to.coffee_shop_name, detail: `${num(comeback.from.coffee_rating)} → ${num(comeback.to.coffee_rating)} on the next visit`, visit: comeback.to });
  return out;
}

/** Counts-only one-liner. Returns '' when there isn't enough to say anything true. */
export function personality(visits = []) {
  const list = visits.filter((v) => v && v.date);
  if (list.length < 3) return '';
  const tally = (pick) => {
    const m = new Map();
    for (const v of list) { const k = pick(v); if (k) m.set(k, (m.get(k) || 0) + 1); }
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  };
  const order = tally((v) => String(v.coffee_order || '').trim().toLowerCase());
  const day = tally((v) => {
    const [yy, mm, dd] = String(v.date).split('-').map(Number);
    return Number.isFinite(yy) ? ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][new Date(yy, mm - 1, dd).getDay()] : '';
  });
  const coffee = list.map((v) => num(v.coffee_rating)).filter((n) => n !== null);
  const avg = coffee.length ? (coffee.reduce((a, b) => a + b, 0) / coffee.length).toFixed(1) : null;
  const parts = [];
  if (order && order[1] > 1) parts.push(`${order[0].replace(/\b\w/g, (c) => c.toUpperCase())} regular`);
  if (avg) parts.push(`${avg} average cup`);
  if (day && day[1] > 1) parts.push(`mostly ${day[0]}`);
  return parts.join(' · ');
}

/** Average coffee and vibe per sport, plus the longest run of consecutive game-day stops. */
export function gameDayStats(visits = []) {
  const list = visits.filter((v) => v && v.date).sort(byDate);
  const groups = new Map();
  for (const v of list) {
    const sport = String(v.sport || '').trim();
    if (!sport) continue;
    const g = groups.get(sport) || { label: sport, total: 0, count: 0 };
    const c = num(v.coffee_rating);
    if (c !== null) { g.total += c; g.count += 1; }
    groups.set(sport, g);
  }
  const bySport = [...groups.values()].filter((g) => g.count).map((g) => ({ label: g.label, value: +(g.total / g.count).toFixed(1), count: g.count })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  let best = 0; let run = 0;
  for (const v of list) {
    run = String(v.sport || '').trim() ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const gameDays = list.filter((v) => String(v.sport || '').trim()).length;
  return { bySport, streak: best, gameDays, otherDays: list.length - gameDays };
}

/** Located stops in date order with a running straight-line mile total, for the trip replay. */
export function tripLegs(visits = []) {
  const stops = visits.map((v) => ({ v, at: getVisitCoordinates(v) })).filter((s) => s.at).sort((a, b) => byDate(a.v, b.v));
  let miles = 0;
  return stops.map((s, i) => {
    if (i) miles += milesBetween(stops[i - 1].at, s.at);
    return { id: s.v.id, name: s.v.coffee_shop_name, city: s.v.city || '', date: s.v.date, lat: s.at.lat, lng: s.at.lng, miles: Math.round(miles) };
  });
}

export const MILESTONES = [25, 50, 75, 100, 150, 200];

/** What to celebrate after saving `added`, given the journal as it stood before. */
export function saveCelebration(before = [], added = {}) {
  const after = [...before, added];
  const stop = after.length;
  const total = score(added);
  const newBadges = detectNewBadges(computeBadges(before), computeBadges(after));
  const badgeDefs = computeBadges(after);
  const next = badgeDefs.filter((b) => b.nextThreshold !== null).sort((a, b) => b.progress - a.progress || a.name.localeCompare(b.name))[0];
  return {
    stop,
    score: total,
    confetti: total >= 18,
    milestone: MILESTONES.includes(stop) ? stop : null,
    newBadges: newBadges.map((b) => ({ id: b.id, name: b.name, icon: b.icon, tier: b.tier })),
    next: next ? { name: next.name, icon: next.icon, remaining: next.nextThreshold - next.currentValue, progress: next.progress } : null,
  };
}
