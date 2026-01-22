import { useState } from 'react';
import RatingBadge from './RatingBadge';
import CompositeBadge from './CompositeBadge';

export default function VisitCard({ visit, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  const formattedDate = new Date(visit.date).toLocaleDateString('en-US', {
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
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left side: Shop info */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{visit.coffee_shop_name}</h3>
              {visit.city && (
                <p className="text-sm text-gray-600 mt-1 font-medium">{visit.city}</p>
              )}
            </div>
            <div className="relative ml-4">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-gray-500 hover:text-gray-700 p-1"
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
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-20 border border-gray-200">
                    <button
                      onClick={() => {
                        onEdit(visit);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 mt-3">
            <div className="flex items-center text-sm">
              <span className="text-gray-500 font-medium w-20">Date:</span>
              <span className="text-gray-900">{formattedDate}</span>
            </div>

            {visit.coffee_order && (
              <div className="flex items-center text-sm">
                <span className="text-gray-500 font-medium w-20">Order:</span>
                <span className="text-gray-900">{visit.coffee_order}</span>
              </div>
            )}

            {visit.notes && (
              <div className="flex text-sm mt-2">
                <span className="text-gray-500 font-medium w-20">Notes:</span>
                <span className="text-gray-700 italic">{visit.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Ratings */}
        <div className="flex items-center gap-4 md:gap-6 justify-center md:justify-end">
          <RatingBadge rating={visit.vibe_rating} label="Vibe" />
          <RatingBadge rating={visit.coffee_rating} label="Coffee" />
          <div className="hidden md:block w-px h-20 bg-gray-200" />
          <CompositeBadge composite={visit.composite_score} />
        </div>
      </div>
    </div>
  );
}
