import { useEffect, useRef, useState } from 'react';
import RatingBadge from './RatingBadge';
import CompositeBadge from './CompositeBadge';
import { formatDate, getRelativeLabel } from '../utils/dates';
import { formatEventContext, titleCaseOrder } from '../utils/display';

export default function VisitCard({ visit, onEdit, onDelete, onViewDetails, onLogReturnVisit, visitCount = 1 }) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const menuRef = useRef(null);

  const formattedDate = formatDate(visit.date);
  const relativeLabel = getRelativeLabel(visit.date);

  useEffect(() => {
    if (!showMenu) {
      setConfirmingDelete(false);
      return;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowMenu(false);
      }
    };

    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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
    <article className="visit-row group p-5 sm:px-6 sm:py-5 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left side: Photo + Shop info */}
        <div className="flex-1 flex gap-5 min-w-0">
          {visit.photo_url && (
            <div className="hidden sm:block flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-700">
              <img
                src={visit.photo_url}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="mb-1.5">
                <button
                  type="button"
                  onClick={() => onViewDetails(visit)}
                  className="text-left text-xl sm:text-2xl md:text-[1.65rem] leading-tight hover:underline decoration-1 underline-offset-4"
                style={{
                  fontFamily: 'Fraunces, Georgia, serif',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                }}
                >
                  {visit.coffee_shop_name}
                </button>
              </h3>
              {(visit.city || formatEventContext(visit)) && (
                <p className="text-sm text-stone-500 dark:text-stone-400 transition-colors flex items-center gap-1.5 flex-wrap">
                  {visit.city && <span>{visit.city}</span>}
                  {visit.city && formatEventContext(visit) && <span className="text-stone-300 dark:text-stone-600">·</span>}
                  {formatEventContext(visit) && <span>{formatEventContext(visit)}</span>}
                </p>
              )}
              {visitCount > 1 && (
                <span className="regular-note">Visited {visitCount} times</span>
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLogReturnVisit?.(visit);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors border-b border-stone-100 dark:border-stone-700"
                    role="menuitem"
                  >
                    Log Return Visit
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

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-stone-600 dark:text-stone-300 mt-3">
            <span className="inline-flex items-center gap-1.5">
              {relativeLabel ? (
                <>
                  <span className="font-medium" style={{ color: 'var(--ink)' }}>{relativeLabel}</span>
                  <span className="text-stone-400 dark:text-stone-500">{formattedDate}</span>
                </>
              ) : (
                <span>{formattedDate}</span>
              )}
            </span>
            {visit.coffee_order && (
              <>
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span>{titleCaseOrder(visit.coffee_order)}</span>
              </>
            )}
          </div>
          </div>
        </div>

        {/* Right side: Ratings */}
        <div className="flex items-end gap-2 justify-center md:justify-end mt-3 md:mt-0 pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-stone-200/40 dark:border-stone-600/30 transition-colors">
          <RatingBadge rating={visit.vibe_rating} label="Vibe" />
          <RatingBadge rating={visit.coffee_rating} label="Coffee" />
          <CompositeBadge composite={visit.composite_score} />
        </div>
      </div>
    </article>
  );
}
