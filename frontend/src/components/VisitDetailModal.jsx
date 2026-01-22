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
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="mb-6">
              <h2 className="coffee-shop-name text-4xl mb-3 pr-8">
                {visit.coffee_shop_name}
              </h2>
              {(visit.city || visit.opponent) && (
                <p className="text-lg text-stone-500 tracking-wide font-light">
                  {visit.city}
                  {visit.city && visit.opponent && ' – '}
                  {visit.opponent}
                </p>
              )}
            </div>

            {/* Photo */}
            {visit.photo_url && (
              <div className="mb-6 rounded-lg overflow-hidden">
                <img
                  src={visit.photo_url}
                  alt={visit.coffee_shop_name}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            {/* Visit Stats */}
            <div className="mb-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
              <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wider mb-2">
                Visit Statistics
              </h3>
              <p className="text-stone-700">
                {visitCount === 1 ? (
                  "You've visited here once"
                ) : (
                  <>You've visited here <span className="font-bold">{visitCount} times</span></>
                )}
              </p>
              {visitCount > 1 && (
                <p className="text-sm text-stone-600 mt-1">
                  Average ratings: Vibe {avgVibe.toFixed(1)} • Coffee {avgCoffee.toFixed(1)}
                </p>
              )}
            </div>

            {/* Visit Details */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Date
                </label>
                <p className="text-stone-900">{formattedDate}</p>
              </div>

              {visit.coffee_shop_address && (
                <div>
                  <label className="block text-sm font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    Address
                  </label>
                  <p className="text-stone-900">{visit.coffee_shop_address}</p>
                </div>
              )}

              {visit.coffee_order && (
                <div>
                  <label className="block text-sm font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    Order
                  </label>
                  <p className="text-stone-900">{visit.coffee_order}</p>
                </div>
              )}

              {visit.notes && (
                <div>
                  <label className="block text-sm font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    Notes
                  </label>
                  <p className="text-stone-900 whitespace-pre-wrap">{visit.notes}</p>
                </div>
              )}
            </div>

            {/* Ratings */}
            <div className="flex gap-4 justify-center pt-4 border-t border-stone-200">
              <RatingBadge rating={visit.vibe_rating} label="Vibe" />
              <RatingBadge rating={visit.coffee_rating} label="Coffee" />
              <CompositeBadge composite={visit.composite_score} />
            </div>

            {/* Map Placeholder */}
            <div className="mt-6 p-8 bg-stone-100 rounded-lg border-2 border-dashed border-stone-300 text-center">
              <p className="text-stone-500 text-sm">📍 Map coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
