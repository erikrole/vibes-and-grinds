import { MAX_PLACES_INPUT } from './_http.js';

const MIN_INPUT_LENGTH = 3;
const SUGGESTION_CACHE_LIMIT = 50;
const SUGGESTION_CACHE_TTL_MS = 10 * 60 * 1000;
const SESSION_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Per-isolate memory. Autocomplete predictions don't depend on the session token.
const suggestionCache = new Map();

function readSessionToken(value) {
  const token = `${value || ''}`.trim();
  return SESSION_TOKEN_PATTERN.test(token) ? token : '';
}

function readSuggestionCache(input) {
  const entry = suggestionCache.get(input);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > SUGGESTION_CACHE_TTL_MS) {
    suggestionCache.delete(input);
    return null;
  }

  suggestionCache.delete(input);
  suggestionCache.set(input, entry);
  return entry.suggestions;
}

function writeSuggestionCache(input, suggestions) {
  if (suggestionCache.has(input)) suggestionCache.delete(input);
  suggestionCache.set(input, { suggestions, cachedAt: Date.now() });
  while (suggestionCache.size > SUGGESTION_CACHE_LIMIT) {
    const oldest = suggestionCache.keys().next().value;
    suggestionCache.delete(oldest);
  }
}

function buildPlacesErrorResponse(prefix, upstreamStatus, payloadText) {
  let parsed;

  try {
    parsed = JSON.parse(payloadText || '{}');
  } catch {
    parsed = null;
  }

  const googleStatus = parsed?.error?.status || '';
  const googleMessage = parsed?.error?.message || '';

  if (googleStatus === 'PERMISSION_DENIED' || googleStatus === 'REQUEST_DENIED') {
    return {
      error: `${prefix}: Google denied the request. Confirm billing is active and Places API (New) is enabled for this project.`,
      details: googleMessage || 'Permission denied by Google Places.',
      googleStatus,
      upstreamStatus,
    };
  }

  if (googleStatus === 'RESOURCE_EXHAUSTED') {
    return {
      error: `${prefix}: Google quota is exhausted.`,
      details: googleMessage || 'Quota exceeded for Google Places.',
      googleStatus,
      upstreamStatus,
    };
  }

  return {
    error: `${prefix}: Google Places is unavailable right now.`,
    details: googleMessage || payloadText || 'Unknown Google Places error.',
    googleStatus,
    upstreamStatus,
  };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const input = (url.searchParams.get('input') || '').trim();
  const apiKey = env.GOOGLE_MAPS_API_KEY || env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Google Places is not configured on the server.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (input.length > MAX_PLACES_INPUT) {
    return new Response(JSON.stringify({ error: `Search must be ${MAX_PLACES_INPUT} characters or fewer` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (input.length < MIN_INPUT_LENGTH) {
    return new Response(JSON.stringify({ suggestions: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cachedSuggestions = readSuggestionCache(input);
  if (cachedSuggestions) {
    return new Response(JSON.stringify({ suggestions: cachedSuggestions }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sessionToken = readSessionToken(url.searchParams.get('sessionToken'));

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ['cafe', 'coffee_shop', 'restaurant'],
        ...(sessionToken ? { sessionToken } : {}),
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      const errorPayload = buildPlacesErrorResponse('Autocomplete failed', response.status, details);
      console.error('Places autocomplete failed:', errorPayload);
      return new Response(JSON.stringify(errorPayload), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const suggestions = (data?.suggestions || [])
      .map((item) => {
        const prediction = item.placePrediction;
        if (!prediction?.placeId) return null;

        return {
          placeId: prediction.placeId,
          mainText: prediction.structuredFormat?.mainText?.text || prediction.text?.text || '',
          secondaryText: prediction.structuredFormat?.secondaryText?.text || '',
        };
      })
      .filter(Boolean);

    writeSuggestionCache(input, suggestions);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching places autocomplete:', error);
    return new Response(JSON.stringify({
      error: 'Autocomplete failed: Unable to reach Google Places.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
