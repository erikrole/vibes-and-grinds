import { getVisitCoordinates } from './coords.js';

// Domain-restricted browser tokens cannot run on localhost or an unrelated preview.
// This only chooses a usable provider; Apple validates the token itself.
export function isMapsTokenAllowed(token, hostname) {
  if (!token) return false;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { origin } = JSON.parse(atob(payload));
    if (!origin || !hostname) return true;
    return origin.split(',').some((domain) => {
      const allowed = domain.trim().toLowerCase();
      const host = hostname.toLowerCase();
      return allowed === host || (allowed.startsWith('*.') && host.endsWith(allowed.slice(1)));
    });
  } catch { return true; }
}

export function normalizeApplePlace(place) {
  return {
    name: place.name || '',
    address: place.formattedAddress || '',
    city: [place.locality, place.administrativeAreaCode].filter(Boolean).join(', '),
    // Preserve the existing storage contract while keeping provider IDs distinct.
    place_id: place.id ? `apple:${place.id}` : '',
    lat: place.coordinate?.latitude,
    lng: place.coordinate?.longitude,
  };
}

export function getAppleMapsUrl(visit) {
  const id = visit.coffee_shop_place_id || '';
  if (id.startsWith('apple:')) {
    return `https://maps.apple.com/place?${new URLSearchParams({ 'place-id': id.slice(6) })}`;
  }
  const coordinates = getVisitCoordinates(visit);
  if (coordinates) {
    return `https://maps.apple.com/place?${new URLSearchParams({
      coordinate: `${coordinates.lat},${coordinates.lng}`,
      name: visit.coffee_shop_name || '',
      ...(visit.coffee_shop_address ? { address: visit.coffee_shop_address } : {}),
    })}`;
  }
  return `https://maps.apple.com/search?${new URLSearchParams({
    query: [visit.coffee_shop_name, visit.coffee_shop_address || visit.city].filter(Boolean).join(', '),
  })}`;
}
