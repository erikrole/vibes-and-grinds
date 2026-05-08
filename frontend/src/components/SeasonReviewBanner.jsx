import { getCurrentSeason } from '../utils/yearReview';

export default function SeasonReviewBanner({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="w-full mb-6 group text-left transition-all relative overflow-hidden rounded-[28px] p-6 sm:p-7"
      style={{
        background: 'linear-gradient(135deg, var(--ink) 0%, #2a2018 60%, var(--accent) 130%)',
        color: 'var(--paper)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.06) inset, 0 14px 36px -16px rgba(217, 111, 46, 0.35)',
      }}
    >
      <div className="flex items-center justify-between gap-3 relative">
        <div>
          <p className="text-xl sm:text-2xl font-semibold tracking-tight">
            {getCurrentSeason()} season review
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 group-hover:bg-white/20 group-hover:translate-x-1 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </button>
  );
}
