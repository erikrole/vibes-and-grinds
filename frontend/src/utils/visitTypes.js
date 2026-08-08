export const VISIT_TYPES = {
  ROAD: 'road',
  HOME: 'home',
};

// Default city for a home stop. Editable in the form — "around Madison" includes
// Middleton, Fitchburg, Verona and friends.
export const HOME_CITY = 'Madison, WI';

export const VISIT_TYPE_LABELS = {
  [VISIT_TYPES.ROAD]: 'Road trip',
  [VISIT_TYPES.HOME]: 'Around Madison',
};

// Visits logged before visit_type existed are road-trip stops.
export function getVisitType(visit = {}) {
  return visit.visit_type === VISIT_TYPES.HOME ? VISIT_TYPES.HOME : VISIT_TYPES.ROAD;
}

export function isHomeVisit(visit) {
  return getVisitType(visit) === VISIT_TYPES.HOME;
}

// Madison plus the suburbs that are a normal drive from it.
const MADISON_AREA_CITIES = new Set([
  'madison',
  'middleton',
  'fitchburg',
  'verona',
  'sun prairie',
  'waunakee',
  'monona',
  'mcfarland',
  'cottage grove',
  'deforest',
  'de forest',
  'windsor',
  'oregon',
  'stoughton',
  'cross plains',
  'mount horeb',
  'maple bluff',
  'shorewood hills',
  'marshall',
  'black earth',
]);

const MADISON_CENTER = { lat: 43.0731, lng: -89.4012 };
const MADISON_RADIUS_MILES = 25;

function milesFromMadison(lat, lng) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat - MADISON_CENTER.lat);
  const dLng = toRad(lng - MADISON_CENTER.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(MADISON_CENTER.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(a));
}

// "Madison, WI 53703" / "Sun Prairie, WI" → "madison" / "sun prairie"
function normalizeCityName(value = '') {
  return String(value)
    .toLowerCase()
    .split(',')[0]
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Requires Wisconsin so a Madison Avenue in Manhattan doesn't count.
function addressLooksMadisonArea(address = '') {
  const text = String(address).toLowerCase();
  if (!/\b(wi|wisconsin)\b/.test(text)) return false;
  return [...MADISON_AREA_CITIES].some((city) => text.includes(city));
}

// Coordinates win when Places gives them; city/address text is the fallback.
export function isMadisonArea({ city, address, lat, lng } = {}) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude || longitude)) {
    return milesFromMadison(latitude, longitude) <= MADISON_RADIUS_MILES;
  }

  // "Madison, NJ" names a real city on the list, so an explicit state must agree.
  const state = String(city || '').split(',')[1]?.trim().toLowerCase();
  const stateMatches = !state || /^(wi|wisconsin)\b/.test(state);
  if (stateMatches && MADISON_AREA_CITIES.has(normalizeCityName(city))) return true;

  return addressLooksMadisonArea(address);
}
