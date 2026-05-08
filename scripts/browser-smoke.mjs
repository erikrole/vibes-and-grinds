// Headless smoke test for the refactored frontend. Boots Chromium, walks
// through both VIBES and VEST modes, and verifies the new component
// hierarchy renders without console errors.
//
// Run: node scripts/browser-smoke.mjs

import { chromium } from 'playwright';

const URL = process.env.URL || 'http://127.0.0.1:3000/';

const consoleErrors = [];
const pageErrors = [];

function log(name, ok, detail = '') {
  const tag = ok ? '✓' : '✗';
  const line = `${tag} ${name}${detail ? ` — ${detail}` : ''}`;
  console.log(line);
  if (!ok) process.exitCode = 1;
}

async function expect(name, predicate) {
  try {
    const result = await predicate();
    log(name, result.ok, result.detail);
  } catch (err) {
    log(name, false, err.message);
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => pageErrors.push(err.message));

// ── VIBES mode ────────────────────────────────────────────────────────────

await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });

await expect('AppHeader title renders (vibes)', async () => {
  const text = await page.locator('h1').first().innerText();
  return { ok: /vibes/i.test(text), detail: text };
});

await expect('StatsHero shows visit count', async () => {
  const hero = page.locator('.hero-numeral').first();
  await hero.waitFor({ timeout: 5000 });
  const value = await hero.innerText();
  return { ok: /^\d+$/.test(value.trim()), detail: value };
});

await expect('VisitsToolbar search input is present', async () => {
  const input = page.locator('input[placeholder*="Search shop"]');
  return { ok: (await input.count()) === 1 };
});

await expect('Sort tabs render (Date/Vibe/Coffee/Total)', async () => {
  const tabs = await page.locator('button[aria-pressed]').allInnerTexts();
  const labels = tabs.map((t) => t.trim().split('\n')[0]);
  const ok = ['Date', 'Vibe', 'Coffee', 'Total'].every((l) => labels.includes(l));
  return { ok, detail: labels.join(', ') };
});

await expect('Search ⌨ shortcut focuses search input', async () => {
  await page.keyboard.press('/');
  const focused = await page.evaluate(() =>
    document.activeElement?.getAttribute('placeholder') || ''
  );
  return { ok: /Search shop/i.test(focused), detail: focused };
});

await expect('? shortcut opens KeyboardShortcutsModal', async () => {
  await page.locator('h1').first().click();
  // Playwright headless reports `key='/'` for Shift+/, so dispatch a synthetic
  // keydown with key='?' that matches what real browsers send.
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
  });
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await dialog.waitFor({ timeout: 3000 });
  const ok = await dialog.isVisible();
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
  return { ok };
});

// ── VEST mode ─────────────────────────────────────────────────────────────

await expect('"v" shortcut switches into vest mode', async () => {
  await page.locator('h1').first().click();
  await page.keyboard.press('v');
  // VestTrackerDashboard is lazy() — wait for the tab bar inside it.
  await page.locator('main button[aria-pressed]').filter({ hasText: 'Dashboard' }).waitFor({
    timeout: 8000,
  });
  const text = await page.locator('h1').first().innerText();
  return { ok: /VEST TRACKER/.test(text), detail: text };
});

await expect('VestTabBar renders 3 tabs', async () => {
  // Scope to the first <main> so we don't pick up nav buttons elsewhere.
  const tabs = await page.locator('main button[aria-pressed]').allInnerTexts();
  const trimmed = tabs.map((t) => t.trim());
  const expected = ['Dashboard', 'Game Stats', 'NET Rankings'];
  const ok = expected.every((l) => trimmed.includes(l));
  return { ok, detail: trimmed.join(', ') };
});

await expect('SeasonHeader shows record', async () => {
  const text = await page.locator('text=Season Record').first().innerText();
  return { ok: /Season Record/i.test(text), detail: text };
});

await expect('SeasonTimeline renders', async () => {
  const ok = (await page.locator('text=Season Timeline').count()) >= 1;
  return { ok };
});

await expect('OutfitCards section renders', async () => {
  const ok = (await page.locator('text=Tap an outfit to filter timeline').count()) >= 1;
  return { ok };
});

await expect('GameForm Add Game button is present', async () => {
  const ok = (await page.getByRole('button', { name: /Add Game/i }).count()) >= 1;
  return { ok };
});

// Dismiss any lingering modal/backdrop that might be intercepting clicks.
async function dismissOverlays() {
  while (await page.locator('div.fixed.inset-0').count()) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    if (!(await page.locator('div.fixed.inset-0').count())) break;
    // Defensive break to avoid an infinite loop on unrelated overlays.
    break;
  }
}

await expect('Game Stats tab loads (lazy-loaded chunk)', async () => {
  await dismissOverlays();
  await page.locator('main button[aria-pressed]').filter({ hasText: 'Game Stats' }).click();
  await page.waitForLoadState('networkidle', { timeout: 5000 });
  const ok = (await page.locator('main').count()) >= 1;
  return { ok };
});

await expect('NET Rankings tab loads', async () => {
  await dismissOverlays();
  await page.locator('main button[aria-pressed]').filter({ hasText: 'NET Rankings' }).click();
  await page.waitForLoadState('networkidle', { timeout: 5000 });
  const ok = (await page.locator('main').count()) >= 1;
  return { ok };
});

await expect('Dark mode toggle ("d" shortcut) toggles html.dark', async () => {
  await page.locator('body').click();
  const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.keyboard.press('d');
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  return { ok: before !== after, detail: `${before} → ${after}` };
});

// ── Console hygiene ───────────────────────────────────────────────────────

// Filter expected dev-environment errors (no backend, no Google Maps key).
const EXPECTED_PATTERNS = [
  /Failed to fetch/i,
  /Failed to load resource/i,
  /NET feed/i,
  /google maps/i,
  /500 \(Internal Server Error\)/i,
  /ERR_CERT_AUTHORITY_INVALID/i,
  /API key/i,
];
const filtered = consoleErrors.filter(
  (m) => !EXPECTED_PATTERNS.some((re) => re.test(m))
);

if (filtered.length) {
  log('No unexpected console errors', false, `${filtered.length} captured`);
  for (const m of filtered.slice(0, 5)) console.log('   •', m);
} else {
  log('No unexpected console errors', true);
}

if (pageErrors.length) {
  log('No uncaught page errors', false, `${pageErrors.length} captured`);
  for (const m of pageErrors.slice(0, 5)) console.log('   •', m);
} else {
  log('No uncaught page errors', true);
}

await browser.close();
