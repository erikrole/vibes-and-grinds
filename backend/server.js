const express = require('express');
const cors = require('cors');
const { initDatabase, getDatabase } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
let db;
initDatabase().then(database => {
  db = database;
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Routes

// Get all coffee visits
app.get('/api/visits', async (req, res) => {
  try {
    const visits = await db.all(
      'SELECT * FROM coffee_visits ORDER BY date DESC, created_at DESC'
    );
    res.json(visits);
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

// Get a single visit
app.get('/api/visits/:id', async (req, res) => {
  try {
    const visit = await db.get(
      'SELECT * FROM coffee_visits WHERE id = ?',
      [req.params.id]
    );
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    res.json(visit);
  } catch (error) {
    console.error('Error fetching visit:', error);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
});

// Create a new visit
app.post('/api/visits', async (req, res) => {
  try {
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
      photo_url
    } = req.body;

    // Validation
    if (!date || !coffee_shop_name || vibe_rating === undefined || coffee_rating === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (vibe_rating < 0 || vibe_rating > 10 || coffee_rating < 0 || coffee_rating > 10) {
      return res.status(400).json({ error: 'Ratings must be between 0 and 10' });
    }

    const result = await db.run(
      `INSERT INTO coffee_visits (
        date, coffee_shop_name, city, opponent, sport, coffee_shop_address, coffee_shop_place_id,
        coffee_shop_lat, coffee_shop_lng, coffee_order, vibe_rating, coffee_rating, notes, photo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
        photo_url
      ]
    );

    const newVisit = await db.get(
      'SELECT * FROM coffee_visits WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json(newVisit);
  } catch (error) {
    console.error('Error creating visit:', error);
    res.status(500).json({ error: 'Failed to create visit' });
  }
});

// Update a visit
app.put('/api/visits/:id', async (req, res) => {
  try {
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
      photo_url
    } = req.body;

    // Validation
    if (vibe_rating < 0 || vibe_rating > 10 || coffee_rating < 0 || coffee_rating > 10) {
      return res.status(400).json({ error: 'Ratings must be between 0 and 10' });
    }

    await db.run(
      `UPDATE coffee_visits SET
        date = ?, coffee_shop_name = ?, city = ?, opponent = ?, sport = ?, coffee_shop_address = ?,
        coffee_shop_place_id = ?, coffee_shop_lat = ?, coffee_shop_lng = ?,
        coffee_order = ?, vibe_rating = ?, coffee_rating = ?, notes = ?, photo_url = ?
      WHERE id = ?`,
      [
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
        req.params.id
      ]
    );

    const updatedVisit = await db.get(
      'SELECT * FROM coffee_visits WHERE id = ?',
      [req.params.id]
    );

    res.json(updatedVisit);
  } catch (error) {
    console.error('Error updating visit:', error);
    res.status(500).json({ error: 'Failed to update visit' });
  }
});

// Delete a visit
app.delete('/api/visits/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM coffee_visits WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting visit:', error);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
});

// Get dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.get(`
      SELECT
        COUNT(*) as total_visits,
        ROUND(AVG(vibe_rating), 2) as avg_vibe,
        ROUND(AVG(coffee_rating), 2) as avg_coffee,
        ROUND(AVG(composite_score), 2) as avg_composite,
        MAX(composite_score) as best_composite
      FROM coffee_visits
    `);

    const topShops = await db.all(`
      SELECT
        coffee_shop_name,
        COUNT(*) as visit_count,
        ROUND(AVG(composite_score), 2) as avg_composite
      FROM coffee_visits
      GROUP BY coffee_shop_name
      ORDER BY avg_composite DESC
      LIMIT 5
    `);

    res.json({ ...stats, topShops });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
