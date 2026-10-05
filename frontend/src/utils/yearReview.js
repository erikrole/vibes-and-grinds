import { getShopRepeatKey } from './repeats.js';
import { titleCaseOrder } from './display.js';
import { isHomeVisit } from './visitTypes.js';
import { parseLocalDate } from './dates.js';

export const getSeasonVisits = (visits = []) => visits.filter((visit) => !isHomeVisit(visit));
export function getSeasonForDate(date) {
  const parsed = date instanceof Date ? date : parseLocalDate(date);
  const year = parsed.getFullYear() - (parsed.getMonth() < 6 ? 1 : 0);
  return `${year}-${String(year + 1).slice(-2)}`;
}
export const getCurrentSeason = () => getSeasonForDate(new Date());
export const getAvailableSeasons = (visits) => [...new Set(getSeasonVisits(visits).map((visit) => getSeasonForDate(visit.date)))].sort((a, b) => b.localeCompare(a));

export function computeSeasonReview(visits, season, now = new Date()) {
  const selected = getSeasonVisits(visits).filter((visit) => getSeasonForDate(visit.date) === season).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  if (!selected.length) return null;
  const shops = new Map();
  const firstEver = new Map();
  [...visits].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id).forEach((visit) => {
    const key = getShopRepeatKey(visit);
    if (!firstEver.has(key)) firstEver.set(key, visit.id);
  });
  selected.forEach((visit) => {
    const key = getShopRepeatKey(visit);
    if (!shops.has(key)) shops.set(key, []);
    shops.get(key).push(visit);
  });
  const mostVisited = [...shops.values()].sort((a, b) => b.length - a.length)[0];
  const bestVisit = selected.reduce((best, visit) => Number(visit.composite_score) > Number(best.composite_score) ? visit : best);
  const avg = (field) => Number((selected.reduce((sum, visit) => sum + Number(visit[field]), 0) / selected.length).toFixed(1));
  const startYear = Number(season.split('-')[0]);
  const complete = now >= new Date(startYear + 1, 6, 1);
  const names = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const monthlyBreakdown = names.map((month, index) => {
    const monthIndex = (index + 6) % 12;
    return { month, count: selected.filter((visit) => parseLocalDate(visit.date).getMonth() === monthIndex).length };
  });
  return {
    season, complete, dateRange: `July 1, ${startYear} – June 30, ${startYear + 1}`,
    totalVisits: selected.length, uniqueShops: shops.size, uniqueCities: new Set(selected.map((visit) => visit.city).filter(Boolean)).size,
    newShops: [...shops.values()].filter((history) => selected.some((visit) => visit.id === firstEver.get(getShopRepeatKey(history[0])))).length,
    avgVibe: avg('vibe_rating'), avgCoffee: avg('coffee_rating'), avgComposite: avg('composite_score'), bestVisit,
    mostVisitedShop: mostVisited.length > 1 ? { name: mostVisited[0].coffee_shop_name, count: mostVisited.length, visit: mostVisited[mostVisited.length - 1] } : null,
    monthlyBreakdown, totalPhotos: selected.filter((visit) => visit.photo_url).length,
    firstVisit: selected[0], lastVisit: selected[selected.length - 1],
    orders: [...new Set(selected.map((visit) => titleCaseOrder(visit.coffee_order)).filter(Boolean))],
  };
}
