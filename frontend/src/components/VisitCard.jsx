import { useState } from 'react';
import RatingBadge from './RatingBadge';
import CompositeBadge from './CompositeBadge';

export default function VisitCard({ visit, onEdit, onDelete, onViewDetails }) {
  const [showMenu, setShowMenu] = useState(false);

  // Format date - parse manually to avoid timezone issues
  const [year, month, day] = visit.date.split('-');
  const formattedDate = new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the visit to ${visit.coffee_shop_name}?`)) {
      onDelete(visit.id);
    }
    setShowMenu(false);
  };

  // Build the description line
  const buildDescription = () => {
    const parts = [];

    if (visit.city) {
      parts.push(visit.city);
    }

    if (visit.sport || visit.opponent) {
      let matchupText = 'for the';
      if (visit.sport) matchupText += ` ${visit.sport}`;
      matchupText += ' matchup';
      if (visit.opponent) matchupText += ` against ${visit.opponent}`;
      parts.push(matchupText);
    }

    return parts.join(' ');
  };

  const description = buildDescription();

  return (
    <div
      className="bg-white dark:bg-stone-800 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-stone-100 dark:border-stone-700"
      onClick={() => onViewDetails(visit)}
    >
      {/* Photo Section */}
      <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-700 overflow-hidden">
        {visit.photo_url ? (
          <img
            src={visit.photo_url}
            alt={visit.coffee_shop_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-16 h-16 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* 3-dot menu */}
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-stone-800 rounded-xl shadow-xl z-20 border border-stone-200 dark:border-stone-700 overflow-hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(visit);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Coffee Shop Name */}
        <h3 className="text-2xl font-semibold text-stone-900 dark:text-stone-50 mb-2 leading-tight">
          {visit.coffee_shop_name}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed mb-6 min-h-[2.5rem]">
            {description}
          </p>
        )}

        {/* Date */}
        <p className="text-xs text-stone-500 dark:text-stone-500 mb-4 font-medium tracking-wide">
          {formattedDate}
        </p>

        {/* Ratings Row */}
        <div className="flex items-center gap-3 pt-4 border-t border-stone-100 dark:border-stone-700">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-50">{visit.vibe_rating}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-50">{visit.coffee_rating}</span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-50">{visit.composite_score}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
