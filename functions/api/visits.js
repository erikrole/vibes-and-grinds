// GET /api/visits - Get all visits
// POST /api/visits - Create a new visit

import { jsonResponse, normalizeOptionalText, normalizeVisitType, validateVisit } from './_shared.js';

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM coffee_visits ORDER BY date DESC, created_at DESC'
    ).all();

    return jsonResponse(results);
  } catch (error) {
    console.error('Error fetching visits:', error);
    return jsonResponse({ error: 'Failed to fetch visits' }, 500);
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

    // Insert the visit (convert undefined to null for optional fields)
    const result = await env.DB.prepare(
      `INSERT INTO coffee_visits (
        date, coffee_shop_name, city, opponent, sport, visit_type, coffee_shop_address, coffee_shop_place_id,
        coffee_shop_lat, coffee_shop_lng, coffee_order, vibe_rating, coffee_rating, notes, photo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      date,
      coffee_shop_name.trim(),
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
      photo_url || null
    ).run();

    // Fetch the newly created visit
    const { results } = await env.DB.prepare(
      'SELECT * FROM coffee_visits WHERE id = ?'
    ).bind(result.meta.last_row_id).all();

    return jsonResponse(results[0], 201);
  } catch (error) {
    console.error('Error creating visit:', error);
    return jsonResponse({ error: 'Failed to create visit' }, 500);
  }
}
