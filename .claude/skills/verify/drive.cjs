// Drives the local app (Vite on :3000, Express on :3001) with Playwright.
// Usage: NODE_PATH=<dir with playwright> node .claude/skills/verify/drive.cjs <outDir> [shopName]
// Adds one visit, switches to Vest mode, and screenshots both modes at desktop and phone width.
// Any non-GET request to a non-local host is aborted and reported, so nothing writes to production.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.VERIFY_BASE || 'http://localhost:3000';
const out = path.resolve(process.argv[2] || '.claude/verify-output/shots');
const shop = process.argv[3] || `Verify Cafe ${Date.now()}`;
fs.mkdirSync(out, { recursive: true });

const isLocal = (u) => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(u).hostname);
const report = { shop, consoleErrors: [], pageErrors: [], blockedWrites: [], failedRequests: [], external: new Set(), checks: {} };

async function newPage(browser, viewport, label) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  await ctx.route('**/*', (route) => {
    const req = route.request();
    if (!isLocal(req.url()) && req.method() !== 'GET') {
      report.blockedWrites.push(`${label} ${req.method()} ${req.url()}`);
      return route.abort();
    }
    return route.continue();
  });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') report.consoleErrors.push(`${label}: ${m.text()}`); });
  page.on('pageerror', (e) => report.pageErrors.push(`${label}: ${e.message}`));
  page.on('request', (r) => { if (!isLocal(r.url())) report.external.add(new URL(r.url()).host); });
  page.on('requestfailed', (r) => report.failedRequests.push(`${label}: ${r.method()} ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) report.failedRequests.push(`${label}: ${r.status()} ${r.request().method()} ${r.url()}`); });
  return { ctx, page };
}

async function shot(page, name) {
  await page.waitForTimeout(300); // let CSS transitions settle before the capture, not a readiness wait
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: false });
}

async function switchMode(page, label) {
  await page.getByRole('button', { name: /toggle app mode/ }).click();
  await page.getByRole('menuitemradio', { name: label }).click();
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.VERIFY_CHANNEL || 'chrome' });
  try {
    // Desktop: add a visit through the real form, then Vest mode.
    const d = await newPage(browser, { width: 1280, height: 800 }, 'desktop');
    await d.page.goto(BASE, { waitUntil: 'networkidle' });
    await shot(d.page, 'desktop-vibes-before');
    await d.page.getByRole('button', { name: 'Add Visit' }).first().click();
    await d.page.locator('[id$="-coffee-shop-name"]').fill(shop);
    await d.page.locator('[id$="-vibe-rating"]').fill('8.5');
    await d.page.locator('[id$="-coffee-rating"]').fill('7');
    await shot(d.page, 'desktop-add-visit-form');
    await d.page.locator('button[type="submit"]', { hasText: 'Add Visit' }).click();
    await d.page.getByText(shop).first().waitFor({ timeout: 10000 });
    report.checks.visitShownAfterAdd = true;
    await shot(d.page, 'desktop-vibes-after');
    await d.page.reload({ waitUntil: 'networkidle' });
    report.checks.visitPersistsAfterReload = await d.page.getByText(shop).first().isVisible();
    await switchMode(d.page, 'Vest Tracker');
    await d.page.waitForLoadState('networkidle');
    report.checks.vestModeShown = await d.page.locator('.vest-tracker-page').count() === 1;
    await shot(d.page, 'desktop-vest');
    await d.ctx.close();

    // Phone width: both modes, plus a horizontal-overflow check.
    const p = await newPage(browser, { width: 390, height: 844 }, 'phone');
    await p.page.goto(BASE, { waitUntil: 'networkidle' });
    await switchMode(p.page, 'Vibes & Grinds');
    await p.page.waitForLoadState('networkidle');
    report.checks.phoneVisitShown = await p.page.getByText(shop).first().isVisible();
    report.checks.phoneVibesNoHScroll = await p.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    await shot(p.page, 'phone-vibes');
    await switchMode(p.page, 'Vest Tracker');
    await p.page.waitForLoadState('networkidle');
    report.checks.phoneVestNoHScroll = await p.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    await shot(p.page, 'phone-vest');
    await p.ctx.close();
  } catch (e) {
    report.error = e.message.split('\n')[0];
  } finally {
    await browser.close();
  }
  report.external = [...report.external];
  // The only expected error: Places lookups return 503 locally (no Maps key). Anything else fails.
  const places503 = (r) => / 503 GET .*\/api\/places-autocomplete\?/.test(r);
  const expected = report.failedRequests.filter(places503).length;
  const unexpectedRequests = report.failedRequests.filter((r) => !places503(r));
  const console503 = report.consoleErrors.filter((m) => /status of 503/.test(m));
  const unexpectedConsole = [...report.consoleErrors.filter((m) => !/status of 503/.test(m)), ...console503.slice(expected)];
  report.unexpected = [...unexpectedRequests, ...unexpectedConsole];
  const ok = !report.error && report.blockedWrites.length === 0 && report.pageErrors.length === 0
    && report.unexpected.length === 0 && Object.values(report.checks).every(Boolean);
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(ok ? 0 : 1);
})();
