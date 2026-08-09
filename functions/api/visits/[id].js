// GET /api/visits/:id - Get a single visit
// PUT /api/visits/:id - Update a visit
// DELETE /api/visits/:id - Delete a visit

import { jsonResponse, normalizeOptionalText, normalizeVisitType, validateVisit } from '../_shared.js';

export async function onRequestGet({ params, env }) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM coffee_visits WHERE id = ?'
    ).bind(params.id).all();

    if (results.length === 0) {
      return jsonResponse({ error: 'Visit not found' }, 404);
    }

    return jsonResponse(results[0]);
  } catch (error) {
    console.error('Error fetching visit:', error);
    return jsonResponse({ error: 'Failed to fetch visit' }, 500);
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
      sport,
      visit_type,
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

    const validationError = validateVisit({ date, coffee_shop_name, vibe_rating, coffee_rating });
    if (validationError) {
      return jsonResponse({ error: validationError }, 400);
    }

    // Update the visit (convert undefined to null for optional fields)
    const updateResult = await env.DB.prepare(
      `UPDATE coffee_visits SET
        date = ?, coffee_shop_name = ?, city = ?, opponent = ?, sport = ?, visit_type = ?, coffee_shop_address = ?,
        coffee_shop_place_id = ?, coffee_shop_lat = ?, coffee_shop_lng = ?,
        coffee_order = ?, vibe_rating = ?, coffee_rating = ?, notes = ?, photo_url = ?
      WHERE id = ?`
    ).bind(
      date,
      String(coffee_shop_name).trim(),
      normalizeOptionalText(city),
      normalizeOptionalText(opponent),
      sport || null,
      normalizeVisitType(visit_type),
      coffee_shop_address || null,
      coffee_shop_place_id || null,
      coffee_shop_lat || null,
      coffee_shop_lng || null,
      normalizeOptionalText(coffee_order),
      Number(vibe_rating),
      Number(coffee_rating),
      normalizeOptionalText(notes),
      photo_url || null,
      params.id
    ).run();

    // Without this the handler answers 200 with an empty body for an id that
    // doesn't exist, which the client reads as a successful save.
    if (updateResult.meta?.changes === 0) {
      return jsonResponse({ error: 'Visit not found' }, 404);
    }

    // Fetch updated visit
    const { results } = await env.DB.prepare(
      'SELECT * FROM coffee_visits WHERE id = ?'
    ).bind(params.id).all();

    return jsonResponse(results[0]);
  } catch (error) {
    console.error('Error updating visit:', error);
    return jsonResponse({ error: 'Failed to update visit' }, 500);
  }
}

export async function onRequestDelete({ params, env }) {
  try {
    await env.DB.prepare('DELETE FROM coffee_visits WHERE id = ?').bind(params.id).run();

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting visit:', error);
    return jsonResponse({ error: 'Failed to delete visit' }, 500);
  }
}
