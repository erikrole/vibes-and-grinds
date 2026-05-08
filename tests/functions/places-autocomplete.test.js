import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { onRequestGet } from '../../functions/api/places-autocomplete.js';

function makeRequest(query = '') {
  return new Request(`https://x/api/places-autocomplete?input=${encodeURIComponent(query)}`);
}

describe('GET /api/places-autocomplete', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns 503 when no API key is configured', async () => {
    const res = await onRequestGet({ request: makeRequest('starbucks'), env: {} });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/not configured/i);
  });

  it('returns empty suggestions for inputs shorter than 2 chars', async () => {
    globalThis.fetch = vi.fn();
    const res = await onRequestGet({
      request: makeRequest('a'),
      env: { GOOGLE_MAPS_API_KEY: 'k' },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ suggestions: [] });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('passes the API key in the X-Goog-Api-Key header', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ suggestions: [] }), { status: 200 })
    );
    await onRequestGet({
      request: makeRequest('starbucks'),
      env: { GOOGLE_MAPS_API_KEY: 'secret' },
    });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.headers['X-Goog-Api-Key']).toBe('secret');
    expect(init.method).toBe('POST');
  });

  it('flattens Google response into placeId/mainText/secondaryText', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          suggestions: [
            {
              placePrediction: {
                placeId: 'abc',
                structuredFormat: {
                  mainText: { text: 'Colectivo' },
                  secondaryText: { text: 'Madison, WI' },
                },
              },
            },
            { placePrediction: null }, // dropped
            {
              placePrediction: {
                placeId: 'def',
                text: { text: 'Just a fallback' },
              },
            },
          ],
        }),
        { status: 200 }
      )
    );

    const res = await onRequestGet({
      request: makeRequest('coff'),
      env: { GOOGLE_MAPS_API_KEY: 'k' },
    });

    const body = await res.json();
    expect(body.suggestions).toEqual([
      { placeId: 'abc', mainText: 'Colectivo', secondaryText: 'Madison, WI' },
      { placeId: 'def', mainText: 'Just a fallback', secondaryText: '' },
    ]);
  });

  it('maps PERMISSION_DENIED upstream errors to a billing-hint 502', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ error: { status: 'PERMISSION_DENIED', message: 'denied' } }),
        { status: 403 }
      )
    );

    const res = await onRequestGet({
      request: makeRequest('coff'),
      env: { GOOGLE_MAPS_API_KEY: 'k' },
    });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.googleStatus).toBe('PERMISSION_DENIED');
    expect(body.error).toMatch(/billing/i);
  });

  it('maps RESOURCE_EXHAUSTED upstream errors to a quota 502', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', message: 'quota' } }),
        { status: 429 }
      )
    );

    const res = await onRequestGet({
      request: makeRequest('coff'),
      env: { GOOGLE_MAPS_API_KEY: 'k' },
    });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/quota/i);
  });

  it('falls back to VITE_GOOGLE_MAPS_API_KEY if GOOGLE_MAPS_API_KEY is unset', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ suggestions: [] }), { status: 200 })
    );
    await onRequestGet({
      request: makeRequest('coff'),
      env: { VITE_GOOGLE_MAPS_API_KEY: 'fallback' },
    });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.headers['X-Goog-Api-Key']).toBe('fallback');
  });
});
