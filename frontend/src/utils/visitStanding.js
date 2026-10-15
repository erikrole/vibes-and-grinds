// How one visit compares with the rest of the journal. Pure and factual.
const num = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const stateOf = (city = '') => String(city).split(',')[1]?.trim().split(/\s/)[0]?.toUpperCase() || '';

function standing(visits, visit, field) {
  const mine = num(visit[field]);
  const all = visits.map((v) => num(v[field])).filter((n) => n !== null);
  if (mine === null || all.length < 3) return null;
  const average = all.reduce((a, b) => a + b, 0) / all.length;
  const higher = all.filter((n) => n > mine).length;
  return { rank: higher + 1, of: all.length, delta: +(mine - average).toFixed(1), average: +average.toFixed(1) };
}

export function visitStanding(visit, visits = []) {
  if (!visit) return { coffee: null, vibe: null, total: null, chips: [] };
  const coffee = standing(visits, visit, 'coffee_rating');
  const vibe = standing(visits, visit, 'vibe_rating');
  const total = standing(visits, visit, 'composite_score');
  const chips = [];
  if (total?.rank === 1) chips.push('Best stop yet');
  else if (total && total.rank <= 3) chips.push(`Top 3 stop`);
  if (coffee?.rank === 1 && total?.rank !== 1) chips.push('Best cup yet');
  if (vibe?.rank === 1 && total?.rank !== 1) chips.push('Best vibe yet');
  const st = stateOf(visit.city);
  if (visits.length >= 3 && st && !visits.some((v) => v.id !== visit.id && stateOf(v.city) === st && String(v.date) < String(visit.date))) {
    chips.push(`First stop in ${st}`);
  }
  const cityBest = visits.filter((v) => v.city && v.city === visit.city);
  if (visits.length >= 3 && cityBest.length > 1) {
    const top = Math.max(...cityBest.map((v) => num(v.composite_score) ?? -1));
    if (num(visit.composite_score) === top) chips.push(`Best in ${visit.city.split(',')[0]}`);
  }
  return { coffee, vibe, total, chips };
}
