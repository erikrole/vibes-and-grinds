// Capture screenshots of both app modes (light + dark) for visual review.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const URL = process.env.URL || 'http://127.0.0.1:3000/';
const OUT = '/tmp/screenshots';
await mkdir(OUT, { recursive: true });

// Seed two visits so vibes mode has interesting content. The list/map
// renders only when fetchVisits succeeds; without a backend we simulate
// by patching the fetch response.
const SEED_VISITS = [
  {
    id: 1,
    date: '2026-01-25',
    coffee_shop_name: 'Colectivo Coffee',
    city: 'Madison',
    opponent: 'USC',
    sport: "Men's Basketball",
    coffee_shop_address: '2301 N Murray St',
    coffee_shop_lat: 43.07,
    coffee_shop_lng: -89.41,
    coffee_order: 'Cortado',
    vibe_rating: 9.0,
    coffee_rating: 9.5,
    composite_score: 18.5,
    notes: 'Sunlit corner table, great mid-trip stop.',
    photo_url: null,
  },
  {
    id: 2,
    date: '2026-01-15',
    coffee_shop_name: 'Sip Café',
    city: 'Minneapolis',
    opponent: 'Minnesota',
    sport: "Men's Basketball",
    coffee_shop_address: '410 Nicollet Mall',
    coffee_shop_lat: 44.97,
    coffee_shop_lng: -93.27,
    coffee_order: 'Latte',
    vibe_rating: 7.5,
    coffee_rating: 8.0,
    composite_score: 15.5,
    notes: '',
    photo_url: null,
  },
  {
    id: 3,
    date: '2026-01-03',
    coffee_shop_name: 'Drift',
    city: 'West Lafayette',
    opponent: 'Purdue',
    sport: "Men's Basketball",
    coffee_shop_address: '113 W State St',
    coffee_shop_lat: 40.42,
    coffee_shop_lng: -86.91,
    coffee_order: 'Drip',
    vibe_rating: 8.0,
    coffee_rating: 7.0,
    composite_score: 15.0,
    notes: 'Crowded but cosy.',
    photo_url: null,
  },
];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

// Stub the visits API + NET feed before navigation.
await page.route('**/api/visits', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(SEED_VISITS),
  });
});
await page.route('**/api/vest/games', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ games: [] }),
  });
});
await page.route('**/api/vest/net-rankings', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      rankings: [],
      netRankings: {},
      source: 'stub',
    }),
  });
});

async function shot(name) {
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 ${path}`);
}

// VIBES mode (light)
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('.hero-numeral', { timeout: 5000 });
await page.waitForTimeout(800); // let lazy chunks settle
await shot('1-vibes-light');

// VIBES mode (dark)
await page.evaluate(() => document.activeElement?.blur());
await page.keyboard.press('d');
await page.waitForTimeout(300);
await shot('2-vibes-dark');

// Helper that sends a key without opening the mode menu (which an h1 click does).
async function pressShortcut(key) {
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press(key);
}

// VIBES — insights tab
await pressShortcut('d'); // back to light
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'Insights', exact: true }).click();
await page.waitForLoadState('networkidle', { timeout: 10000 });
await page.waitForTimeout(1500); // recharts mount
await shot('3-vibes-insights');

// VEST mode
await pressShortcut('v');
await page.waitForSelector('main button[aria-pressed]', { timeout: 8000 });
await page.waitForTimeout(800);
await shot('4-vest-dashboard');

// Game Stats subtab
await page
  .locator('main button[aria-pressed]')
  .filter({ hasText: 'Game Stats' })
  .click();
await page.waitForLoadState('networkidle', { timeout: 5000 });
await page.waitForTimeout(800);
await shot('5-vest-game-stats');

// NET Rankings subtab
await page
  .locator('main button[aria-pressed]')
  .filter({ hasText: 'NET Rankings' })
  .click();
await page.waitForLoadState('networkidle', { timeout: 5000 });
await page.waitForTimeout(800);
await shot('6-vest-net-rankings');

// Mobile width vibes
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const mobilePage = await mobile.newPage();
await mobilePage.route('**/api/visits', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(SEED_VISITS),
  })
);
await mobilePage.goto(URL, { waitUntil: 'networkidle' });
await mobilePage.waitForSelector('.hero-numeral', { timeout: 5000 });
await mobilePage.waitForTimeout(800);
await mobilePage.screenshot({ path: `${OUT}/7-vibes-mobile.png`, fullPage: true });
console.log(`📸 ${OUT}/7-vibes-mobile.png`);

await browser.close();
