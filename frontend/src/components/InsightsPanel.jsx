import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  detectStreak, personalBests, milestones,
  leaderboard, sportDayAnalysis,
  rollingAverage, monthlyFrequency, ratingDistribution,
  cityStats, dayOfWeekPatterns, trendComparison,
} from '../utils/insights';
import { getRatingColor, getCompositeColor } from '../utils/colors';

// Chart colors that work in both light and dark mode
const VIBE_COLOR = '#f59e0b';   // amber-500
const COFFEE_COLOR = '#8b5cf6'; // violet-500
const BAR_COLOR = '#78716c';    // stone-500

export default function InsightsPanel({ visits }) {
  const [activeSection, setActiveSection] = useState('streaks');

  const sorted = useMemo(
    () => [...visits].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [visits]
  );

  // ── Streaks & Milestones ──
  const vibeStreak = useMemo(() => detectStreak(sorted, v => v.vibe_rating, 8), [sorted]);
  const compositeStreak = useMemo(() => detectStreak(sorted, v => v.composite_score, 16), [sorted]);
  const bests = useMemo(() => personalBests(sorted), [sorted]);
  const badges = useMemo(() => milestones(sorted), [sorted]);

  // ── Leaderboards ──
  const topShops = useMemo(() => leaderboard(visits, v => v.coffee_shop_name, 2).slice(0, 10), [visits]);
  const topCities = useMemo(() => leaderboard(visits, v => v.city, 2).slice(0, 10), [visits]);
  const topOrders = useMemo(() => leaderboard(visits, v => v.coffee_order, 2).slice(0, 10), [visits]);
  const sportDay = useMemo(() => sportDayAnalysis(visits), [visits]);

  // ── Trends ──
  const rolling = useMemo(() => rollingAverage(visits, 5), [visits]);
  const monthly = useMemo(() => monthlyFrequency(visits), [visits]);
  const vibeDist = useMemo(() => ratingDistribution(visits, v => v.vibe_rating), [visits]);
  const coffeeDist = useMemo(() => ratingDistribution(visits, v => v.coffee_rating), [visits]);

  // ── Deep Dives ──
  const cities = useMemo(() => cityStats(visits), [visits]);
  const dowPatterns = useMemo(() => dayOfWeekPatterns(visits), [visits]);
  const trend = useMemo(() => trendComparison(visits), [visits]);

  if (!visits.length) {
    return (
      <div className="text-center py-16 text-stone-400 dark:text-stone-500">
        <svg className="w-10 h-10 mx-auto mb-3 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-lg font-medium">No visits yet</p>
        <p className="text-sm mt-1">Add some visits to unlock insights.</p>
      </div>
    );
  }

  const sections = [
    { id: 'streaks', label: 'Streaks' },
    { id: 'leaders', label: 'Leaders' },
    { id: 'trends', label: 'Trends' },
    { id: 'dives', label: 'Deep Dives' },
  ];

  return (
    <div className="space-y-6">
      {/* Section tabs */}
      <div className="flex rounded-xl border border-stone-300 dark:border-stone-600 overflow-hidden">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors border-r last:border-r-0 border-stone-300 dark:border-stone-600 ${
              activeSection === s.id
                ? 'bg-stone-800 dark:bg-stone-700 text-stone-50'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'streaks' && (
        <StreaksSection
          vibeStreak={vibeStreak}
          compositeStreak={compositeStreak}
          bests={bests}
          badges={badges}
        />
      )}

      {activeSection === 'leaders' && (
        <LeaderboardsSection
          topShops={topShops}
          topCities={topCities}
          topOrders={topOrders}
          sportDay={sportDay}
        />
      )}

      {activeSection === 'trends' && (
        <TrendsSection
          rolling={rolling}
          monthly={monthly}
          vibeDist={vibeDist}
          coffeeDist={coffeeDist}
        />
      )}

      {activeSection === 'dives' && (
        <DeepDivesSection
          cities={cities}
          dowPatterns={dowPatterns}
          trend={trend}
          sportDay={sportDay}
        />
      )}
    </div>
  );
}

// ── Section Components ──────────────────────────────────────────────────────

function StreaksSection({ vibeStreak, compositeStreak, bests, badges }) {
  return (
    <div className="space-y-4">
      {/* Active Streaks */}
      <SectionCard title="Active Streaks">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StreakCard
            label="Vibe 8+"
            current={vibeStreak.current.length}
            longest={vibeStreak.longest.length}
            emoji="🔥"
          />
          <StreakCard
            label="Composite 16+"
            current={compositeStreak.current.length}
            longest={compositeStreak.longest.length}
            emoji="⚡"
          />
        </div>
      </SectionCard>

      {/* Personal Bests */}
      {bests && (
        <SectionCard title="Personal Bests">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <BestCard label="Best Vibe" value={bests.bestVibe.vibe_rating.toFixed(1)} shop={bests.bestVibe.coffee_shop_name} color={getRatingColor(bests.bestVibe.vibe_rating)} />
            <BestCard label="Best Coffee" value={bests.bestCoffee.coffee_rating.toFixed(1)} shop={bests.bestCoffee.coffee_shop_name} color={getRatingColor(bests.bestCoffee.coffee_rating)} />
            <BestCard label="Best Overall" value={bests.bestComposite.composite_score.toFixed(1)} subtitle="/20" shop={bests.bestComposite.coffee_shop_name} color={getCompositeColor(bests.bestComposite.composite_score)} />
            <BestCard label="Worst Overall" value={bests.worstComposite.composite_score.toFixed(1)} subtitle="/20" shop={bests.worstComposite.coffee_shop_name} color={getCompositeColor(bests.worstComposite.composite_score)} />
          </div>
        </SectionCard>
      )}

      {/* Milestones */}
      {badges.length > 0 && (
        <SectionCard title="Milestones">
          <div className="flex flex-wrap gap-2">
            {badges.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50">
                {b.icon} {b.text}
              </span>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function LeaderboardsSection({ topShops, topCities, topOrders, sportDay }) {
  return (
    <div className="space-y-4">
      <LeaderboardCard title="Top Coffee Shops" items={topShops} />
      <LeaderboardCard title="Top Cities" items={topCities} />
      <LeaderboardCard title="Top Orders" items={topOrders} />

      {sportDay && (
        <SectionCard title="Game Day Effect">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatBlock
              label="Game Days"
              value={sportDay.gameDay.avgVibe}
              subtitle={`${sportDay.gameDay.count} visits · avg composite ${sportDay.gameDay.avgComposite}`}
            />
            <StatBlock
              label="Non-Game Days"
              value={sportDay.nonGameDay.avgVibe}
              subtitle={`${sportDay.nonGameDay.count} visits · avg composite ${sportDay.nonGameDay.avgComposite}`}
            />
          </div>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
            {sportDay.vibeDelta > 0
              ? `Vibe ratings are ${sportDay.vibeDelta} higher on game days`
              : sportDay.vibeDelta < 0
              ? `Vibe ratings are ${Math.abs(sportDay.vibeDelta)} lower on game days`
              : 'No difference between game and non-game days'}
          </p>
        </SectionCard>
      )}
    </div>
  );
}

function TrendsSection({ rolling, monthly, vibeDist, coffeeDist }) {
  const [distMode, setDistMode] = useState('vibe');
  const activeDist = distMode === 'vibe' ? vibeDist : coffeeDist;

  return (
    <div className="space-y-4">
      {/* Rolling Average */}
      {rolling.length >= 3 && (
        <SectionCard title="Rating Trend" subtitle="5-visit rolling average">
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rolling} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-700" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  className="fill-stone-500 dark:fill-stone-400"
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 11 }}
                  className="fill-stone-500 dark:fill-stone-400"
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', fontSize: 13 }}
                  wrapperClassName="!bg-white dark:!bg-stone-800 shadow-lg !border !border-stone-200 dark:!border-stone-700 !rounded-xl"
                />
                <Line type="monotone" dataKey="vibe" stroke={VIBE_COLOR} strokeWidth={2} dot={false} name="Vibe" />
                <Line type="monotone" dataKey="coffee" stroke={COFFEE_COLOR} strokeWidth={2} dot={false} name="Coffee" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: VIBE_COLOR }} /> Vibe</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: COFFEE_COLOR }} /> Coffee</span>
          </div>
        </SectionCard>
      )}

      {/* Monthly Frequency */}
      {monthly.length >= 2 && (
        <SectionCard title="Visit Frequency" subtitle="Visits per month">
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-700" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-stone-500 dark:fill-stone-400" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-stone-500 dark:fill-stone-400" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', fontSize: 13 }}
                  wrapperClassName="!bg-white dark:!bg-stone-800 shadow-lg !border !border-stone-200 dark:!border-stone-700 !rounded-xl"
                />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} name="Visits" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {/* Rating Distribution */}
      <SectionCard title="Rating Distribution">
        <div className="flex gap-2 mb-3">
          {['vibe', 'coffee'].map(m => (
            <button
              key={m}
              onClick={() => setDistMode(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                distMode === m
                  ? 'bg-stone-800 dark:bg-stone-600 text-stone-50'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
              }`}
            >
              {m === 'vibe' ? 'Vibe' : 'Coffee'}
            </button>
          ))}
        </div>
        <div className="h-44 sm:h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeDist} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-700" />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} className="fill-stone-500 dark:fill-stone-400" interval={1} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-stone-500 dark:fill-stone-400" />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', fontSize: 13 }}
                wrapperClassName="!bg-white dark:!bg-stone-800 shadow-lg !border !border-stone-200 dark:!border-stone-700 !rounded-xl"
              />
              <Bar dataKey="count" fill={distMode === 'vibe' ? VIBE_COLOR : COFFEE_COLOR} radius={[4, 4, 0, 0]} name="Visits" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}

function DeepDivesSection({ cities, dowPatterns, trend, sportDay }) {
  return (
    <div className="space-y-4">
      {/* Getting Pickier? */}
      {trend && (
        <SectionCard title="Getting Pickier?" subtitle="First half vs second half of visits">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-stone-50 dark:bg-stone-700/40 p-3 sm:p-4">
              <p className="text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500 font-semibold mb-1">First {trend.firstHalf.count} visits</p>
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{trend.firstHalf.avgComposite}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">avg composite</p>
            </div>
            <div className="rounded-xl bg-stone-50 dark:bg-stone-700/40 p-3 sm:p-4">
              <p className="text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500 font-semibold mb-1">Last {trend.secondHalf.count} visits</p>
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{trend.secondHalf.avgComposite}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">avg composite</p>
            </div>
          </div>
          {(() => {
            const delta = +(trend.secondHalf.avgComposite - trend.firstHalf.avgComposite).toFixed(1);
            if (delta === 0) return <p className="mt-3 text-sm text-stone-500">Ratings have stayed consistent.</p>;
            return (
              <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
                {delta > 0
                  ? `Standards rising — composite up ${delta} in recent visits`
                  : `Getting pickier — composite down ${Math.abs(delta)} in recent visits`}
              </p>
            );
          })()}
        </SectionCard>
      )}

      {/* Day of Week */}
      {dowPatterns.length >= 3 && (
        <SectionCard title="Day of Week" subtitle="Average vibe by day">
          <div className="h-44 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dowPatterns} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-700" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-stone-500 dark:fill-stone-400" />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="fill-stone-500 dark:fill-stone-400" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', fontSize: 13 }}
                  wrapperClassName="!bg-white dark:!bg-stone-800 shadow-lg !border !border-stone-200 dark:!border-stone-700 !rounded-xl"
                />
                <Bar dataKey="avgVibe" fill={VIBE_COLOR} radius={[4, 4, 0, 0]} name="Avg Vibe" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {(() => {
            const best = [...dowPatterns].sort((a, b) => b.avgVibe - a.avgVibe)[0];
            if (!best) return null;
            return (
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                Best vibes on <span className="font-semibold">{best.day}s</span> ({best.avgVibe} avg, {best.count} visits)
              </p>
            );
          })()}
        </SectionCard>
      )}

      {/* City Cards */}
      {cities.length > 0 && (
        <SectionCard title="City Breakdown">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cities.slice(0, 8).map(c => (
              <div key={c.city} className="rounded-xl border border-stone-200 dark:border-stone-600 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-bold text-stone-900 dark:text-stone-100">{c.city}</h4>
                  <span className="text-lg font-black text-stone-900 dark:text-stone-100">{c.avgComposite}</span>
                </div>
                <div className="space-y-1 text-xs text-stone-500 dark:text-stone-400">
                  <p>{c.count} visits · {c.shops} shops</p>
                  <p>Vibe {c.avgVibe} · Coffee {c.avgCoffee}</p>
                  {c.topOrder && <p>Top order: {c.topOrder}</p>}
                  <p className="text-[11px]">Best: {c.bestVisit.coffee_shop_name} ({c.bestVisit.composite_score.toFixed(1)})</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ── Shared Sub-Components ───────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-600/60 rounded-2xl p-4 sm:p-5 shadow-sm">
      <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{title}</h3>
      {subtitle && <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

function StreakCard({ label, current, longest, emoji }) {
  return (
    <div className="rounded-xl bg-stone-50 dark:bg-stone-700/40 p-4">
      <p className="text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500 font-semibold">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-3xl font-black text-stone-900 dark:text-stone-100">
          {current || 0}
        </span>
        {current >= 3 && <span className="text-lg">{emoji}</span>}
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
        {current > 0 ? 'active now' : 'no active streak'} · best: {longest}
      </p>
    </div>
  );
}

function BestCard({ label, value, subtitle, shop, color }) {
  return (
    <div className="rounded-xl bg-stone-50 dark:bg-stone-700/40 p-3 sm:p-4">
      <p className="text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500 font-semibold">{label}</p>
      <p className="text-2xl font-black mt-1" style={{ color }}>
        {value}<span className="text-sm font-semibold text-stone-400 dark:text-stone-500">{subtitle}</span>
      </p>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">{shop}</p>
    </div>
  );
}

function LeaderboardCard({ title, items }) {
  if (!items.length) return null;

  const maxComposite = items[0]?.avgComposite || 1;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <SectionCard title={title}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.key} className="flex items-center gap-3">
            <span className="w-6 text-center text-sm shrink-0">
              {i < 3 ? medals[i] : <span className="text-xs text-stone-400 dark:text-stone-500 font-semibold">{i + 1}</span>}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{item.key}</span>
                <span className="text-sm font-bold text-stone-700 dark:text-stone-200 shrink-0">{item.avgComposite}</span>
              </div>
              <div className="h-1.5 rounded-full bg-stone-100 dark:bg-stone-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(item.avgComposite / maxComposite) * 100}%`,
                    backgroundColor: getCompositeColor(item.avgComposite),
                  }}
                />
              </div>
              <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">{item.count} visits · vibe {item.avgVibe} · coffee {item.avgCoffee}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function StatBlock({ label, value, subtitle }) {
  return (
    <div className="rounded-xl bg-stone-50 dark:bg-stone-700/40 p-4">
      <p className="text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500 font-semibold">{label}</p>
      <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">{value}</p>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{subtitle}</p>
    </div>
  );
}
