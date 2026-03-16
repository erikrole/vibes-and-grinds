// /api/vest/calendar — ICS calendar feed for Wisconsin basketball games

const PRODID = '-//Vibes & Grinds//Vest Tracker//EN';
const CALNAME = 'Wisconsin Basketball (Vest Tracker)';
const DOMAIN = 'coffee.erikrole.com';

function escapeIcs(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function locationLabel(loc) {
  if (loc === '@') return '@';
  return 'vs.';
}

function buildEvent(game) {
  const dtstart = (game.date || '').replace(/-/g, '');
  if (!dtstart || dtstart.length !== 8) return null;

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
    `UID:vest-game-${game.game_id}@${DOMAIN}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    `SUMMARY:${escapeIcs(summary)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${description}`);
  lines.push(`STATUS:${status}`);
  lines.push('END:VEVENT');

  return lines.join('\r\n');
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT game_id, date, location, opponent, ranking, outfit, result, overtime
      FROM vest_games
      ORDER BY date ASC, game_id ASC
    `).all();

    const events = results.map(buildEvent).filter(Boolean);

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:${PRODID}`,
      `X-WR-CALNAME:${CALNAME}`,
      ...events,
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n';

    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="wisconsin-basketball.ics"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating calendar:', error);
    return new Response('Error generating calendar', { status: 500 });
  }
}
