export function titleCaseOrder(value) {
  if (!value) return '';

  return String(value)
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((token) => token
      .split(/([/-])/)
      .map((part) => {
        if (part === '/' || part === '-') return part;
        if (/^[A-Z0-9&]{2,4}$/.test(part)) return part;
        return part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part;
      })
      .join(''))
    .join(' ');
}

export function formatEventContext(visit) {
  const sport = visit?.sport?.trim();
  let opponent = visit?.opponent?.trim();
  if (!sport && !opponent) return '';
  if (!opponent) return sport;

  const isAway = /^(@|at\s+)/i.test(opponent);
  opponent = opponent.replace(/^@\s*|^at\s+/i, '').trim();
  const matchup = `${isAway ? 'at' : 'vs'} ${opponent}`;
  return sport ? `${sport} ${matchup}` : matchup;
}
