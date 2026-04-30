// GET /api/visits/:id - Get a single visit
// PUT /api/visits/:id - Update a visit
// DELETE /api/visits/:id - Delete a visit

import { json, jsonError } from '../../../shared/http.js';

export async function onRequestGet({ params, env }) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM coffee_visits WHERE id = ?'
    ).bind(params.id).all();

    if (results.length === 0) {
      return jsonError('Visit not found', 404);
    }

    return json(results[0]);
  } catch (error) {
    console.error('Error fetching visit:', error);
    return jsonError('Failed to fetch visit');
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

    if (vibe_rating < 0 || vibe_rating > 10 || coffee_rating < 0 || coffee_rating > 10) {
      return jsonError('Ratings must be between 0 and 10', 400);
    }

    await env.DB.prepare(
      `UPDATE coffee_visits SET
        date = ?, coffee_shop_name = ?, city = ?, opponent = ?, sport = ?, coffee_shop_address = ?,
        coffee_shop_place_id = ?, coffee_shop_lat = ?, coffee_shop_lng = ?,
        coffee_order = ?, vibe_rating = ?, coffee_rating = ?, notes = ?, photo_url = ?
      WHERE id = ?`
    ).bind(
      date,
      coffee_shop_name,
      city || null,
      opponent || null,
      sport || null,
      coffee_shop_address || null,
      coffee_shop_place_id || null,
      coffee_shop_lat || null,
      coffee_shop_lng || null,
      coffee_order || null,
      vibe_rating,
      coffee_rating,
      notes || null,
      photo_url || null,
      params.id
    ).run();

    const { results } = await env.DB.prepare(
      'SELECT * FROM coffee_visits WHERE id = ?'
    ).bind(params.id).all();

    return json(results[0]);
  } catch (error) {
    console.error('Error updating visit:', error);
    return jsonError('Failed to update visit');
  }
}

export async function onRequestDelete({ params, env }) {
  try {
    await env.DB.prepare('DELETE FROM coffee_visits WHERE id = ?').bind(params.id).run();
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting visit:', error);
    return jsonError('Failed to delete visit');
  }
}
