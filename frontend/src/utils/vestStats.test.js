import { describe, it, expect } from 'vitest';
import {
  buildNetLookup,
  countTrailingStreak,
  findNetRankForOpponent,
  formatLocationLabel,
  formatVestDate,
  getQuadrant,
  getQuadrantQualityScore,
  netEntriesToRows,
  normalizeNetResponse,
  normalizeTeamName,
  normalizeTokens,
  toIsoDate,
  toSuperscript,
} from './vestStats';

describe('toIsoDate', () => {
  it('returns the YYYY-MM-DD prefix unchanged', () => {
    expect(toIsoDate('2026-02-13T20:00:00Z')).toBe('2026-02-13');
    expect(toIsoDate('2026-02-13')).toBe('2026-02-13');
  });

  it('parses other formats via Date', () => {
    expect(toIsoDate('Feb 13, 2026')).toBe('2026-02-13');
  });

  it('returns empty string for falsy or invalid input', () => {
    expect(toIsoDate('')).toBe('');
    expect(toIsoDate(null)).toBe('');
    expect(toIsoDate('not a date')).toBe('');
  });
});

describe('formatVestDate', () => {
  it('formats a YYYY-MM-DD date with abbreviated month', () => {
    expect(formatVestDate('2026-02-13')).toBe('Feb. 13, 2026');
  });

  it('returns null for empty input', () => {
    expect(formatVestDate('')).toBe(null);
    expect(formatVestDate(null)).toBe(null);
  });
});

describe('toSuperscript', () => {
  it('converts digits to unicode superscripts', () => {
    expect(toSuperscript(25)).toBe('²⁵');
    expect(toSuperscript(7)).toBe('⁷');
  });

  it('returns empty string for falsy input', () => {
    expect(toSuperscript(0)).toBe('');
    expect(toSuperscript(null)).toBe('');
  });
});

describe('normalizeTeamName', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeTeamName('Wisconsin Badgers!')).toBe('wisconsin badgers');
  });

  it('expands aliased nicknames', () => {
    expect(normalizeTeamName('BYU')).toBe('brigham young');
    expect(normalizeTeamName('UCLA')).toBe('california los angeles');
  });

  it('drops stop-words like "university" and "college"', () => {
    expect(normalizeTeamName('Wisconsin University')).toBe('wisconsin');
  });
});

describe('normalizeTokens', () => {
  it('canonicalizes token aliases', () => {
    expect(normalizeTokens('Michigan St')).toEqual(['michigan', 'state']);
    expect(normalizeTokens('Northern Illinois')).toEqual(['north', 'illinois']);
  });
});

describe('buildNetLookup + findNetRankForOpponent', () => {
  const lookup = buildNetLookup([
    { team: 'Auburn', rank: 1, key: normalizeTeamName('Auburn') },
    { team: 'Michigan State', rank: 12, key: normalizeTeamName('Michigan State') },
    { team: 'Wisconsin', rank: 8, key: normalizeTeamName('Wisconsin') },
  ]);

  it('finds an exact (normalized) match', () => {
    expect(findNetRankForOpponent(lookup, 'Wisconsin')).toBe(8);
    expect(findNetRankForOpponent(lookup, 'WISCONSIN')).toBe(8);
  });

  it('falls back to a token-set match for abbreviations', () => {
    expect(findNetRankForOpponent(lookup, 'Michigan St')).toBe(12);
    expect(findNetRankForOpponent(lookup, 'Michigan St.')).toBe(12);
  });

  it('returns null when no match found', () => {
    expect(findNetRankForOpponent(lookup, 'Penn State')).toBe(null);
    expect(findNetRankForOpponent(lookup, '')).toBe(null);
  });
});

describe('getQuadrant', () => {
  it('returns null for non-finite rank', () => {
    expect(getQuadrant('vs', null)).toBe(null);
    expect(getQuadrant('vs', 0)).toBe(null);
    expect(getQuadrant('vs', 400)).toBe(null);
  });

  it('uses location-specific thresholds', () => {
    // home: Q1 ≤ 30, Q2 ≤ 75, Q3 ≤ 160, Q4 ≤ 365
    expect(getQuadrant('vs', 25)).toBe(1);
    expect(getQuadrant('vs', 50)).toBe(2);
    expect(getQuadrant('vs', 100)).toBe(3);
    expect(getQuadrant('vs', 300)).toBe(4);
  });

  it('away has wider Q1/Q2 windows than home', () => {
    expect(getQuadrant('@', 50)).toBe(1);
    expect(getQuadrant('vs', 50)).toBe(2);
  });
});

describe('getQuadrantQualityScore', () => {
  it('rewards Q1/Q2 wins and punishes Q3/Q4 losses', () => {
    const all = (n) => ({ wins: n, losses: 0 });
    const allLosses = (n) => ({ wins: 0, losses: n });

    expect(
      getQuadrantQualityScore({
        1: all(2), 2: all(0), 3: all(0), 4: all(0),
      })
    ).toBe(32);
    expect(
      getQuadrantQualityScore({
        1: all(0), 2: all(0), 3: allLosses(0), 4: allLosses(2),
      })
    ).toBe(-28);
  });
});

describe('formatLocationLabel', () => {
  it('returns short labels by default', () => {
    expect(formatLocationLabel('vs')).toBe('vs');
    expect(formatLocationLabel('@')).toBe('@');
    expect(formatLocationLabel('N')).toBe('N');
  });

  it('supports full / adjective modes', () => {
    expect(formatLocationLabel('@', 'full')).toBe('at');
    expect(formatLocationLabel('N', 'full')).toBe('neutral vs');
    expect(formatLocationLabel('@', 'adjective')).toBe('away');
    expect(formatLocationLabel('vs', 'Adjective')).toBe('Home');
  });

  it('falls back to "vs" for unknown locations', () => {
    expect(formatLocationLabel('???')).toBe('vs');
  });
});

describe('countTrailingStreak', () => {
  it('returns null for empty input', () => {
    expect(countTrailingStreak([])).toBe(null);
  });

  it('counts the trailing run', () => {
    expect(countTrailingStreak(['W', 'L', 'L', 'W', 'W', 'W'])).toEqual({ result: 'W', count: 3 });
    expect(countTrailingStreak(['W', 'W', 'L'])).toEqual({ result: 'L', count: 1 });
  });
});

describe('normalizeNetResponse', () => {
  it('handles direct arrays', () => {
    expect(normalizeNetResponse([{ team: 'A', rank: 1 }])).toEqual([{ team: 'A', rank: 1 }]);
  });

  it('extracts the rankings/data/teams array', () => {
    expect(normalizeNetResponse({ rankings: [{ team: 'A', rank: 1 }] })).toEqual([{ team: 'A', rank: 1 }]);
    expect(normalizeNetResponse({ data: [{ team: 'B', rank: 2 }] })).toEqual([{ team: 'B', rank: 2 }]);
  });

  it('flattens Big Ten standings payloads', () => {
    const result = normalizeNetResponse({
      standings: [
        { team: 'Wisconsin', netRank: 12 },
        { team: 'Bogus' /* missing rank */ },
      ],
    });
    expect(result).toEqual([{ team: 'Wisconsin', netRank: 12 }]);
  });

  it('flattens netRankings dictionary payloads', () => {
    const result = normalizeNetResponse({ netRankings: { DUKE: 1, AUBURN: 2 } });
    expect(result).toContainEqual({ team: 'DUKE', netRank: 1 });
    expect(result).toContainEqual({ team: 'AUBURN', netRank: 2 });
  });

  it('returns [] for unrecognized shapes', () => {
    expect(normalizeNetResponse(null)).toEqual([]);
    expect(normalizeNetResponse({})).toEqual([]);
  });
});

describe('netEntriesToRows', () => {
  it('builds a row with normalized key + numeric rank', () => {
    const rows = netEntriesToRows([
      { team: 'Wisconsin', rank: 12, record: '20-3' },
      { team: '', rank: 9 }, // dropped (no team)
      { team: 'Auburn', rank: 'NaN' }, // dropped (bad rank)
    ]);
    expect(rows).toEqual([
      { team: 'Wisconsin', rank: 12, key: 'wisconsin', record: '20-3' },
    ]);
  });
});
