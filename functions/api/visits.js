// GET /api/visits - Get all visits
// POST /api/visits - Create a new visit

function normalizeOptionalText(value) {
  return (value || '').trim() || null;
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM coffee_visits ORDER BY date DESC, created_at DESC'
    ).all();

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching visits:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch visits' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const {
      date,
      coffee_shop_name,
      city,
      opponent,
      sport,
      coffee_shop_address,
      coffee_shop_place_id,
      coffee_shop_lat,
      coffee_shop_lng,
      coffee_order,
      vibe_rating,
      coffee_rating,
      notes,
      photo_url,
    } = body;

    // Validation
    if (!date || !coffee_shop_name || vibe_rating === undefined || coffee_rating === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (vibe_rating < 0 || vibe_rating > 10 || coffee_rating < 0 || coffee_rating > 10) {
      return new Response(JSON.stringify({ error: 'Ratings must be between 0 and 10' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Insert the visit (convert undefined to null for optional fields)
    const result = await env.DB.prepare(
      `INSERT INTO coffee_visits (
        date, coffee_shop_name, city, opponent, sport, coffee_shop_address, coffee_shop_place_id,
        coffee_shop_lat, coffee_shop_lng, coffee_order, vibe_rating, coffee_rating, notes, photo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      date,
      coffee_shop_name.trim(),
      normalizeOptionalText(city),
      normalizeOptionalText(opponent),
      sport || null,
      coffee_shop_address || null,
      coffee_shop_place_id || null,
      coffee_shop_lat || null,
      coffee_shop_lng || null,
      normalizeOptionalText(coffee_order),
      vibe_rating,
      coffee_rating,
      normalizeOptionalText(notes),
      photo_url || null
    ).run();

    // Fetch the newly created visit
    const { results } = await env.DB.prepare(
      'SELECT * FROM coffee_visits WHERE id = ?'
    ).bind(result.meta.last_row_id).all();

    return new Response(JSON.stringify(results[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating visit:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create visit',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
