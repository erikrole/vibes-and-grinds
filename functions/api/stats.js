// GET /api/stats - Get dashboard statistics

export async function onRequestGet({ env }) {
  try {
    // Get overall stats
    const { results: statsResults } = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_visits,
        ROUND(AVG(vibe_rating), 2) as avg_vibe,
        ROUND(AVG(coffee_rating), 2) as avg_coffee,
        ROUND(AVG(composite_score), 2) as avg_composite,
        MAX(composite_score) as best_composite
      FROM coffee_visits
    `).all();

    // Get top shops
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

    const stats = {
      ...statsResults[0],
      topShops,
    };

    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
