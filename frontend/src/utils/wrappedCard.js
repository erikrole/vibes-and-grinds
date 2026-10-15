// "Season wrapped" share image drawn on a canvas from the journal stats.
const W = 1080;
const H = 1350;
const SERIF = "'Fraunces', Georgia, serif";
const SANS = "'Inter', system-ui, sans-serif";

export async function generateWrappedCard(stats, extras = {}) {
  try { await document.fonts?.ready; } catch { /* fonts are optional */ }
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#2a1d14'); grad.addColorStop(1, '#8c5036');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f6efe4';
  ctx.font = `700 64px ${SERIF}`; ctx.fillText('vibes & grinds', 72, 150);
  ctx.font = `500 34px ${SANS}`; ctx.fillStyle = '#f2c7a8'; ctx.fillText('Season wrapped', 72, 205);
  const tiles = [
    [stats.stops, 'stops logged'], [stats.shops, 'different shops'], [stats.cities, 'cities'],
    [stats.states, 'states'], [stats.legMiles, 'road miles'], [stats.perfectTens, 'perfect 10 cups'],
  ].filter(([n]) => n);
  tiles.forEach(([n, label], i) => {
    const x = 72 + (i % 2) * 480; const y = 300 + Math.floor(i / 2) * 230;
    ctx.fillStyle = 'rgba(255,255,255,0.09)'; ctx.fillRect(x, y, 456, 200);
    ctx.fillStyle = '#ec8a4f'; ctx.font = `700 96px ${SERIF}`; ctx.fillText(Number(n).toLocaleString(), x + 32, y + 112);
    ctx.fillStyle = '#f6efe4'; ctx.font = `500 32px ${SANS}`; ctx.fillText(label, x + 32, y + 164);
  });
  ctx.fillStyle = '#f6efe4'; ctx.font = `500 36px ${SANS}`;
  const lines = [];
  if (stats.topOrder) lines.push(`Go-to order: ${stats.topOrder.order} (${stats.topOrder.count}x)`);
  if (stats.farthest) lines.push(`Farthest cup: ${stats.farthest.city || stats.farthest.shop}`);
  if (extras.personality) lines.push(extras.personality);
  lines.forEach((line, i) => ctx.fillText(line.slice(0, 48), 72, 1030 + i * 60));
  ctx.fillStyle = '#f2c7a8'; ctx.font = `500 28px ${SANS}`; ctx.fillText('coffee.erikrole.com', 72, H - 72);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
