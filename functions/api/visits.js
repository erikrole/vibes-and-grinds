// GET /api/visits - Get all visits
// POST /api/visits - Create a new visit

import { json, jsonError } from '../../shared/http.js';
import { validateVisit } from '../../shared/visit-validation.js';

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM coffee_visits ORDER BY date DESC, created_at DESC'
    ).all();

    return json(results);
  } catch (error) {
    console.error('Error fetching visits:', error);
    return jsonError('Failed to fetch visits');
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

    const validationError = validateVisit(body);
    if (validationError) {
      return jsonError(validationError, 400);
    }

    const result = await env.DB.prepare(
      `INSERT INTO coffee_visits (
        date, coffee_shop_name, city, opponent, sport, coffee_shop_address, coffee_shop_place_id,
        coffee_shop_lat, coffee_shop_lng, coffee_order, vibe_rating, coffee_rating, notes, photo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      photo_url || null
    ).run();

    const { results } = await env.DB.prepare(
      'SELECT * FROM coffee_visits WHERE id = ?'
    ).bind(result.meta.last_row_id).all();

    return json(results[0], 201);
  } catch (error) {
    console.error('Error creating visit:', error);
    return jsonError('Failed to create visit');
  }
}
