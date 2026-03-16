// Badge system with levels (Bronze → Silver → Gold → Platinum → Diamond).
// All functions are pure — take visits array, return derived badge data.

import { detectStreak } from './insights';

const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];

const TIER_COLORS = {
  Bronze:   { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800/50', hex: '#c2410c' },
  Silver:   { bg: 'bg-slate-100 dark:bg-slate-800/40', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600', hex: '#64748b' },
  Gold:     { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800/50', hex: '#d97706' },
  Platinum: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800/50', hex: '#0891b2' },
  Diamond:  { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800/50', hex: '#7c3aed' },
};

export { TIERS, TIER_COLORS };

// ── Badge Definitions ────────────────────────────────────────────────────────

const BADGE_DEFS = [
  // Milestones
  {
    id: 'first-sip',
    category: 'Milestones',
    icon: '☕',
    name: 'First Sip',
    description: 'Log your first visits',
    levels: [1, 5, 10, 25, 50],
    compute: (visits) => visits.length,
  },
  {
    id: 'century-club',
    category: 'Milestones',
    icon: '💯',
    name: 'Century Club',
    description: 'Reach 100+ visits',
    levels: [100, 150, 250, 400, 500],
    compute: (visits) => visits.length,
  },

  // Streaks
  {
    id: 'on-fire',
    category: 'Streaks',
    icon: '🔥',
    name: 'On Fire',
    description: 'Consecutive visits with 8+ vibe',
    levels: [3, 5, 10, 15, 20],
    compute: (visits) => {
      const sorted = [...visits].sort((a, b) => new Date(a.date) - new Date(b.date));
      const s = detectStreak(sorted, v => v.vibe_rating, 8);
      return Math.max(s.current.length, s.longest.length);
    },
  },
  {
    id: 'gold-standard',
    category: 'Streaks',
    icon: '⚡',
    name: 'Gold Standard',
    description: 'Consecutive visits with 16+ composite',
    levels: [3, 5, 10, 15, 20],
    compute: (visits) => {
      const sorted = [...visits].sort((a, b) => new Date(a.date) - new Date(b.date));
      const s = detectStreak(sorted, v => v.composite_score, 16);
      return Math.max(s.current.length, s.longest.length);
    },
  },

  // Explorer
  {
    id: 'city-hopper',
    category: 'Explorer',
    icon: '🗺️',
    name: 'City Hopper',
    description: 'Visit coffee shops in different cities',
    levels: [3, 5, 10, 15, 25],
    compute: (visits) => new Set(visits.map(v => v.city).filter(Boolean)).size,
  },
  {
    id: 'shop-scout',
    category: 'Explorer',
    icon: '🔍',
    name: 'Shop Scout',
    description: 'Discover unique coffee shops',
    levels: [5, 10, 25, 50, 100],
    compute: (visits) => new Set(visits.map(v => v.coffee_shop_name)).size,
  },

  // Ratings
  {
    id: 'vibe-master',
    category: 'Ratings',
    icon: '✨',
    name: 'Vibe Master',
    description: 'Get perfect 10 vibe ratings',
    levels: [1, 3, 5, 10, 20],
    compute: (visits) => visits.filter(v => v.vibe_rating === 10).length,
  },
  {
    id: 'coffee-connoisseur',
    category: 'Ratings',
    icon: '🫘',
    name: 'Coffee Connoisseur',
    description: 'Get perfect 10 coffee ratings',
    levels: [1, 3, 5, 10, 20],
    compute: (visits) => visits.filter(v => v.coffee_rating === 10).length,
  },
  {
    id: 'perfect-cup',
    category: 'Ratings',
    icon: '👑',
    name: 'The Perfect Cup',
    description: 'Achieve perfect 20/20 scores',
    levels: [1, 3, 5, 10, 20],
    compute: (visits) => visits.filter(v => v.composite_score === 20).length,
  },
  {
    id: 'high-standards',
    category: 'Ratings',
    icon: '📈',
    name: 'High Standards',
    description: 'Maintain a high overall average',
    levels: [13, 14, 15, 16, 17],
    compute: (visits) => {
      if (visits.length < 5) return 0;
      return +(visits.reduce((s, v) => s + v.composite_score, 0) / visits.length).toFixed(1);
    },
  },

  // Orders
  {
    id: 'signature-drink',
    category: 'Orders',
    icon: '🥤',
    name: 'Signature Drink',
    description: 'Order the same drink multiple times',
    levels: [3, 5, 10, 25, 50],
    compute: (visits) => {
      const counts = {};
      visits.forEach(v => { if (v.coffee_order) counts[v.coffee_order] = (counts[v.coffee_order] || 0) + 1; });
      return Math.max(0, ...Object.values(counts));
    },
  },
  {
    id: 'adventurer',
    category: 'Orders',
    icon: '🧭',
    name: 'Adventurer',
    description: 'Try unique coffee orders',
    levels: [5, 10, 20, 30, 50],
    compute: (visits) => new Set(visits.map(v => v.coffee_order).filter(Boolean)).size,
  },

  // Sports
  {
    id: 'game-day-regular',
    category: 'Sports',
    icon: '🏟️',
    name: 'Game Day Regular',
    description: 'Coffee on game days',
    levels: [3, 5, 10, 25, 50],
    compute: (visits) => visits.filter(v => v.sport).length,
  },
  {
    id: 'conference-tour',
    category: 'Sports',
    icon: '🏀',
    name: 'Conference Tour',
    description: 'Coffee for different opponents',
    levels: [3, 5, 8, 12, 20],
    compute: (visits) => new Set(visits.map(v => v.opponent).filter(Boolean)).size,
  },

  // Seasonal
  {
    id: 'weekend-warrior',
    category: 'Seasonal',
    icon: '🌅',
    name: 'Weekend Warrior',
    description: 'Visit on weekends',
    levels: [3, 5, 10, 25, 50],
    compute: (visits) => visits.filter(v => { const d = new Date(v.date).getDay(); return d === 0 || d === 6; }).length,
  },
  {
    id: 'photo-journal',
    category: 'Seasonal',
    icon: '📸',
    name: 'Photo Journal',
    description: 'Add photos to your visits',
    levels: [1, 5, 10, 25, 50],
    compute: (visits) => visits.filter(v => v.photo_url).length,
  },
];

export { BADGE_DEFS };

// ── Computation ──────────────────────────────────────────────────────────────

/**
 * Compute all badge states from visits.
 * Returns array of { ...badgeDef, level: 0-5, tier, tierColors, progress, currentValue, nextThreshold }
 */
export function computeBadges(visits) {
  return BADGE_DEFS.map(def => {
    const value = def.compute(visits);
    let level = 0;
    for (let i = 0; i < def.levels.length; i++) {
      if (value >= def.levels[i]) level = i + 1;
    }

    const tier = level > 0 ? TIERS[level - 1] : null;
    const tierColors = tier ? TIER_COLORS[tier] : null;
    const nextThreshold = level < def.levels.length ? def.levels[level] : null;
    const prevThreshold = level > 0 ? def.levels[level - 1] : 0;
    const progress = nextThreshold
      ? Math.min(1, (value - prevThreshold) / (nextThreshold - prevThreshold))
      : 1;

    return {
      ...def,
      level,
      tier,
      tierColors,
      progress,
      currentValue: value,
      nextThreshold,
    };
  });
}

/**
 * Get badges grouped by category.
 */
export function badgesByCategory(badges) {
  const groups = {};
  for (const b of badges) {
    if (!groups[b.category]) groups[b.category] = [];
    groups[b.category].push(b);
  }
  return groups;
}

/**
 * Detect newly earned badges by comparing old and new badge arrays.
 * Returns array of badges that increased in level.
 */
export function detectNewBadges(oldBadges, newBadges) {
  if (!oldBadges || !oldBadges.length) return [];
  const oldMap = {};
  for (const b of oldBadges) oldMap[b.id] = b.level;

  return newBadges.filter(b => b.level > (oldMap[b.id] || 0));
}
