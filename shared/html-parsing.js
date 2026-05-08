// Shared HTML utilities used by NET rankings scrapers in both
// backend/server.js (Express, CommonJS) and functions/api/vest/* (Cloudflare,
// ESM). This module is ESM-first; backend/server.js loads it via dynamic
// import() to avoid forcing the legacy server onto ESM.

const TEAM_NAME_MAP = {
  'MICHIGAN ST': 'MICHIGAN STATE',
  'MICHIGAN ST.': 'MICHIGAN STATE',
  'OHIO ST': 'OHIO STATE',
  'OHIO ST.': 'OHIO STATE',
  'PENN ST': 'PENN STATE',
  'PENN ST.': 'PENN STATE',
};

export function stripHtmlTags(value = '') {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeTeamName(name) {
  const normalized = name.toUpperCase().trim();
  return TEAM_NAME_MAP[normalized] || normalized;
}

/**
 * Find the largest <table> on a page (most rows wins).
 * Returns the raw HTML for the table, or null if none found.
 */
export function findLargestTable(html) {
  if (!html) return null;
  const tables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi);
  if (!tables || tables.length === 0) return null;
  return tables.reduce((best, table) => {
    const bestRows = (best.match(/<tr/gi) || []).length;
    const tableRows = (table.match(/<tr/gi) || []).length;
    return tableRows > bestRows ? table : best;
  });
}

/**
 * Parse rows from a table HTML fragment. Returns an array of cell-arrays
 * (with HTML stripped). The first row is yielded as-is even if it is a
 * header row — callers decide whether to use it as header.
 */
export function parseTableRows(tableHtml) {
  if (!tableHtml) return [];
  const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  return rows.map((row) => {
    const cells = [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)];
    return cells.map((m) => stripHtmlTags(m[1]));
  });
}

/**
 * Generic NET-rankings parser. Detects rank/team/record columns from the
 * largest table on the page and returns [{ team, rank, record }].
 */
export function parseRankingsHtml(html = '') {
  const results = [];
  const table = findLargestTable(html);
  if (!table) return results;

  const allRows = parseTableRows(table);
  if (allRows.length === 0) return results;

  let rankCol = -1;
  let teamCol = -1;
  let recordCol = -1;

  const header = allRows[0].map((c) => c.toLowerCase());
  for (let c = 0; c < header.length; c++) {
    const h = header[c];
    if (rankCol === -1 && /^(#|rank|net|net rk|net rank)$/.test(h)) rankCol = c;
    if (teamCol === -1 && /^(team|school|name)$/.test(h)) teamCol = c;
    if (recordCol === -1 && /^(record|rec|w-l|overall)$/.test(h)) recordCol = c;
  }
  if (teamCol === -1) teamCol = rankCol === 0 ? 1 : 0;
  if (rankCol === -1) rankCol = teamCol === 0 ? 1 : 0;

  // Skip the header row.
  for (let i = 1; i < allRows.length; i++) {
    const cells = allRows[i];
    if (cells.length < 2) continue;

    const rank = Number.parseInt(cells[rankCol], 10);
    const team = normalizeTeamName((cells[teamCol] || '').trim());
    if (!Number.isFinite(rank) || !team || rank < 1 || rank > 363) continue;

    let record = recordCol >= 0 && recordCol < cells.length ? cells[recordCol] : null;
    if (!record) {
      for (let c = 0; c < cells.length; c++) {
        if (c !== rankCol && c !== teamCol && /^\d+-\d+$/.test(cells[c])) {
          record = cells[c];
          break;
        }
      }
    }
    results.push({ team, rank, record });
  }

  return results;
}
