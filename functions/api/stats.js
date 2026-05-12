// GET /api/stats - Get dashboard statistics

import { json, jsonError } from '../../shared/http.js';

export async function onRequestGet({ env }) {
  try {
    const { results: statsResults } = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_visits,
        ROUND(AVG(vibe_rating), 2) as avg_vibe,
        ROUND(AVG(coffee_rating), 2) as avg_coffee,
        ROUND(AVG(composite_score), 2) as avg_composite,
        MAX(composite_score) as best_composite
      FROM coffee_visits
    `).all();

    const { results: topShops } = await env.DB.prepare(`
      SELECT
        coffee_shop_name,
        COUNT(*) as visit_count,
        ROUND(AVG(composite_score), 2) as avg_composite
      FROM coffee_visits
      GROUP BY coffee_shop_name
      ORDER BY avg_composite DESC
      LIMIT 5
    `).all();

    return json({ ...statsResults[0], topShops });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return jsonError('Failed to fetch stats');
  }
}
