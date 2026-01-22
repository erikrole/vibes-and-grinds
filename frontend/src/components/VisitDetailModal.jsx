import { useEffect } from 'react';
import RatingBadge from './RatingBadge';
import CompositeBadge from './CompositeBadge';

export default function VisitDetailModal({ visit, visits, onClose }) {
  // Calculate how many times this shop has been visited
  const shopVisits = visits.filter(
    v => v.coffee_shop_name.toLowerCase() === visit.coffee_shop_name.toLowerCase()
  );
  const visitCount = shopVisits.length;

  // Calculate average ratings for this shop
  const avgVibe = shopVisits.reduce((sum, v) => sum + v.vibe_rating, 0) / visitCount;
  const avgCoffee = shopVisits.reduce((sum, v) => sum + v.coffee_rating, 0) / visitCount;
  const avgTotal = shopVisits.reduce((sum, v) => sum + v.composite_score, 0) / visitCount;

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Format date
  const formattedDate = new Date(visit.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors z-10"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-6 sm:p-8">
            {/* Header - Big Title */}
            <h2 className="coffee-shop-name text-4xl md:text-5xl mb-6 pr-8">
              {visit.coffee_shop_name}
            </h2>

            {/* Photo with Notes Overlay */}
            {visit.photo_url && (
              <div className="mb-6 rounded-lg overflow-hidden relative">
                <img
                  src={visit.photo_url}
                  alt={visit.coffee_shop_name}
                  className="w-full h-auto object-cover"
                />
                {visit.notes && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-6 pt-12">
                    <p className="text-white text-lg leading-relaxed">{visit.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Visit Details */}
            <div className="space-y-2 mb-6">
              <p className="text-stone-700">
                <span className="font-semibold">Date:</span> {formattedDate}
              </p>
              {visit.coffee_order && (
                <p className="text-stone-700">
                  <span className="font-semibold">Order:</span> {visit.coffee_order}
                </p>
              )}
              {visit.city && (
                <p className="text-stone-700">
                  <span className="font-semibold">City:</span> {visit.city}
                </p>
              )}
              {visit.opponent && (
                <p className="text-stone-700">
                  <span className="font-semibold">Opponent:</span> {visit.opponent}
                </p>
              )}
              {visit.sport && (
                <p className="text-stone-700">
                  <span className="font-semibold">Sport:</span> {visit.sport}
                </p>
              )}
              {visit.coffee_shop_address && (
                <p className="text-stone-700">
                  <span className="font-semibold">Address:</span> {visit.coffee_shop_address}
                </p>
              )}
              {visit.notes && !visit.photo_url && (
                <p className="text-stone-700 pt-2">
                  <span className="font-semibold">Notes:</span> {visit.notes}
                </p>
              )}
            </div>

            {/* Divider */}
            <hr className="border-stone-300 my-6" />

            {/* Ratings - All same size */}
            <div className="flex gap-4 justify-center mb-6">
              <div className="flex flex-col items-center">
                <span className="text-xs text-stone-500 mb-2 font-medium tracking-widest uppercase">Vibe</span>
                <div
                  className="px-5 py-3 rounded-md font-black text-2xl w-[75px] text-center border border-stone-200 tabular-nums"
                  style={{
                    backgroundColor: getRatingColor(visit.vibe_rating),
                    color: getTextColor(visit.vibe_rating),
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  {visit.vibe_rating.toFixed(1)}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-xs text-stone-500 mb-2 font-medium tracking-widest uppercase">Coffee</span>
                <div
                  className="px-5 py-3 rounded-md font-black text-2xl w-[75px] text-center border border-stone-200 tabular-nums"
                  style={{
                    backgroundColor: getRatingColor(visit.coffee_rating),
                    color: getTextColor(visit.coffee_rating),
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  {visit.coffee_rating.toFixed(1)}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-xs text-stone-500 mb-2 font-medium tracking-widest uppercase">Total</span>
                <div
                  className="px-5 py-3 rounded-md font-black text-2xl w-[75px] text-center border-2 tabular-nums"
                  style={{
                    backgroundColor: getRatingColor(visit.composite_score / 2),
                    color: getTextColor(visit.composite_score / 2),
                    borderColor: `${getRatingColor(visit.composite_score / 2)}dd`,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  {visit.composite_score.toFixed(1)}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions for colors
function getRatingColor(rating) {
  const clampedRating = Math.max(0, Math.min(10, rating));
  if (clampedRating <= 5) {
    const percentage = clampedRating / 5;
    const r = 220;
    const g = Math.round(38 + (184 - 38) * percentage);
    const b = 38;
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const percentage = (clampedRating - 5) / 5;
    const r = Math.round(220 - (220 - 34) * percentage);
    const g = Math.round(184 + (197 - 184) * percentage);
    const b = Math.round(38 + (94 - 38) * percentage);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function getTextColor(rating) {
  return rating >= 7 ? '#1c1917' : '#ffffff';
}
