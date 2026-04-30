import { json, jsonError } from '../../shared/http.js';

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
  const placeId = (url.searchParams.get('placeId') || '').trim();
  const apiKey = env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return jsonError('Google Places is not configured on the server.', 503);
  }

  if (!placeId) {
    return jsonError('placeId is required.', 400);
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
      },
    });

    if (!response.ok) {
      const details = await response.text();
      const errorPayload = buildPlacesErrorResponse('Place details failed', response.status, details);
      console.error('Place details failed:', errorPayload);
      return json(errorPayload, 502);
    }

    const data = await response.json();

    return json({
      place: {
        name: data.displayName?.text || '',
        address: data.formattedAddress || '',
        place_id: data.id || placeId,
        lat: data.location?.latitude ?? '',
        lng: data.location?.longitude ?? '',
      },
    });
  } catch (error) {
    console.error('Error fetching place details:', error);
    return jsonError('Place details failed: Unable to reach Google Places.', 500, {
      details: error.message,
    });
  }
}
