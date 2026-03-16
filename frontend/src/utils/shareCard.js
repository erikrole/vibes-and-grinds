// Generate a shareable visit card as a PNG blob using HTML5 Canvas.

/**
 * Generate a styled share card image for a visit.
 * Returns a Blob (image/png).
 */
export async function generateShareCard(visit, { dark = false } = {}) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  if (dark) {
    grad.addColorStop(0, '#1c1917'); // stone-900
    grad.addColorStop(1, '#292524'); // stone-800
  } else {
    grad.addColorStop(0, '#fafaf9'); // stone-50
    grad.addColorStop(1, '#e7e5e4'); // stone-300
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  let photoBottom = 80;

  // Photo
  if (visit.photo_url) {
    try {
      const img = await loadImage(visit.photo_url);
      const photoH = 700;
      photoBottom = 60 + photoH;
      // Draw rounded rect clipped photo
      ctx.save();
      roundRect(ctx, 60, 60, W - 120, photoH, 32);
      ctx.clip();
      // Cover crop
      const imgRatio = img.width / img.height;
      const boxRatio = (W - 120) / photoH;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgRatio > boxRatio) {
        sw = img.height * boxRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / boxRatio;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 60, 60, W - 120, photoH);
      ctx.restore();

      // Gradient overlay at bottom of photo for text readability
      const overlayGrad = ctx.createLinearGradient(0, photoBottom - 200, 0, photoBottom);
      overlayGrad.addColorStop(0, 'rgba(0,0,0,0)');
      overlayGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.save();
      roundRect(ctx, 60, 60, W - 120, photoH, 32);
      ctx.clip();
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(60, photoBottom - 200, W - 120, 200);
      ctx.restore();
    } catch {
      // Photo failed to load, continue without
    }
  }

  // Content area
  const contentY = photoBottom + 50;
  const textColor = dark ? '#fafaf9' : '#1c1917';
  const subtextColor = dark ? '#a8a29e' : '#78716c';

  // Shop name
  ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  const shopName = truncateText(ctx, visit.coffee_shop_name, W - 160);
  ctx.fillText(shopName, 80, contentY);

  // City + date
  const dateStr = new Date(visit.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const location = [visit.city, dateStr].filter(Boolean).join('  ·  ');
  ctx.font = '32px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = subtextColor;
  ctx.fillText(location, 80, contentY + 55);

  // Rating circles
  const circleY = contentY + 140;
  const circleR = 55;
  const ratings = [
    { label: 'VIBE', value: visit.vibe_rating, color: ratingToColor(visit.vibe_rating) },
    { label: 'COFFEE', value: visit.coffee_rating, color: ratingToColor(visit.coffee_rating) },
    { label: 'TOTAL', value: visit.composite_score, color: ratingToColor(visit.composite_score / 2), isComposite: true },
  ];

  const circleSpacing = 200;
  const circleStartX = 80 + circleR;

  ratings.forEach((r, i) => {
    const cx = circleStartX + i * circleSpacing;
    // Circle background
    ctx.beginPath();
    ctx.arc(cx, circleY, circleR, 0, Math.PI * 2);
    ctx.fillStyle = r.color;
    ctx.fill();

    // Rating number
    ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(r.isComposite ? r.value.toFixed(0) : r.value.toFixed(1), cx, circleY);

    // Label
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = subtextColor;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(r.label, cx, circleY + circleR + 30);
  });

  // Order (if present)
  if (visit.coffee_order) {
    const orderY = circleY + circleR + 80;
    ctx.font = '30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = subtextColor;
    ctx.textAlign = 'left';
    ctx.fillText(`☕  ${visit.coffee_order}`, 80, orderY);
  }

  // Notes excerpt
  if (visit.notes) {
    const notesY = circleY + circleR + (visit.coffee_order ? 130 : 80);
    ctx.font = 'italic 26px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = subtextColor;
    const excerpt = truncateText(ctx, `"${visit.notes}"`, W - 160);
    ctx.textAlign = 'left';
    ctx.fillText(excerpt, 80, notesY);
  }

  // Watermark
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = dark ? '#57534e' : '#a8a29e';
  ctx.textAlign = 'center';
  ctx.fillText('VIBES & GRINDS', W / 2, H - 50);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Share or download a visit card.
 */
export async function shareVisitCard(visit, { dark = false } = {}) {
  const blob = await generateShareCard(visit, { dark });
  const file = new File([blob], `vibes-${visit.coffee_shop_name.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `${visit.coffee_shop_name} — Vibes & Grinds`,
      });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }

  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '...').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '...';
}

function ratingToColor(rating) {
  const clamped = Math.max(0, Math.min(10, rating));
  if (clamped <= 5) {
    const pct = clamped / 5;
    const r = Math.round(220 + (220 - 220) * pct);
    const g = Math.round(38 + (184 - 38) * pct);
    const b = Math.round(38 + (38 - 38) * pct);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const pct = (clamped - 5) / 5;
    const r = Math.round(220 + (34 - 220) * pct);
    const g = Math.round(184 + (197 - 184) * pct);
    const b = Math.round(38 + (94 - 38) * pct);
    return `rgb(${r}, ${g}, ${b})`;
  }
}
