import test from 'node:test';
import assert from 'node:assert/strict';
import { getAppleMapsUrl, isMapsTokenAllowed, normalizeApplePlace } from '../src/utils/maps.js';
import { getVisitCoordinates } from '../src/utils/coords.js';

test('Apple place identity and structured city survive the visit storage contract', () => {
  assert.deepEqual(normalizeApplePlace({
    id: 'I123', name: 'A & B Coffee', locality: 'Madison', administrativeAreaCode: 'WI',
    formattedAddress: '123 Main St, Madison, WI', coordinate: { latitude: 43.07, longitude: -89.4 },
  }), { name: 'A & B Coffee', city: 'Madison, WI', address: '123 Main St, Madison, WI', place_id: 'apple:I123', lat: 43.07, lng: -89.4 });
});

test('canonical Apple IDs open the place page without passing a Google ID', () => {
  const apple = new URL(getAppleMapsUrl({ coffee_shop_place_id: 'apple:I123' }));
  assert.equal(apple.searchParams.get('place-id'), 'I123');
  const google = new URL(getAppleMapsUrl({ coffee_shop_place_id: 'ChIJ123', coffee_shop_name: 'A & B', coffee_shop_lat: '43.07', coffee_shop_lng: '-89.4' }));
  assert.equal(google.searchParams.get('place-id'), null);
  assert.equal(google.searchParams.get('coordinate'), '43.07,-89.4');
  assert.equal(google.searchParams.get('name'), 'A & B');
});

test('manual locations use a search link instead of a phantom coordinate pin', () => {
  const url = new URL(getAppleMapsUrl({ coffee_shop_name: 'Coffee / Tea', city: 'Madison, WI', coffee_shop_lat: null, coffee_shop_lng: '' }));
  assert.equal(url.pathname, '/search');
  assert.equal(url.searchParams.get('query'), 'Coffee / Tea, Madison, WI');
  assert.equal(url.searchParams.get('coordinate'), null);
});

test('coordinates accept legitimate zeroes and reject empty or out-of-range values', () => {
  for (const value of [null, undefined, '', 'invalid', 91]) {
    assert.equal(getVisitCoordinates({ coffee_shop_lat: value, coffee_shop_lng: 0 }), null);
  }
  assert.equal(getVisitCoordinates({ coffee_shop_lat: 0, coffee_shop_lng: 181 }), null);
  assert.deepEqual(getVisitCoordinates({ coffee_shop_lat: 0, coffee_shop_lng: '0' }), { lat: 0, lng: 0 });
});

let clientNumber = 0;
test('a production domain token does not break localhost or unrelated previews', () => {
  const token = `header.${btoa(JSON.stringify({ origin: 'coffee.erikrole.com' }))}.signature`;
  assert.equal(isMapsTokenAllowed(token, 'coffee.erikrole.com'), true);
  assert.equal(isMapsTokenAllowed(token, '127.0.0.1'), false);
  assert.equal(isMapsTokenAllowed(token, 'coffee.erikrole.com.evil.example'), false);
  assert.equal(isMapsTokenAllowed(null, 'coffee.erikrole.com'), false);
});

async function client({ token = null, fetcher, Search } = {}) {
  globalThis.fetch = async (url, options) => url === '/api/maps-config'
    ? new Response(JSON.stringify({ token })) : fetcher(url, options);
  globalThis.document = { head: { querySelector: () => ({}) } };
  globalThis.window = { mapkit: {
    Search,
    Coordinate: class { constructor(latitude, longitude) { Object.assign(this, { latitude, longitude }); } },
    CoordinateSpan: class { constructor(latitudeDelta, longitudeDelta) { Object.assign(this, { latitudeDelta, longitudeDelta }); } },
    CoordinateRegion: class { constructor(center, span) { Object.assign(this, { center, span }); } },
    load: async function () { return this; },
  } };
  return import(`../src/utils/mapkit.js?case=${++clientNumber}`);
}

test('unconfigured Apple Maps preserves the existing Google search and details path', async () => {
  const calls = [];
  const api = await client({ fetcher: async (url) => {
    calls.push(url);
    return new Response(JSON.stringify(url.startsWith('/api/places-autocomplete')
      ? { suggestions: [{ placeId: 'google123', mainText: 'Coffee' }] }
      : { place: { name: 'Coffee', place_id: 'google123' } }));
  } });
  const matches = await api.searchPlaces('Coffee & Tea', { city: 'Madison, WI' });
  assert.equal(matches[0].provider, 'google');
  assert.equal(new URL(calls[0], 'https://example.com').searchParams.get('input'), 'Coffee & Tea Madison, WI');
  assert.equal((await api.resolvePlace(matches[0])).place_id, 'google123');
});

test('Apple autocomplete passes the exact selected result to search for details', async () => {
  const selected = { id: 'I123', displayLines: ['Coffee', 'Madison, WI'] };
  let received;
  const api = await client({ token: 'test-public-token', Search: class {
    async autocomplete(query, options) {
      assert.equal(query, 'Coffee'); assert.equal(options.signal.aborted, false);
      assert.equal(options.includeQueries, false); assert.equal(options.includeAddresses, false);
      assert.equal(options.includePointsOfInterest, true);
      return { results: [selected] };
    }
    async search(query) { received = query; return { places: [{ id: 'I123', name: 'Coffee', locality: 'Madison' }] }; }
  } });
  const matches = await api.searchPlaces('Coffee', { signal: new AbortController().signal });
  assert.equal(matches[0].provider, 'apple');
  assert.equal(matches[0].secondaryText, 'Madison, WI');
  assert.equal((await api.resolvePlace(matches[0])).place_id, 'apple:I123');
  assert.equal(received, selected);
});

test('ambiguous Apple results require a more specific selection instead of guessing a shop', async () => {
  const api = await client({ token: 'test-public-token', Search: class {
    async search() { return { places: [{ name: 'Shop A' }, { name: 'Shop B' }] }; }
  } });
  await assert.rejects(api.resolvePlace({ provider: 'apple', result: {} }), /more specific/);
});

test('Madison searches require the metro region while road searches keep other destinations available', async () => {
  const calls = [];
  const api = await client({ token: 'test-public-token', Search: class {
    async autocomplete(query, options) { calls.push({ query, options }); return { results: [] }; }
  } });
  await api.searchPlaces('Madison Chocolate Company', { city: 'Madison, WI' });
  await api.searchPlaces('Yaw Farm', { city: 'Las Vegas, NV' });
  assert.equal(calls[0].query, 'Madison Chocolate Company Madison, WI');
  assert.equal(calls[0].options.regionPriority, 'required');
  assert.equal(calls[0].options.region.center.latitude, 43.07476);
  assert.equal(calls[0].options.region.center.longitude, -89.38484);
  assert.equal(calls[1].query, 'Yaw Farm Las Vegas, NV');
  assert.equal(calls[1].options.region, undefined);
  assert.equal(calls[1].options.regionPriority, undefined);
});

test('cancelled searches never reach the provider', async () => {
  const api = await client({ fetcher: () => assert.fail('Cancelled search reached the provider') });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(api.searchPlaces('Coffee', { signal: controller.signal }), { name: 'AbortError' });
});

test('provider errors reject so the input can offer manual entry', async () => {
  const api = await client({ fetcher: async () => new Response('{}', { status: 503 }) });
  await assert.rejects(api.searchPlaces('Coffee'), /unavailable/);
});

test('maps-config exposes only the public token and forbids caching', async () => {
  // The Pages function has no imports; load it independently of the frontend package type.
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../../functions/api/maps-config.js', import.meta.url), 'utf8');
  const { onRequestGet } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
  const response = onRequestGet({ env: { APPLE_MAPS_TOKEN: 'public-token', APPLE_PRIVATE_KEY: 'must-not-leak' } });
  assert.deepEqual(await response.json(), { token: 'public-token' });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await onRequestGet({ env: {} }).json(), { token: null });
});
