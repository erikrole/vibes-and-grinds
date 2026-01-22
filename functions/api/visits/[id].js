// GET /api/visits/:id - Get a single visit
// PUT /api/visits/:id - Update a visit
// DELETE /api/visits/:id - Delete a visit

export async function onRequestGet({ params, env }) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM coffee_visits WHERE id = ?'
    ).bind(params.id).all();

    if (results.length === 0) {
      return new Response(JSON.stringify({ error: 'Visit not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(results[0]), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching visit:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch visit' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPut({ params, request, env }) {
  try {
    const body = await request.json();
    const {
      date,
      coffee_shop_name,
      city,
      opponent,
      coffee_shop_address,
      coffee_shop_place_id,
      coffee_shop_lat,
      coffee_shop_lng,
      coffee_order,
      vibe_rating,
      coffee_rating,
      notes,
    } = body;

    // Validation
    if (vibe_rating < 0 || vibe_rating > 10 || coffee_rating < 0 || coffee_rating > 10) {
      return new Response(JSON.stringify({ error: 'Ratings must be between 0 and 10' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.DB.prepare(
      `UPDATE coffee_visits SET
        date = ?, coffee_shop_name = ?, city = ?, opponent = ?, coffee_shop_address = ?,
        coffee_shop_place_id = ?, coffee_shop_lat = ?, coffee_shop_lng = ?,
        coffee_order = ?, vibe_rating = ?, coffee_rating = ?, notes = ?
      WHERE id = ?`
    ).bind(
      date,
      coffee_shop_name,
      city,
      opponent,
      coffee_shop_address,
      coffee_shop_place_id,
      coffee_shop_lat,
      coffee_shop_lng,
      coffee_order,
      vibe_rating,
      coffee_rating,
      notes,
      params.id
    ).run();

    // Fetch updated visit
    const { results } = await env.DB.prepare(
      'SELECT * FROM coffee_visits WHERE id = ?'
    ).bind(params.id).all();

    return new Response(JSON.stringify(results[0]), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating visit:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update visit',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestDelete({ params, env }) {
  try {
    await env.DB.prepare('DELETE FROM coffee_visits WHERE id = ?').bind(params.id).run();

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting visit:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete visit' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
