// ESPN schedule and summary shapes, kept tolerant of the fields that move.
// Score used to be a string. It is now { value, displayValue } on the schedule,
// linescores often have only displayValue, neutral games are still home/away,
// and overtime lives on status.detail rather than description.

import { centralGameDate } from './_centralDate.js';

export const WISCONSIN_TEAM_ID = '275';

export function readNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  if (typeof value === 'object') {
    if ('value' in value && value.value != null && value.value !== '') return readNumber(value.value);
    if ('displayValue' in value) return readNumber(value.displayValue);
  }
  return null;
}

/**
 * Neutral-site games are still tagged home or away for the bracket slot.
 * Checking homeAway first labels a neutral "home" game "vs" and a neutral
 * "away" game "@". The neutral flag wins.
 */
export function espnLocation(competitor, competition) {
  const homeAway = `${competitor?.homeAway || ''}`.toLowerCase();
  if (competition?.neutralSite === true || homeAway === 'neutral') return 'N';
  if (homeAway === 'away') return '@';
  return 'vs';
}

export function readBroadcast(competition) {
  const broadcasts = Array.isArray(competition?.broadcasts) ? competition.broadcasts : [];
  for (const entry of broadcasts) {
    if (!entry || typeof entry !== 'object') continue;
    const name = entry.names?.[0]
      || entry.media?.shortName
      || entry.name
      || entry.shortName
      || null;
    if (name) return String(name);
  }
  return null;
}

export function readRecord(competitor) {
  const raw = competitor?.records ?? competitor?.record;
  const list = Array.isArray(raw) ? raw : [];
  const overall = list.find((record) => record?.type === 'total') || list[0];
  const summary = overall?.summary || overall?.displayValue || null;
  return summary ? String(summary) : null;
}

export function readRank(competitor) {
  const current = competitor?.curatedRank?.current;
  const rank = readNumber(current);
  if (rank == null || rank < 1) return null;
  return rank;
}

function readLineValue(entry) {
  if (entry == null) return null;
  if (typeof entry !== 'object') return readNumber(entry);
  return readNumber(entry.value ?? entry.displayValue);
}

function statusText(statusType) {
  if (!statusType || typeof statusType !== 'object') return '';
  return [
    statusType.description,
    statusType.detail,
    statusType.shortDetail,
    statusType.altDetail,
  ].filter(Boolean).join(' ');
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * One schedule event, or null when the payload cannot describe a Wisconsin game.
 * Never throws: a null event or a competitors object is skipped.
 */
export function parseEspnEvent(event, teamId = WISCONSIN_TEAM_ID) {
  if (!event || typeof event !== 'object') return null;
  if (event.id == null || event.id === '') return null;
  // Team ids are strings. Array#map passes the index as the second argument,
  // and that number must not replace Wisconsin's id or every game is skipped.
  const resolvedTeamId = typeof teamId === 'string' && teamId !== '' ? teamId : WISCONSIN_TEAM_ID;

  try {
    const competitions = asArray(event.competitions);
    const competition = competitions[0] && typeof competitions[0] === 'object' ? competitions[0] : {};
    const competitors = asArray(competition.competitors);
    const badgers = competitors.find((competitor) => String(competitor?.team?.id ?? competitor?.id) === resolvedTeamId);
    const opponent = competitors.find((competitor) => competitor && competitor !== badgers && String(competitor?.team?.id ?? competitor?.id) !== resolvedTeamId);
    if (!badgers || !opponent) return null;

    const statusType = competition.status?.type && typeof competition.status.type === 'object'
      ? competition.status.type
      : {};
    const isCompleted = Boolean(statusType.completed);
    const text = statusText(statusType);
    const wiLines = asArray(badgers.linescores);
    const oppLines = asArray(opponent.linescores);
    const wiScore = readNumber(badgers.score);
    const oppScore = readNumber(opponent.score);
    const venue = competition.venue && typeof competition.venue === 'object' ? competition.venue : null;

    let result = '';
    if (isCompleted && wiScore != null && oppScore != null) {
      if (wiScore > oppScore) result = 'W';
      else if (wiScore < oppScore) result = 'L';
    }

    return {
      espnEventId: String(event.id),
      date: event.date,
      gameDate: centralGameDate(event.date),
      opponentName: opponent.team?.displayName || opponent.team?.name || event.shortName || 'TBD',
      location: espnLocation(badgers, competition),
      completed: isCompleted,
      overtime: /OT/i.test(text) || wiLines.length > 2,
      result,
      wisconsinScore: wiScore,
      opponentScore: oppScore,
      wisconsinH1: readLineValue(wiLines[0]),
      wisconsinH2: readLineValue(wiLines[1]),
      opponentH1: readLineValue(oppLines[0]),
      opponentH2: readLineValue(oppLines[1]),
      otPeriods: Math.max(0, wiLines.length - 2),
      venue: venue?.fullName || null,
      venueCity: venue?.address?.city || null,
      broadcast: readBroadcast(competition),
      attendance: competition.attendance == null || competition.attendance === ''
        ? null
        : readNumber(competition.attendance),
      oppRanking: readRank(opponent),
      wiRanking: readRank(badgers),
      wiRecord: readRecord(badgers),
    };
  } catch {
    return null;
  }
}

/** Calendar-day schedule row. The date is the Central game day, not the UTC instant. */
export function scheduleGame(event, teamId = WISCONSIN_TEAM_ID) {
  const parsed = parseEspnEvent(event, teamId);
  if (!parsed) return null;
  return {
    date: parsed.gameDate || parsed.date || null,
    opponent: parsed.opponentName,
    location: parsed.location,
    result: parsed.result,
    overtime: parsed.overtime,
    completed: parsed.completed,
  };
}

const STAT_ALIASES = {
  FG: ['fg', 'fieldgoalsmade-fieldgoalsattempted'],
  '3PT': ['3pt', 'threepointfieldgoalsmade-threepointfieldgoalsattempted'],
  FT: ['ft', 'freethrowsmade-freethrowsattempted'],
  'FG%': ['fg%', 'field goal %', 'fieldgoalpct'],
  '3PT%': ['3pt%', '3p%', 'three point %', 'threepointfieldgoalpct'],
  'FT%': ['ft%', 'free throw %', 'freethrowpct'],
  REB: ['reb', 'rebounds', 'totalrebounds'],
  TO: ['to', 'turnovers', 'totalturnovers'],
};

function statTokens(entry) {
  return [entry?.label, entry?.abbreviation, entry?.name]
    .filter((token) => token != null && token !== '')
    .map((token) => String(token).trim().toLowerCase());
}

export function extractStat(stats, label) {
  const list = asArray(stats);
  const aliases = STAT_ALIASES[label] || [String(label).toLowerCase()];
  const entry = list.find((stat) => stat && statTokens(stat).some((token) => aliases.includes(token)));
  if (!entry) return null;
  const display = entry.displayValue ?? entry.value;
  if (display == null || display === '') return null;
  return String(display);
}

export function extractStatNum(stats, label) {
  const display = extractStat(stats, label);
  if (!display) return null;
  const num = Number.parseFloat(display);
  return Number.isFinite(num) ? Math.round(num * 10) / 10 : null;
}

function findCompetitor(summary, teamId) {
  const competitors = asArray(summary?.header?.competitions?.[0]?.competitors);
  return competitors.find((competitor) => (
    String(competitor?.id) === String(teamId) || String(competitor?.team?.id) === String(teamId)
  )) || null;
}

function findLeaders(summary, teamId) {
  const groups = asArray(summary?.leaders);
  const group = groups.find((entry) => String(entry?.team?.id) === String(teamId));
  if (Array.isArray(group?.leaders)) return group.leaders;
  const competitor = findCompetitor(summary, teamId);
  return asArray(competitor?.leaders);
}

function readLeader(leaders, names) {
  const wanted = names.map((name) => name.toLowerCase());
  const entry = asArray(leaders).find((leader) => {
    const name = String(leader?.name || '').toLowerCase();
    const abbreviation = String(leader?.abbreviation || '').toLowerCase();
    return wanted.includes(name) || wanted.includes(abbreviation);
  });
  const person = entry?.leaders?.[0];
  if (!person) return { name: null, value: null };
  const value = person.displayValue ?? (person.value == null ? null : String(person.value));
  return {
    name: person.athlete?.displayName || null,
    value: value == null || value === '' ? null : String(value),
  };
}

function teamBox(summary, teamId) {
  const teams = asArray(summary?.boxscore?.teams);
  return teams.find((team) => String(team?.team?.id) === String(teamId)) || null;
}

/**
 * Box score plus the half lines from the summary header.
 * Returns null only when summary itself is unusable. Missing sections become null fields.
 */
export function parseBoxScore(summary, teamId = WISCONSIN_TEAM_ID) {
  if (!summary || typeof summary !== 'object') return null;

  try {
    const teams = asArray(summary.boxscore?.teams);
    const wiBox = teamBox(summary, teamId);
    const oppBox = teams.find((team) => team && team !== wiBox && String(team?.team?.id) !== String(teamId)) || null;
    const wiStats = wiBox?.statistics ?? wiBox?.stats;
    const oppStats = oppBox?.statistics ?? oppBox?.stats;
    const leaders = findLeaders(summary, teamId);
    const points = readLeader(leaders, ['points', 'pts']);
    const rebounds = readLeader(leaders, ['rebounds', 'reb']);
    const assists = readLeader(leaders, ['assists', 'ast']);

    const wiHeader = findCompetitor(summary, teamId);
    const competitors = asArray(summary.header?.competitions?.[0]?.competitors);
    const oppHeader = competitors.find((competitor) => competitor && competitor !== wiHeader) || null;
    const wiLines = asArray(wiHeader?.linescores);
    const oppLines = asArray(oppHeader?.linescores);

    return {
      wi_fg: extractStat(wiStats, 'FG'),
      wi_3pt: extractStat(wiStats, '3PT'),
      wi_ft: extractStat(wiStats, 'FT'),
      wi_rebounds: extractStatNum(wiStats, 'REB'),
      wi_turnovers: extractStatNum(wiStats, 'TO'),
      wi_fg_pct: extractStatNum(wiStats, 'FG%'),
      wi_3pt_pct: extractStatNum(wiStats, '3PT%'),
      wi_ft_pct: extractStatNum(wiStats, 'FT%'),
      opp_fg: extractStat(oppStats, 'FG'),
      opp_3pt: extractStat(oppStats, '3PT'),
      opp_ft: extractStat(oppStats, 'FT'),
      opp_rebounds: extractStatNum(oppStats, 'REB'),
      opp_turnovers: extractStatNum(oppStats, 'TO'),
      opp_fg_pct: extractStatNum(oppStats, 'FG%'),
      opp_3pt_pct: extractStatNum(oppStats, '3PT%'),
      opp_ft_pct: extractStatNum(oppStats, 'FT%'),
      wi_leader_pts_name: points.name,
      wi_leader_pts_value: points.value,
      wi_leader_reb_name: rebounds.name,
      wi_leader_reb_value: rebounds.value,
      wi_leader_ast_name: assists.name,
      wi_leader_ast_value: assists.value,
      wisconsin_h1: readLineValue(wiLines[0]),
      wisconsin_h2: readLineValue(wiLines[1]),
      opponent_h1: readLineValue(oppLines[0]),
      opponent_h2: readLineValue(oppLines[1]),
      ot_periods: Math.max(0, wiLines.length - 2),
    };
  } catch {
    return null;
  }
}
