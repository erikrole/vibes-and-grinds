import { isMadisonArea } from './visitTypes.js';

const blank = (value) => !String(value ?? '').trim();

/** Fields a game would fill. Typed values are never overwritten, and a Madison city is skipped so it can't flip the visit to a home stop. */
export function gameFill(form = {}, game = {}) {
  const fill = {};
  if (blank(form.sport) && game.sport) fill.sport = game.sport;
  if (blank(form.opponent) && game.opponent) fill.opponent = game.opponent;
  if (blank(form.city) && game.city && !isMadisonArea({ city: game.city })) fill.city = game.city;
  return fill;
}

export function gameLabel(game) {
  const verb = game.location === '@' ? 'at' : game.location === 'N' ? 'vs (neutral)' : 'vs';
  return `${game.sport} ${verb} ${game.opponent}`;
}
