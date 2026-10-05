import { getShopRepeatKey } from './repeats.js';
import { titleCaseOrder } from './display.js';
export function buildComparisons(visits, groupBy = 'shop', minVisits = 1, rankBy = 'coffee_rating') {
  const groups = new Map();
  for (const visit of visits) {
    const label = groupBy === 'city' ? visit.city : groupBy === 'order' ? titleCaseOrder(visit.coffee_order) : visit.coffee_shop_name;
    if (!label) continue;
    const key = groupBy === 'shop' ? getShopRepeatKey(visit) : label.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, { key, label, visits: [] });
    groups.get(key).visits.push(visit);
  }
  return [...groups.values()].filter((group) => group.visits.length >= minVisits).map((group) => ({ ...group,
    vibe: average(group.visits, 'vibe_rating'), coffee: average(group.visits, 'coffee_rating'), total: average(group.visits, 'composite_score'),
    best: group.visits.reduce((best, visit) => Number(visit[rankBy]) > Number(best[rankBy]) ? visit : best),
  })).sort((a, b) => (rankBy === 'vibe_rating' ? b.vibe - a.vibe : rankBy === 'composite_score' ? b.total - a.total : b.coffee - a.coffee) || b.visits.length - a.visits.length || a.label.localeCompare(b.label));
}
const average = (items, field) => items.reduce((sum, item) => sum + Number(item[field]), 0) / items.length;

