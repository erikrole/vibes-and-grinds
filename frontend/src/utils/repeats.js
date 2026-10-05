import { getTodayDateString } from './dates.js';
import { getVisitType } from './visitTypes.js';
import { shopKey, sameLocation } from '../../../shared/shops.mjs';

export const DEFAULT_VISITOR_NAME = 'AJ';

export function normalizeRepeatValue(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getShopRepeatKey(visit = {}) {
  return shopKey(visit);
}

export function getShopVisitCounts(visits = []) {
  return visits.reduce((counts, visit) => {
    const key = getShopRepeatKey(visit);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function getRepeatVisits(visits = [], targetVisit = {}, { excludeId = null } = {}) {
  const matchingIds = [...new Set(visits.filter((visit) => sameLocation(targetVisit, visit)).map((visit) => visit.shop_id).filter(Boolean))];
  const targetKey = getShopRepeatKey(!targetVisit.shop_id && matchingIds.length === 1 ? { ...targetVisit, shop_id: matchingIds[0] } : targetVisit);
  return visits
    .filter((visit) => {
      if (excludeId != null && String(visit.id) === String(excludeId)) return false;
      return getShopRepeatKey(visit) === targetKey;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function getRepeatContext(visits = [], draft = {}, { excludeId = null } = {}) {
  if (!draft.coffee_shop_name?.trim()) return null;

  const shopVisits = getRepeatVisits(visits, draft, { excludeId });
  const lastVisit = shopVisits[shopVisits.length - 1] || null;
  const bestVisit = shopVisits.reduce((best, visit) => {
    if (!best || Number(visit.composite_score) > Number(best.composite_score)) return visit;
    return best;
  }, null);

  return {
    visitorName: DEFAULT_VISITOR_NAME,
    visitNumber: shopVisits.length + 1,
    personalCount: shopVisits.length,
    shopCount: shopVisits.length,
    lastVisit,
    bestVisit,
  };
}

export function buildReturnVisitDraft(visit = {}) {
  return {
    date: getTodayDateString(),
    coffee_shop_name: visit.coffee_shop_name || '',
    city: visit.city || '',
    opponent: '',
    sport: '',
    shop_id: visit.shop_id || null,
    visit_type: getVisitType(visit),
    coffee_shop_address: visit.coffee_shop_address || '',
    coffee_shop_place_id: visit.coffee_shop_place_id || '',
    coffee_shop_lat: visit.coffee_shop_lat ?? '',
    coffee_shop_lng: visit.coffee_shop_lng ?? '',
    coffee_order: visit.coffee_order || '',
    vibe_rating: '',
    coffee_rating: '',
    notes: '',
    photo_url: '',
  };
}
