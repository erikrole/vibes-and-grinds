import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeSeasonReview, getAvailableSeasons } from '../utils/yearReview';
import { getCompositeColor, getRatingColor } from '../utils/colors';

// Gradient palettes per slide for visual variety
const SLIDE_GRADIENTS = [
  ['#1c1917', '#292524'], // stone dark
  ['#7c2d12', '#431407'], // warm amber-dark
  ['#1e3a5f', '#0f172a'], // navy
  ['#4a1942', '#1a0a1a'], // purple
  ['#1c4532', '#0a2e1a'], // forest
  ['#78350f', '#451a03'], // copper
  ['#1e293b', '#0f172a'], // slate
  ['#3b0764', '#1e0533'], // violet
  ['#713f12', '#422006'], // gold
  ['#1c1917', '#0c0a09'], // dark stone
];

export default function YearInReview({ visits, onClose }) {
  const seasons = useMemo(() => getAvailableSeasons(visits), [visits]);
  const [selectedSeason, setSelectedSeason] = useState(seasons[0] || null);
  const review = useMemo(() => selectedSeason ? computeSeasonReview(visits, selectedSeason) : null, [visits, selectedSeason]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const slides = useMemo(() => {
    if (!review) return [];
    const s = [];

    // 1. Title
    s.push({ id: 'title', type: 'title' });
    // 2. Top shop
    s.push({ id: 'top-shop', type: 'top-shop' });
    // 3. Best moment
    if (review.bestVisit) s.push({ id: 'best-moment', type: 'best-moment' });
    // 4. Persona
    s.push({ id: 'persona', type: 'persona' });
    // 5. By the numbers
    s.push({ id: 'numbers', type: 'numbers' });
    // 6. Ratings
    s.push({ id: 'ratings', type: 'ratings' });
    // 7. Monthly
    s.push({ id: 'monthly', type: 'monthly' });
    // 8. Top order
    if (review.topOrder) s.push({ id: 'top-order', type: 'top-order' });
    // 9. Closing
    s.push({ id: 'closing', type: 'closing' });

    return s;
  }, [review]);

  const goNext = useCallback(() => {
    if (currentSlide < slides.length - 1 && !isAnimating) {
      setIsAnimating(true);
      setCurrentSlide(prev => prev + 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [currentSlide, slides.length, isAnimating]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0 && !isAnimating) {
      setIsAnimating(true);
      setCurrentSlide(prev => prev - 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [currentSlide, isAnimating]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goNext, goPrev]);

  if (!review) {
    return (
      <div className="fixed inset-0 z-[1005] bg-stone-900 flex items-center justify-center">
        <div className="text-center text-stone-400">
          <p className="text-xl font-bold mb-2">{selectedSeason ? `No visits in the ${selectedSeason} season` : 'No season data available'}</p>
          <button onClick={onClose} className="text-sm underline">Close</button>
        </div>
      </div>
    );
  }

  const gradient = SLIDE_GRADIENTS[currentSlide % SLIDE_GRADIENTS.length];
  const slide = slides[currentSlide];

  return (
    <div
      className="fixed inset-0 z-[1005] flex flex-col overflow-hidden transition-colors duration-500"
      style={{ background: `linear-gradient(180deg, ${gradient[0]}, ${gradient[1]})` }}
    >
      {/* Progress dots */}
      <div className="flex gap-1 px-4 pt-4 safe-top">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i <= currentSlide ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>

      {/* Close + year selector */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex gap-2">
          {seasons.map(s => (
            <button
              key={s}
              onClick={() => { setSelectedSeason(s); setCurrentSlide(0); }}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                s === selectedSeason ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12">
        <div className="w-full max-w-lg animate-fade-in" key={slide.id + currentSlide}>
          {slide.type === 'title' && <TitleSlide review={review} />}
          {slide.type === 'top-shop' && <TopShopSlide review={review} />}
          {slide.type === 'best-moment' && <BestMomentSlide review={review} />}
          {slide.type === 'persona' && <PersonaSlide review={review} />}
          {slide.type === 'numbers' && <NumbersSlide review={review} />}
          {slide.type === 'ratings' && <RatingsSlide review={review} />}
          {slide.type === 'monthly' && <MonthlySlide review={review} />}
          {slide.type === 'top-order' && <TopOrderSlide review={review} />}
          {slide.type === 'closing' && <ClosingSlide review={review} />}
        </div>
      </div>

      {/* Tap zones */}
      <div className="absolute inset-0 flex" style={{ top: 80 }}>
        <button className="flex-1 opacity-0" onClick={goPrev} aria-label="Previous" />
        <button className="flex-[2] opacity-0" onClick={goNext} aria-label="Next" />
      </div>

      {/* Nav hint */}
      <div className="text-center pb-6 text-white/30 text-xs safe-bottom">
        Tap to continue · {currentSlide + 1}/{slides.length}
      </div>
    </div>
  );
}

// ── Slide Components ─────────────────────────────────────────────────────────

function TitleSlide({ review }) {
  return (
    <div className="text-center">
      <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-4">Your Season in Coffee</p>
      <p className="text-6xl sm:text-8xl font-black text-white mb-6">{review.season}</p>
      <p className="text-2xl text-white/80 font-medium">
        {review.totalVisits} visit{review.totalVisits !== 1 ? 's' : ''} logged
      </p>
      <p className="text-white/40 mt-2">{review.uniqueShops} shops · {review.uniqueCities} cities</p>
    </div>
  );
}

function TopShopSlide({ review }) {
  return (
    <div className="text-center">
      <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-6">Your Top Spot</p>
      <p className="text-5xl sm:text-6xl font-black text-white mb-4 leading-tight">{review.mostVisitedShop.name}</p>
      <p className="text-3xl text-amber-400 font-bold">{review.mostVisitedShop.count} visits</p>
      <p className="text-white/40 mt-3">
        {review.mostVisitedShop.count === 1
          ? 'Every shop was a new discovery'
          : `That's ${Math.round(review.mostVisitedShop.count / review.totalVisits * 100)}% of all your visits`
        }
      </p>
    </div>
  );
}

function BestMomentSlide({ review }) {
  const v = review.bestVisit;
  return (
    <div className="text-center">
      <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-6">Your Best Moment</p>
      {v.photo_url && (
        <div className="w-48 h-48 mx-auto rounded-2xl overflow-hidden mb-6 shadow-2xl">
          <img src={v.photo_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <p className="text-3xl sm:text-4xl font-black text-white mb-2">{v.coffee_shop_name}</p>
      <div className="flex items-center justify-center gap-4 mt-4">
        <RatingBubble label="Vibe" value={v.vibe_rating} color={getRatingColor(v.vibe_rating)} />
        <RatingBubble label="Coffee" value={v.coffee_rating} color={getRatingColor(v.coffee_rating)} />
        <RatingBubble label="Total" value={v.composite_score} color={getCompositeColor(v.composite_score)} isComposite />
      </div>
      <p className="text-white/40 mt-4 text-sm">
        {new Date(v.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        {v.city ? ` · ${v.city}` : ''}
      </p>
    </div>
  );
}

function PersonaSlide({ review }) {
  return (
    <div className="text-center">
      <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-6">Your Coffee Persona</p>
      <p className="text-8xl mb-6">{review.persona.emoji}</p>
      <p className="text-4xl sm:text-5xl font-black text-white mb-4">{review.persona.name}</p>
      <p className="text-lg text-white/70 leading-relaxed">{review.persona.description}</p>
    </div>
  );
}

function NumbersSlide({ review }) {
  const stats = [
    { label: 'Visits', value: review.totalVisits },
    { label: 'Shops', value: review.uniqueShops },
    { label: 'Cities', value: review.uniqueCities },
    { label: 'Orders', value: review.uniqueOrders },
  ];

  return (
    <div className="text-center">
      <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-8">By the Numbers</p>
      <div className="grid grid-cols-2 gap-6">
        {stats.map(s => (
          <div key={s.label}>
            <p className="text-5xl font-black text-white">{s.value}</p>
            <p className="text-white/50 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      {review.totalPhotos > 0 && (
        <p className="text-white/40 mt-6 text-sm">{review.totalPhotos} photos captured</p>
      )}
    </div>
  );
}

function RatingsSlide({ review }) {
  return (
    <div className="text-center">
      <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-8">Your Ratings</p>
      <div className="flex items-center justify-center gap-8">
        <RatingBubble label="Avg Vibe" value={review.avgVibe} color={getRatingColor(review.avgVibe)} large />
        <RatingBubble label="Avg Coffee" value={review.avgCoffee} color={getRatingColor(review.avgCoffee)} large />
      </div>
      <div className="mt-8">
        <p className="text-5xl font-black text-white">{review.avgComposite}</p>
        <p className="text-white/50 text-sm mt-1">Average Composite / 20</p>
      </div>
      {review.longestStreak > 0 && (
        <p className="text-amber-400 mt-6 text-sm font-semibold">
          Longest 8+ vibe streak: {review.longestStreak} visits
        </p>
      )}
    </div>
  );
}

function MonthlySlide({ review }) {
  const maxCount = Math.max(...review.monthlyBreakdown.map(m => m.count), 1);

  return (
    <div>
      <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-6 text-center">Month by Month</p>
      <div className="flex items-end gap-1.5 h-40 justify-center">
        {review.monthlyBreakdown.map(m => (
          <div key={m.month} className="flex flex-col items-center gap-1 flex-1 max-w-[60px]">
            {m.count > 0 && (
              <span className="text-white text-[10px] font-bold">{m.count}</span>
            )}
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{
                height: `${Math.max(m.count > 0 ? 8 : 2, (m.count / maxCount) * 120)}px`,
                backgroundColor: m.count > 0 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(255,255,255,0.1)',
              }}
            />
            <span className="text-white/40 text-[10px]">{m.month}</span>
          </div>
        ))}
      </div>
      {review.busiestMonth.count > 0 && (
        <p className="text-center text-white/50 text-sm mt-6">
          Busiest month: <span className="text-white font-semibold">{review.busiestMonth.month}</span> ({review.busiestMonth.count} visits)
        </p>
      )}
    </div>
  );
}

function TopOrderSlide({ review }) {
  return (
    <div className="text-center">
      <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-6">Your Go-To Order</p>
      <p className="text-5xl mb-4">☕</p>
      <p className="text-3xl sm:text-4xl font-black text-white mb-3">{review.topOrder.order}</p>
      <p className="text-2xl text-amber-400 font-bold">{review.topOrder.count}x</p>
      <p className="text-white/40 mt-3">
        {review.uniqueOrders > 1
          ? `Out of ${review.uniqueOrders} different orders`
          : 'Your one and only'
        }
      </p>
    </div>
  );
}

function ClosingSlide({ review }) {
  return (
    <div className="text-center">
      <p className="text-6xl mb-6">☕</p>
      <p className="text-3xl sm:text-4xl font-black text-white mb-4">
        Here's to next season
      </p>
      <p className="text-lg text-white/60 leading-relaxed">
        {review.totalVisits} visits, {review.uniqueShops} shops, countless vibes.
      </p>
      <p className="text-white/30 mt-8 text-sm">VIBES & GRINDS</p>
    </div>
  );
}

// ── Shared ───────────────────────────────────────────────────────────────────

function RatingBubble({ label, value, color, large = false, isComposite = false }) {
  const size = large ? 'w-20 h-20' : 'w-14 h-14';
  const textSize = large ? 'text-2xl' : 'text-lg';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${size} rounded-full flex items-center justify-center`} style={{ backgroundColor: color }}>
        <span className={`${textSize} font-black text-white`}>
          {isComposite ? value.toFixed(0) : value.toFixed(1)}
        </span>
      </div>
      <span className="text-white/50 text-xs">{label}</span>
    </div>
  );
}
