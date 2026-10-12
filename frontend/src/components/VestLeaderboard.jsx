import { memo, useState } from 'react';
import { formatLocationLabel, outfitSampleNote } from '../utils/vestTrackerMath';
import { Record } from './VestInsights';

function splitCell(record) {
  if (!record?.games) return '—';
  return <Record wins={record.wins} losses={record.losses} />;
}

function streakCell(streak) {
  if (!streak?.current || streak.current.count < 2) {
    return streak?.longestWin >= 2 ? <span className="vp-quiet">best W{streak.longestWin}</span> : '—';
  }
  const { result, count } = streak.current;
  return (
    <span className={result === 'W' ? 'is-win' : 'is-loss'}>
      {result}{count}
      {streak.longestWin >= 2 && result === 'L' ? <span className="vp-quiet"> · best W{streak.longestWin}</span> : null}
    </span>
  );
}

function VestLeaderboard({ briefs, selectedOutfit, onViewOutfit }) {
  const [sortBy, setSortBy] = useState('games');
  const sorted = [...(briefs || [])].sort((a, b) => sortBy === 'rate'
    ? b.winRatePct - a.winRatePct || b.games - a.games
    : b.games - a.games || b.winRatePct - a.winRatePct);

  return (
    <section className="vp-section" aria-labelledby="vest-outfits-heading">
      <div className="vp-section-head">
        <div>
          <h2 id="vest-outfits-heading">Outfit records</h2>
          <p className="vp-section-note">Completed games. Streaks are within that outfit, not the season line.</p>
        </div>
        <div className="vp-sort" role="group" aria-label="Sort outfit records">
          <button type="button" aria-pressed={sortBy === 'games'} onClick={() => setSortBy('games')} className={sortBy === 'games' ? 'is-active' : ''}>Most worn</button>
          <button type="button" aria-pressed={sortBy === 'rate'} onClick={() => setSortBy('rate')} className={sortBy === 'rate' ? 'is-active' : ''}>Win %</button>
        </div>
      </div>
      {!sorted.length ? <p className="vp-section-note">No outfit records yet.</p> : (
        <>
          <div className="vp-table-wrap">
            <table className="vp-table">
              <caption className="sr-only">Outfit records with streaks, location splits, margin, and ranked opponents</caption>
              <thead>
                <tr>
                  <th scope="col">Outfit</th>
                  <th scope="col">Record</th>
                  <th scope="col">Streak</th>
                  <th scope="col">Home</th>
                  <th scope="col">Away</th>
                  <th scope="col">Neutral</th>
                  <th scope="col">Margin</th>
                  <th scope="col">Ranked</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((brief) => {
                  const sampleNote = outfitSampleNote(brief.games);
                  return (
                    <tr key={brief.outfit} className={selectedOutfit === brief.outfit ? 'is-selected' : ''}>
                      <th scope="row">
                        <button type="button" onClick={() => onViewOutfit(brief)}>
                          {brief.outfit}
                          {sampleNote ? <span className="vp-sample">{sampleNote}</span> : null}
                        </button>
                      </th>
                      <td><Record wins={brief.wins} losses={brief.losses} /></td>
                      <td>{streakCell(brief.streak)}</td>
                      <td>{splitCell(brief.home)}</td>
                      <td>{splitCell(brief.away)}</td>
                      <td>{splitCell(brief.neutral)}</td>
                      <td className={brief.margin ? (brief.margin.avg >= 0 ? 'is-win' : 'is-loss') : ''}>
                        {brief.margin ? `${brief.margin.avg > 0 ? '+' : ''}${brief.margin.avg}` : '—'}
                      </td>
                      <td>{brief.ranked.games ? <Record wins={brief.ranked.wins} losses={brief.ranked.losses} /> : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="vp-outfit-cards">
            {sorted.map((brief) => {
              const sampleNote = outfitSampleNote(brief.games);
              return (
                <li key={brief.outfit}>
                  <button
                    type="button"
                    onClick={() => onViewOutfit(brief)}
                    className={selectedOutfit === brief.outfit ? 'is-selected' : ''}
                  >
                    <span className="vp-outfit-card-top">
                      <strong>{brief.outfit}</strong>
                      <Record wins={brief.wins} losses={brief.losses} />
                    </span>
                    <span className="vp-outfit-card-meta">
                      <span>Streak {streakCell(brief.streak)}</span>
                      <span>Home {splitCell(brief.home)}</span>
                      <span>Away {splitCell(brief.away)}</span>
                      <span>Neutral {splitCell(brief.neutral)}</span>
                      {brief.margin ? <span className={brief.margin.avg >= 0 ? 'is-win' : 'is-loss'}>Margin {brief.margin.avg > 0 ? '+' : ''}{brief.margin.avg}</span> : null}
                      {brief.ranked.games ? <span>Ranked <Record wins={brief.ranked.wins} losses={brief.ranked.losses} /></span> : null}
                      {sampleNote ? <span className="vp-sample">{sampleNote}</span> : null}
                      <span className="vp-quiet">Last {formatLocationLabel(brief.lastSeenLocation)} {brief.lastSeen}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

export default memo(VestLeaderboard);
