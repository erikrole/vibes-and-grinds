// Generate a shareable visit card (PNG) on an HTML5 canvas. Design: full-bleed
// photo + copper gradient base + dark scrim + glass rating chips (Direction B),
// matching the app's paper/copper/Fraunces theme. Canvas draws with the page's
// already-loaded fonts directly — no embedding, no cross-origin font issues.

import { formatDate } from './dates';

const W = 1080;
const H = 1350;
const PAD = 72;
const BOTTOM_PAD = 78;
const ACCENT = '#d96f2e';
const SERIF = "'Fraunces', Georgia, serif";
const SANS = "'Inter', system-ui, sans-serif";

/**
 * Generate a styled share card image for a visit. Returns a Blob (image/png).
 * The `dark` option is accepted for call-site compatibility but ignored —
 * the card is always a dark-photo design.
 */
export async function generateShareCard(visit) {
  await ensureFontsReady();

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  drawBackground(ctx);
  const photo = visit.photo_url ? await loadImage(visit.photo_url) : null;
  if (photo) {
    drawCover(ctx, photo, 0, 0, W, H);
  } else {
    drawWatermarkCup(ctx);
  }
  drawScrim(ctx);
  drawContent(ctx, visit);

  return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function cardFile(blob, visit) {
  const safeName = (visit.coffee_shop_name || 'visit').replace(/\s+/g, '-').toLowerCase();
  return new File([blob], `vibes-${safeName}.png`, { type: 'image/png' });
}

/** Whether the native share sheet can share this card (mobile, mainly). */
export function canShareCard(blob, visit) {
  if (!navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [cardFile(blob, visit)] });
  } catch {
    return false;
  }
}

/**
 * Share an already-generated card via the native share sheet, falling back to
 * a download where the Web Share API is unsupported.
 */
export async function shareCardBlob(blob, visit) {
  const file = cardFile(blob, visit);
  if (canShareCard(blob, visit)) {
    try {
      await navigator.share({ files: [file], title: `${visit.coffee_shop_name} — Vibes & Grinds` });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  return downloadCardBlob(blob, visit);
}

/** Force a PNG download of an already-generated card. */
export function downloadCardBlob(blob, visit) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cardFile(blob, visit).name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded';
}

// ── Drawing ───────────────────────────────────────────────────────────────────

function drawBackground(ctx) {
  // Diagonal copper gradient (≈155deg): top-right → bottom-left.
  const lin = ctx.createLinearGradient(W, 0, 0, H);
  lin.addColorStop(0, '#c25c22');
  lin.addColorStop(0.55, '#7a3814');
  lin.addColorStop(1, '#3c1d0c');
  ctx.fillStyle = lin;
  ctx.fillRect(0, 0, W, H);

  // Warm highlight bloom, upper-right.
  const rad = ctx.createRadialGradient(W * 0.72, H * 0.12, 0, W * 0.72, H * 0.12, W * 0.85);
  rad.addColorStop(0, 'rgba(246,199,154,0.55)');
  rad.addColorStop(0.5, 'rgba(246,199,154,0.0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, W, H);
}

function drawWatermarkCup(ctx) {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.font = `300px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';
  ctx.fillText('☕', W / 2, H * 0.32);
  ctx.restore();
}

function drawScrim(ctx) {
  // Bottom-anchored darkening: opaque at the very bottom, gone by ~70% up.
  const g = ctx.createLinearGradient(0, H, 0, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.80)');
  g.addColorStop(0.46, 'rgba(0,0,0,0.22)');
  g.addColorStop(0.70, 'rgba(0,0,0,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawContent(ctx, visit) {
  const maxTextW = W - PAD * 2;

  // Pre-measure the wrapped shop name to anchor the whole block to the bottom.
  ctx.font = `700 94px ${SERIF}`;
  const shopLines = wrapLines(ctx, visit.coffee_shop_name || 'Coffee visit', maxTextW, 2);
  const shopLineH = 96;

  const pinText = visit.city || (visit.opponent ? `vs ${visit.opponent}` : '');
  const subText = visit.coffee_order ? String(visit.coffee_order) : '';

  const pinH = pinText ? 36 + 20 : 0;
  const shopH = shopLines.length * shopLineH;
  const subH = subText ? 22 + 40 : 0;
  const chipsH = 150;
  const footerH = 33;
  const contentH = pinH + shopH + subH + 54 + chipsH + 48 + footerH;

  let y = H - BOTTOM_PAD - contentH;
  ctx.textBaseline = 'top';

  // Pin.
  if (pinText) {
    ctx.font = `600 36px ${SANS}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd9b8';
    ctx.fillText(`📍 ${pinText}`, PAD, y);
    y += pinH;
  }

  // Shop name.
  ctx.font = `700 94px ${SERIF}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  for (const line of shopLines) {
    ctx.fillText(line, PAD, y);
    y += shopLineH;
  }

  // Sub-line.
  if (subText) {
    y += 22;
    ctx.font = `400 40px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,0.84)';
    ctx.fillText(truncate(ctx, subText, maxTextW), PAD, y);
    y += 40;
  }

  // Rating chips.
  y += 54;
  drawChips(ctx, y, chipsH, [
    { label: 'VIBE', value: fmt(visit.vibe_rating), hero: false },
    { label: 'COFFEE', value: fmt(visit.coffee_rating), hero: false },
    { label: 'TOTAL', value: fmt(visit.composite_score), hero: true },
  ]);
  y += chipsH;

  // Footer.
  y += 48;
  ctx.font = `600 33px ${SANS}`;
  ctx.fillStyle = 'rgba(255,255,255,0.74)';
  ctx.textAlign = 'left';
  ctx.fillText('☕ Vibes & Grinds', PAD, y);
  if (visit.date) {
    ctx.textAlign = 'right';
    ctx.fillText(formatDate(visit.date, { month: 'short', day: 'numeric', year: 'numeric' }), W - PAD, y);
  }
}

function drawChips(ctx, top, height, chips) {
  const gap = 24;
  const chipW = (W - PAD * 2 - gap * (chips.length - 1)) / chips.length;

  chips.forEach((chip, i) => {
    const x = PAD + i * (chipW + gap);

    roundRect(ctx, x, top, chipW, height, 36);
    ctx.fillStyle = chip.hero ? ACCENT : 'rgba(255,255,255,0.14)';
    ctx.fill();
    if (!chip.hero) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.24)';
      ctx.stroke();
    }

    const cx = x + chipW / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.font = `700 27px ${SANS}`;
    ctx.fillStyle = chip.hero ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.72)';
    withLetterSpacing(ctx, '2px', () => ctx.fillText(chip.label, cx, top + 28));

    ctx.font = `600 62px ${SERIF}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(chip.value, cx, top + 60);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(1) : '—';
}

function withLetterSpacing(ctx, spacing, fn) {
  const prev = ctx.letterSpacing;
  try {
    ctx.letterSpacing = spacing;
    fn();
  } finally {
    if (prev !== undefined) ctx.letterSpacing = prev;
  }
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  // Remaining words go on the final line (truncated to fit).
  const used = lines.join(' ');
  const rest = used ? String(text).slice(used.length).trim() : String(text);
  if (lines.length < maxLines) lines.push(truncate(ctx, rest || line, maxWidth));
  return lines.slice(0, maxLines);
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function drawCover(ctx, img, dx, dy, dw, dh) {
  const imgRatio = img.width / img.height;
  const boxRatio = dw / dh;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // fall back to the gradient base
    img.src = src;
  });
}

async function ensureFontsReady() {
  if (!document.fonts) return;
  const timeout = new Promise((r) => setTimeout(r, 2500));
  const loads = Promise.all([
    document.fonts.load('700 94px Fraunces'),
    document.fonts.load('600 62px Fraunces'),
    document.fonts.load('600 40px Inter'),
    document.fonts.load('400 36px Inter'),
  ]).catch(() => {});
  await Promise.race([loads, timeout]);
}

// Dev-only preview hook: draws a scaled-down card for visual verification.
if (import.meta.env?.DEV) {
  window.__shareCardPreview = async (visit) => {
    const blob = await generateShareCard(visit);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.src = url; });
    const c = document.createElement('canvas');
    c.id = '__share-card-preview';
    c.width = 380;
    c.height = 475;
    Object.assign(c.style, {
      position: 'fixed', left: '12px', top: '12px', zIndex: '99999',
      boxShadow: '0 16px 50px rgba(0,0,0,0.5)', borderRadius: '10px',
    });
    c.getContext('2d').drawImage(img, 0, 0, 380, 475);
    URL.revokeObjectURL(url);
    document.getElementById('__share-card-preview')?.remove();
    document.body.appendChild(c);
    return 'rendered';
  };
}
