import VisitCard from './VisitCard';
import type { Visit } from '../types';

interface Props {
  visits: Visit[];
  loading: boolean;
  onEdit: (visit: Visit) => void;
  onDelete: (id: number) => void;
  onViewDetails: (visit: Visit) => void;
  onAddVisit?: () => void;
  hasActiveFilters?: boolean;
  shopVisitCounts?: Record<string, number>;
}

export default function VisitList({ visits, loading, onEdit, onDelete, onViewDetails, onAddVisit, hasActiveFilters = false, shopVisitCounts = {} }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="card animate-pulse"
            aria-hidden="true"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 space-y-3">
                <div className="h-7 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/3" />
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-2/3 mt-4" />
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
              </div>
              <div className="flex gap-3">
                <div className="h-20 w-16 bg-stone-200 dark:bg-stone-700 rounded-lg" />
                <div className="h-20 w-16 bg-stone-200 dark:bg-stone-700 rounded-lg" />
                <div className="h-20 w-20 bg-stone-200 dark:bg-stone-700 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-5">{hasActiveFilters ? '🔍' : '☕'}</div>
        <h3 className="text-xl font-semibold text-stone-700 dark:text-stone-300 mb-2">
          {hasActiveFilters ? 'No matching visits' : 'No visits yet'}
        </h3>
        <p className="text-stone-500 dark:text-stone-400 mb-6">
          {hasActiveFilters ? 'Try a different search or remove filters.' : 'Start tracking your coffee shop adventures!'}
        </p>
        {!hasActiveFilters && onAddVisit && (
          <button onClick={onAddVisit} className="btn-primary inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Your First Visit
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visits.map((visit, index) => (
        <div
          key={visit.id}
          className="animate-card-in"
          style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
        >
          <VisitCard
            visit={visit}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewDetails={onViewDetails}
            visitCount={shopVisitCounts[visit.coffee_shop_name.toLowerCase()] || 1}
          />
        </div>
      ))}
    </div>
  );
}
