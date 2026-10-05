import { load } from '@apple/mapkit-loader';
import { isMapsTokenAllowed, normalizeApplePlace } from './maps.js';

let configPromise;
let mapkitPromise;

export function getMapsConfig() {
  if (!configPromise) {
    configPromise = fetch('/api/maps-config', { signal: AbortSignal.timeout(8000) })
      .then(async (response) => response.ok ? response.json() : { token: null })
      .then((config) => isMapsTokenAllowed(config.token, window.location?.hostname) ? config : { token: null })
      .catch(() => ({ token: null }));
  }
  return configPromise;
}

export async function loadAppleMaps() {
  const { token } = await getMapsConfig();
  if (!token) throw new Error('Apple Maps is not configured.');
  if (!mapkitPromise) {
    mapkitPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Apple Maps could not connect.')), 15000);
      load({ token, language: 'en-US', libraries: ['services', 'full-map'], version: '6' })
        .then(resolve, reject).finally(() => clearTimeout(timer));
    }).catch((error) => { mapkitPromise = null; throw error; });
  }
  return mapkitPromise;
}

async function readJson(response) {
  if (!response.ok) throw new Error('Place search is unavailable.');
  return response.json();
}

export async function searchPlaces(query, { signal, city = '' } = {}) {
  const { token } = await getMapsConfig();
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (token) {
    const mapkit = await loadAppleMaps();
    const local = /^Madison,?\s*WI$/i.test(city.trim());
    const region = local ? new mapkit.CoordinateRegion(
      new mapkit.Coordinate(43.07476, -89.38484), new mapkit.CoordinateSpan(0.65, 0.9)
    ) : undefined;
    const data = await new mapkit.Search().autocomplete(city ? `${query} ${city}` : query, {
      signal, includePointsOfInterest: true, includeAddresses: false, includeQueries: false,
      coordinate: new mapkit.Coordinate(local ? 43.07476 : 39.5, local ? -89.38484 : -98.35),
      ...(region ? { region, regionPriority: 'required' } : {}),
    });
    return (data.results || []).map((result, index) => ({
      key: result.id || `apple-${index}`,
      mainText: result.displayLines?.[0] || result.name || query,
      secondaryText: result.displayLines?.slice(1).join(', ') || '',
      provider: 'apple', result,
    }));
  }
  const data = await readJson(await fetch(`/api/places-autocomplete?input=${encodeURIComponent(city ? `${query} ${city}` : query)}`, { signal }));
  return (data.suggestions || []).map((result) => ({ ...result, key: result.placeId, provider: 'google' }));
}

export async function resolvePlace(suggestion, { signal } = {}) {
  if (suggestion.provider === 'apple') {
    const mapkit = await loadAppleMaps();
    const data = await new mapkit.Search().search(suggestion.result, { signal });
    // A broad autocomplete result can resolve to several businesses. Never guess.
    if (data.places?.length !== 1) throw new Error('Try a more specific shop name or add the location manually.');
    return normalizeApplePlace(data.places[0]);
  }
  const data = await readJson(await fetch(`/api/places-details?placeId=${encodeURIComponent(suggestion.placeId)}`, { signal }));
  return data.place;
}
