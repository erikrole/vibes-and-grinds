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
      <div className="bg-surface-raised border border-rule rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-ink">Badges</h3>
          <span className="text-sm font-medium text-ink-soft">
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
        <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${(earned / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Badge categories */}
      {Object.entries(grouped).map(([category, categoryBadges]) => {
        const categoryEarned = categoryBadges.filter(b => b.level > 0).length;
        const isExpanded = expandedCategory === category || expandedCategory === null;

        return (
          <div key={category} className="bg-surface-raised border border-rule rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-surface-muted transition-colors"
            >
              <h4 className="text-sm font-bold text-ink uppercase tracking-wider">
                {category}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-faint">{categoryEarned}/{categoryBadges.length}</span>
                <svg
                  className={`w-4 h-4 text-ink-faint transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
          : 'bg-surface-muted border-rule opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`text-2xl ${isEarned ? '' : 'grayscale'}`}>{badge.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${isEarned ? badge.tierColors.text : 'text-ink-soft'}`}>
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
          <p className="text-xs text-ink-soft mt-0.5">{badge.description}</p>

          {/* Level indicators */}
          <div className="flex items-center gap-1 mt-2">
            {badge.levels.map((threshold, i) => (
              <div
                key={i}
                className={`w-5 h-1.5 rounded-full transition-colors ${
                  i < badge.level
                    ? ''
                    : 'bg-surface-muted'
                }`}
                style={i < badge.level ? { backgroundColor: TIER_COLORS[TIERS[i]].hex } : undefined}
                title={`Level ${i + 1}: ${threshold}`}
              />
            ))}
          </div>

          {/* Progress to next level */}
          {badge.nextThreshold && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-ink-faint">
                <span>{badge.currentValue} / {badge.nextThreshold}</span>
                <span>{Math.round(badge.progress * 100)}%</span>
              </div>
              <div className="h-1 rounded-full bg-surface-muted mt-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${badge.progress * 100}%`,
                    backgroundColor: isEarned ? TIER_COLORS[badge.tier].hex : 'var(--ink-faint)',
                  }}
                />
              </div>
            </div>
          )}

          {!badge.nextThreshold && isEarned && (
            <p className="text-[10px] text-accent font-semibold mt-2">MAX LEVEL</p>
          )}
        </div>
      </div>
    </div>
  );
}
