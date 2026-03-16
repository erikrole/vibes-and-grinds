// Manual ICS (iCalendar RFC 5545) generation for vest tracker games.
// No external dependencies — the format is simple enough to template.

const PRODID = '-//Vibes & Grinds//Vest Tracker//EN';
const CALNAME = 'Wisconsin Basketball (Vest Tracker)';

function escapeIcs(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatDateValue(dateStr) {
  // Accepts YYYY-MM-DD, returns YYYYMMDD for VALUE=DATE
  return (dateStr || '').replace(/-/g, '');
}

function locationLabel(loc) {
  if (loc === '@') return '@';
  if (loc === 'N') return 'vs.';
  return 'vs.';
}

function buildEvent(game, domain) {
  const uid = `vest-game-${game.id}@${domain}`;
  const dtstart = formatDateValue(game.date);
  if (!dtstart || dtstart.length !== 8) return null;

  // All-day event: DTSTART is game day, DTEND is next day
  const startDate = new Date(game.date + 'T00:00:00');
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);
  const dtend = endDate.toISOString().slice(0, 10).replace(/-/g, '');

  const rankTag = game.ranking ? ` (#${game.ranking})` : '';
  const summary = `Wisconsin ${locationLabel(game.location)} ${game.opponent}${rankTag}`;

  const descParts = [];
  if (game.outfit) descParts.push(`Outfit: ${game.outfit}`);
  if (game.result) descParts.push(`Result: ${game.result}${game.overtime ? ' (OT)' : ''}`);
  if (game.ranking) descParts.push(`Wisconsin ranking: #${game.ranking}`);
  const description = descParts.join('\\n');

  const status = game.result ? 'CONFIRMED' : 'TENTATIVE';

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    `SUMMARY:${escapeIcs(summary)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${description}`);
  lines.push(`STATUS:${status}`);
  lines.push('END:VEVENT');

  return lines.join('\r\n');
}

export function generateIcs(games, { domain = 'coffee.erikrole.com' } = {}) {
  const events = games
    .map((game) => buildEvent(game, domain))
    .filter(Boolean);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    `X-WR-CALNAME:${CALNAME}`,
    ...events,
    'END:VCALENDAR',
  ];

  return lines.join('\r\n') + '\r\n';
}
