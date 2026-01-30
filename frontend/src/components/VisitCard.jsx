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

  return (
    <div className="card">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left side: Shop info */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3
                onClick={() => onViewDetails(visit)}
                className="coffee-shop-name text-2xl md:text-3xl mb-2 leading-tight cursor-pointer hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
              >
                {visit.coffee_shop_name}
              </h3>
              {(visit.city || visit.opponent) && (
                <p className="text-sm text-stone-500 dark:text-stone-400 tracking-wide font-light transition-colors">
                  {visit.city}
                  {visit.city && visit.opponent && ' – '}
                  {visit.opponent}
                </p>
              )}
            </div>
            <div className="relative ml-4 flex-shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 p-1 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-stone-800 rounded-md shadow-lg z-20 border border-stone-200 dark:border-stone-700 transition-colors">
                    <button
                      onClick={() => {
                        onEdit(visit);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-t-md transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-md transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2.5 mt-4 border-t border-stone-100 dark:border-stone-700 pt-4 transition-colors">
            <div className="flex items-center text-sm">
              <span className="text-stone-500 dark:text-stone-400 font-medium w-24 tracking-wide transition-colors">Date</span>
              <span className="text-stone-900 dark:text-stone-50 transition-colors">{formattedDate}</span>
            </div>

            {visit.coffee_order && (
              <div className="flex items-center text-sm">
                <span className="text-stone-500 dark:text-stone-400 font-medium w-24 tracking-wide transition-colors">Order</span>
                <span className="text-stone-900 dark:text-stone-50 transition-colors">{visit.coffee_order}</span>
              </div>
            )}

            {visit.sport && (
              <div className="flex items-center text-sm">
                <span className="text-stone-500 dark:text-stone-400 font-medium w-24 tracking-wide transition-colors">Sport</span>
                <span className="text-stone-900 dark:text-stone-50 transition-colors">{visit.sport}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Ratings */}
        <div className="flex items-center gap-4 justify-center md:justify-end border-t md:border-t-0 md:border-l border-stone-100 dark:border-stone-700 pt-6 md:pt-0 md:pl-8 transition-colors">
          <RatingBadge rating={visit.vibe_rating} label="Vibe" />
          <RatingBadge rating={visit.coffee_rating} label="Coffee" />
          <div className="hidden md:block w-px h-24 bg-stone-200 dark:bg-stone-700 transition-colors" />
          <CompositeBadge composite={visit.composite_score} />
        </div>
      </div>
    </div>
  );
}
