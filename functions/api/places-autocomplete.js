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

  if (input.length < 2) {
    return new Response(JSON.stringify({ suggestions: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ['cafe', 'coffee_shop', 'restaurant'],
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
    const suggestions = (data.suggestions || [])
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

    return new Response(JSON.stringify({ suggestions }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching places autocomplete:', error);
    return new Response(JSON.stringify({
      error: 'Autocomplete failed: Unable to reach Google Places.',
      details: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
