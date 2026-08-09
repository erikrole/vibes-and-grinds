/**
 * Visits store lat/lng as NULL when the shop was typed by hand instead of
 * picked from Places autocomplete.
 *
 * `Number(null)` is 0 — a perfectly finite number — so a bare
 * `Number.isFinite(Number(visit.coffee_shop_lat))` check reads those visits as
 * coordinates at (0, 0), which is in the Gulf of Guinea. That put phantom pins
 * on the map and dragged its center and zoom off the actual trip. Reject empty
 * values before coercing.
 */
function toCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function getVisitCoordinates(visit = {}) {
  const lat = toCoordinate(visit.coffee_shop_lat);
  const lng = toCoordinate(visit.coffee_shop_lng);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

export function hasVisitCoordinates(visit) {
  return getVisitCoordinates(visit) !== null;
}
