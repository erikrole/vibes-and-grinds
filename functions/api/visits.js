// GET /api/visits - Get all visits
// POST /api/visits - Create a new visit

import { optionalCoord, readJsonBody } from './_http.js';
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
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return jsonResponse({ error: parsed.error }, parsed.status);

  try {
    const body = parsed.value;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }
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

    const cleanDate = String(date ?? '').trim();
    const cleanName = String(coffee_shop_name ?? '').trim();
    const validationError = validateVisit({
      date: cleanDate,
      coffee_shop_name: cleanName,
      vibe_rating,
      coffee_rating,
    });
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
      cleanDate,
      cleanName,
      normalizeOptionalText(city),
      normalizeOptionalText(opponent),
      sport || null,
      normalizeVisitType(visit_type),
      coffee_shop_address || null,
      coffee_shop_place_id || null,
      optionalCoord(coffee_shop_lat),
      optionalCoord(coffee_shop_lng),
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
