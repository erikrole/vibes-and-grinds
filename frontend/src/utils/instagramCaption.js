// Ready-to-paste Instagram caption for a visit. Instagram drops any text passed
// through the share sheet alongside an image, so the share flow copies this to
// the clipboard and the caption is one paste away.

import { formatEventContext, titleCaseOrder } from './display.js';

const MAX_NOTES = 300;
const BASE_TAGS = ['#vibesandgrinds', '#coffee', '#coffeeshop'];

function score(value) {
  const num = value == null || value === '' ? NaN : Number(value);
  return Number.isFinite(num) ? num.toFixed(1) : '—';
}

export function cityHashtag(city) {
  const name = String(city || '').split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  return name ? `#${name}coffee` : '';
}

export function buildInstagramCaption(visit = {}) {
  const shop = visit.coffee_shop_name?.trim() || 'Coffee stop';
  const city = visit.city?.trim();
  const order = titleCaseOrder(visit.coffee_order);
  const event = formatEventContext(visit);
  let notes = String(visit.notes || '').trim().replace(/\s+/g, ' ');
  if (notes.length > MAX_NOTES) notes = `${notes.slice(0, MAX_NOTES - 1).trimEnd()}…`;

  const lines = [
    `☕ ${shop}${city ? ` · ${city}` : ''}`,
    '',
    `✨ Vibe ${score(visit.vibe_rating)}/10`,
    `☕ Coffee ${score(visit.coffee_rating)}/10`,
    `🏆 Total ${score(visit.composite_score)}/20`,
  ];
  if (order) lines.push(`🥤 Ordered: ${order}`);
  if (event) lines.push(`🏟️ ${event}`);
  if (notes) lines.push('', notes);

  const tags = [...BASE_TAGS, cityHashtag(city)].filter(Boolean);
  lines.push('', tags.join(' '));
  return lines.join('\n');
}

/** Best-effort clipboard write; resolves to whether it worked. */
export async function copyCaption(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
