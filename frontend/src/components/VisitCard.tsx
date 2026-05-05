import { useEffect, useRef, useState } from 'react';
import RatingBadge from './RatingBadge';
import CompositeBadge from './CompositeBadge';
import { formatDate, getRelativeLabel } from '../utils/dates';
import type { Visit } from '../types';

interface Props {
  visit: Visit;
  onEdit: (visit: Visit) => void;
  onDelete: (id: number) => void;
  onViewDetails: (visit: Visit) => void;
  visitCount?: number;
}

export default function VisitCard({ visit, onEdit, onDelete, onViewDetails, visitCount = 1 }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const formattedDate = formatDate(visit.date);
  const relativeLabel = getRelativeLabel(visit.date);

  useEffect(() => {
    if (!showMenu) {
      setConfirmingDelete(false);
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMenu(false);
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [showMenu]);

  return (
    <div className="card group cursor-pointer" onClick={() => onViewDetails(visit)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left side: Photo + Shop info */}
        <div className="flex-1 flex gap-5">
          {visit.photo_url && (
            <div className="hidden sm:block flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-700">
              <img
                src={visit.photo_url}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex-1">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3
                className="coffee-shop-name text-lg sm:text-2xl md:text-3xl mb-2 leading-tight group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors"
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
              {visitCount > 1 && (
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-600">
                  {visitCount} visits
                </span>
              )}
            </div>
            <div className="relative ml-4 flex-shrink-0" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu((prev) => !prev); }}
                className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 p-3 -m-2 rounded-xl transition-colors"
                aria-label={`Open actions for ${visit.coffee_shop_name}`}
                aria-expanded={showMenu}
                aria-haspopup="menu"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {showMenu && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-stone-800 rounded-2xl shadow-xl z-20 border border-stone-200 dark:border-stone-700 overflow-hidden"
                  role="menu"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(visit);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors border-b border-stone-100 dark:border-stone-700"
                    role="menuitem"
                  >
                    Edit Visit
                  </button>
                  {confirmingDelete ? (
                    <div className="px-4 py-3">
                      <p className="text-xs text-stone-500 dark:text-stone-400 mb-2.5">Delete this visit?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(visit.id); setShowMenu(false); }}
                          className="flex-1 text-xs py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false); }}
                          className="flex-1 text-xs py-2 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmingDelete(true); }}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      role="menuitem"
                    >
                      Delete Visit
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2.5 mt-4 border-t border-stone-100 dark:border-stone-700 pt-4 transition-colors">
            <div className="flex items-center text-sm">
              <span className="text-stone-500 dark:text-stone-400 font-medium w-24 tracking-wide transition-colors">Date</span>
              <span className="text-stone-900 dark:text-stone-50 transition-colors">
                {relativeLabel && (
                  <span className="font-semibold mr-1.5">{relativeLabel}</span>
                )}
                {formattedDate}
              </span>
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
        </div>

        {/* Right side: Ratings */}
        <div className="flex items-center gap-4 justify-center md:justify-end mt-4 md:mt-0 pt-4 md:pt-0 md:pl-8 border-t md:border-t-0 md:border-l border-stone-200/60 dark:border-stone-600/40 transition-colors">
          <RatingBadge rating={visit.vibe_rating} label="Vibe" />
          <RatingBadge rating={visit.coffee_rating} label="Coffee" />
          <div className="hidden md:block w-px h-24 bg-stone-200 dark:bg-stone-600 transition-colors" />
          <CompositeBadge composite={visit.composite_score} />
        </div>
      </div>
    </div>
  );
}
