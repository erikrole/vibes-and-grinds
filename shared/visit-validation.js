// Validation rules for coffee_visit POST/PUT bodies.
// Backend (Node CJS) implements the same rules in backend/server.js's
// validateVisit(); keep them in sync.

const LIMITS = {
  coffee_shop_name: 200,
  city: 100,
  opponent: 100,
  sport: 50,
  coffee_shop_address: 500,
  coffee_shop_place_id: 200,
  coffee_order: 200,
  notes: 2000,
  photo_url: 1000,
  date: 32,
};

function tooLong(value, max) {
  return typeof value === 'string' && value.length > max;
}

// Returns an error string if invalid, otherwise null.
// `partial: true` skips the required-field check (PUT semantics in some apps),
// but we still validate any field that IS present.
export function validateVisit(body, { partial = false } = {}) {
  const {
    date,
    coffee_shop_name,
    vibe_rating,
    coffee_rating,
  } = body || {};

  if (!partial) {
    if (!date || !coffee_shop_name || vibe_rating === undefined || coffee_rating === undefined) {
      return 'Missing required fields';
    }
    if (!String(coffee_shop_name).trim()) {
      return 'Coffee shop name cannot be empty';
    }
  }

  if (vibe_rating !== undefined && (vibe_rating < 0 || vibe_rating > 10)) {
    return 'Ratings must be between 0 and 10';
  }
  if (coffee_rating !== undefined && (coffee_rating < 0 || coffee_rating > 10)) {
    return 'Ratings must be between 0 and 10';
  }

  for (const [field, max] of Object.entries(LIMITS)) {
    if (tooLong(body?.[field], max)) {
      return `${field} must be ${max} characters or fewer`;
    }
  }

  return null;
}
