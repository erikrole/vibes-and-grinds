import { json } from './auth.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const NCAA_API = 'https://ncaa-api.henrygd.me/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings';
const NCAA_HTML = 'https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings';
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

const chicagoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function seasonEndYear(dateStr) {
  const [year, month] = String(dateStr || '').split('-').map(Number);
  if (!year || !month) return null;
  return month >= 7 ? year + 1 : year;
}

export function parseNetUpdated(updated) {
  const match = String(updated || '').match(/([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (!match) return null;
  const month = MONTHS[match[1].slice(0, 3).toLowerCase()];
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (!month || !day || !year) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function classifyNetRelease({ updated, teamCount = 0, now = new Date() } = {}) {
  const today = chicagoDate.format(now);
  const current = seasonEndYear(today);
  const updatedDate = parseNetUpdated(updated);
  if (updatedDate) {
    const updatedSeason = seasonEndYear(updatedDate);
    if (updatedSeason === current && teamCount >= 50) return 'released';
    return 'unreleased';
  }
  const month = Number(today.slice(5, 7));
  const inWindow = month === 12 || month <= 4;
  return inWindow && teamCount >= 50 ? 'released' : 'unreleased';
}

function stripHtml(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseNcaaApiPayload(data) {
  const items = Array.isArray(data?.data) ? data.data : Array.isArray(data?.rankings) ? data.rankings : [];
  const rankings = [];
  for (const item of items) {
    const rank = Number.parseInt(item.Rank ?? item.RANK ?? item.rank ?? item.NET, 10);
    const team = String(item.School || item.SCHOOL || item.school || item.team || item.name || '').replace(/\([^)]*\)/g, '').trim();
    if (!Number.isFinite(rank) || rank < 1 || rank > 400 || !team) continue;
    rankings.push({ team, rank, record: item.Record || item.RECORD || item.record || null });
  }
  return { updated: data?.updated || null, rankings };
}

export function parseRankingsHtml(html = '') {
  const updatedMatch = String(html).match(/Through Games\s+[A-Za-z]+\.?\s+\d{1,2},?\s+\d{4}/i);
  const updated = updatedMatch ? updatedMatch[0] : null;
  const tables = [...String(html).matchAll(/<table[\s\S]*?<\/table>/gi)].map((match) => match[0]);
  if (!tables.length) return { updated, rankings: [] };
  const best = tables.reduce((current, table) => (
    (table.match(/<tr/gi) || []).length > (current.match(/<tr/gi) || []).length ? table : current
  ));
  const rows = [...best.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  let rankCol = 0;
  let teamCol = 1;
  let recordCol = -1;
  if (rows[0]) {
    const headers = [...rows[0][1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((match) => stripHtml(match[1]).toLowerCase());
    headers.forEach((header, index) => {
      if (/^(#|rank|net|net rk|net rank)$/.test(header)) rankCol = index;
      if (/^(team|school|name)$/.test(header)) teamCol = index;
      if (/^(record|rec|w-l|overall)$/.test(header)) recordCol = index;
    });
  }
  const rankings = [];
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index][1].includes('<th')) continue;
    const cells = [...rows[index][1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripHtml(match[1]));
    const rank = Number.parseInt(cells[rankCol], 10);
    const team = (cells[teamCol] || '').replace(/\([^)]*\)/g, '').trim();
    if (!Number.isFinite(rank) || rank < 1 || rank > 400 || !team) continue;
    const record = recordCol >= 0
      ? cells[recordCol]
      : cells.find((cell, cellIndex) => cellIndex !== rankCol && cellIndex !== teamCol && /^\d+-\d+$/.test(cell)) || null;
    rankings.push({ team, rank, record });
  }
  return { updated, rankings };
}

const fetchOptions = () => ({
  headers: { 'User-Agent': UA, Accept: 'application/json,text/html' },
  signal: AbortSignal.timeout(12000),
});

async function fetchNcaaApi(fetcher) {
  const rankings = [];
  let updated = null;
  for (let page = 1; page <= 8; page += 1) {
    const url = page === 1 ? NCAA_API : `${NCAA_API}?page=${page}`;
    const response = await fetcher(url, fetchOptions());
    if (!response.ok) throw new Error(`ncaa-api ${response.status}`);
    const data = await response.json();
    const parsed = parseNcaaApiPayload(data);
    updated = updated || parsed.updated;
    rankings.push(...parsed.rankings);
    if (page >= Number(data.pages || 1)) break;
  }
  return { updated, rankings };
}

async function fetchHtmlSource(fetcher, url) {
  const response = await fetcher(url, fetchOptions());
  if (!response.ok) throw new Error(`${response.status}`);
  return parseRankingsHtml(await response.text());
}

export async function collectNetRankings(fetcher = fetch, now = new Date()) {
  const today = chicagoDate.format(now);
  const season = seasonEndYear(today);
  const errors = [];
  const sources = [
    { name: 'ncaa-api', load: () => fetchNcaaApi(fetcher) },
    { name: 'ncaa.com', load: () => fetchHtmlSource(fetcher, NCAA_HTML) },
    { name: 'warrennolan', load: () => fetchHtmlSource(fetcher, `https://www.warrennolan.com/basketball/${season}/net`) },
  ];
  for (const source of sources) {
    try {
      const parsed = await source.load();
      const status = classifyNetRelease({ updated: parsed.updated, teamCount: parsed.rankings.length, now });
      if (status === 'unreleased') {
        return {
          status,
          season,
          rankings: [],
          netRankings: {},
          source: source.name,
          updated: parsed.updated || null,
        };
      }
      if (parsed.rankings.length >= 50) {
        return {
          status: 'released',
          season,
          rankings: parsed.rankings,
          netRankings: Object.fromEntries(parsed.rankings.map((entry) => [entry.team, entry.rank])),
          source: source.name,
          updated: parsed.updated || null,
        };
      }
      errors.push(`${source.name}: ${parsed.rankings.length} teams`);
    } catch (error) {
      errors.push(`${source.name}: ${error.message}`);
    }
  }
  const error = new Error('All NET ranking sources failed.');
  error.details = errors;
  throw error;
}

function payloadResponse(payload) {
  const maxAge = payload.status === 'released' ? 21600 : 3600;
  return json(payload, 200, { 'Cache-Control': `public, max-age=${maxAge}` });
}

export async function netRankingsRoute(request, { fetcher = fetch, cache, now = new Date() } = {}) {
  const cacheKey = new Request(`${new URL(request.url).origin}/api/vest/net-rankings`, { method: 'GET' });
  try {
    const payload = await collectNetRankings(fetcher, now);
    const response = payloadResponse(payload);
    if (cache) await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    if (cache) {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    }
    return json({
      error: 'All NET ranking sources failed.',
      details: error.details || [error.message],
      status: 'error',
      rankings: [],
    }, 502);
  }
}
