import { useMemo, useState } from 'react';
import { computeBadges, badgesByCategory, TIERS, TIER_COLORS } from '../utils/badges';

export default function BadgesPanel({ visits }) {
  const badges = useMemo(() => computeBadges(visits), [visits]);
  const grouped = useMemo(() => badgesByCategory(badges), [badges]);
  const earned = badges.filter(b => b.level > 0).length;
  const total = badges.length;

  const [expandedCategory, setExpandedCategory] = useState(null);

  const toggleCategory = (cat) => {
    setExpandedCategory(prev => prev === cat ? null : cat);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-600/60 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Badges</h3>
          <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
            {earned}/{total} earned
          </span>
        </div>

        {/* Tier legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {TIERS.map(tier => (
            <span
              key={tier}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold ${TIER_COLORS[tier].bg} ${TIER_COLORS[tier].text} ${TIER_COLORS[tier].border} border`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TIER_COLORS[tier].hex }} />
              {tier}
            </span>
          ))}
        </div>

        {/* Overall progress */}
        <div className="h-2 rounded-full bg-stone-100 dark:bg-stone-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500"
            style={{ width: `${(earned / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Badge categories */}
      {Object.entries(grouped).map(([category, categoryBadges]) => {
        const categoryEarned = categoryBadges.filter(b => b.level > 0).length;
        const isExpanded = expandedCategory === category || expandedCategory === null;

        return (
          <div key={category} className="bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-600/60 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors"
            >
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
                {category}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400 dark:text-stone-500">{categoryEarned}/{categoryBadges.length}</span>
                <svg
                  className={`w-4 h-4 text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categoryBadges.map(badge => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BadgeCard({ badge }) {
  const isEarned = badge.level > 0;

  return (
    <div
      className={`rounded-xl p-3 sm:p-4 border transition-colors ${
        isEarned
          ? `${badge.tierColors.bg} ${badge.tierColors.border}`
          : 'bg-stone-50 dark:bg-stone-700/20 border-stone-200 dark:border-stone-700 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`text-2xl ${isEarned ? '' : 'grayscale'}`}>{badge.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${isEarned ? badge.tierColors.text : 'text-stone-500 dark:text-stone-400'}`}>
              {badge.name}
            </span>
            {isEarned && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${badge.tierColors.bg} ${badge.tierColors.text} border ${badge.tierColors.border}`}
              >
                {badge.tier}
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{badge.description}</p>

          {/* Level indicators */}
          <div className="flex items-center gap-1 mt-2">
            {badge.levels.map((threshold, i) => (
              <div
                key={i}
                className={`w-5 h-1.5 rounded-full transition-colors ${
                  i < badge.level
                    ? ''
                    : 'bg-stone-200 dark:bg-stone-600'
                }`}
                style={i < badge.level ? { backgroundColor: TIER_COLORS[TIERS[i]].hex } : undefined}
                title={`Level ${i + 1}: ${threshold}`}
              />
            ))}
          </div>

          {/* Progress to next level */}
          {badge.nextThreshold && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500">
                <span>{badge.currentValue} / {badge.nextThreshold}</span>
                <span>{Math.round(badge.progress * 100)}%</span>
              </div>
              <div className="h-1 rounded-full bg-stone-200 dark:bg-stone-600 mt-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${badge.progress * 100}%`,
                    backgroundColor: isEarned ? TIER_COLORS[badge.tier].hex : '#a8a29e',
                  }}
                />
              </div>
            </div>
          )}

          {!badge.nextThreshold && isEarned && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-2">MAX LEVEL</p>
          )}
        </div>
      </div>
    </div>
  );
}
