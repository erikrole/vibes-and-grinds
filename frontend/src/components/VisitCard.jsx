import RatingBadge from './RatingBadge';
import CompositeBadge from './CompositeBadge';

export default function VisitCard({ visit }) {
  const formattedDate = new Date(visit.date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

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
              {visit.coffee_shop_address && (
                <p className="text-sm text-gray-500 mt-1">{visit.coffee_shop_address}</p>
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
