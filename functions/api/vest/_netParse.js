// NET ranking parsers. NCAA's JSON uses Rank/School, HTML sometimes puts the
// rank in a row header, and a payload that is not an array must not throw.

export function normalizeTeamName(name) {
  const normalized = String(name ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
  const mapping = {
    'MICHIGAN ST': 'MICHIGAN STATE',
    'MICHIGAN ST.': 'MICHIGAN STATE',
    'OHIO ST': 'OHIO STATE',
    'OHIO ST.': 'OHIO STATE',
    'PENN ST': 'PENN STATE',
    'PENN ST.': 'PENN STATE',
  };
  return mapping[normalized] || normalized;
}

export function stripHtmlTags(value = '') {
  return String(value)
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

function teamText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return teamText(value.name || value.displayName || value.school || value.team || '');
  }
  return '';
}

function field(item, ...names) {
  if (!item || typeof item !== 'object') return undefined;
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const [key, value] of Object.entries(item)) {
    if (!wanted.has(key.toLowerCase())) continue;
    if (value == null || value === '') continue;
    return value;
  }
  return undefined;
}

export function rankingsFromItems(items) {
  if (!Array.isArray(items)) return [];
  const rankings = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const rank = Number.parseInt(field(item, 'rank', 'net', 'net_rank'), 10);
    const rawTeam = teamText(field(item, 'school', 'team', 'name')).replace(/\([^)]*\)/g, '');
    const team = normalizeTeamName(rawTeam);
    const recordRaw = field(item, 'record', 'rec', 'w-l');
    const record = recordRaw == null ? null : String(recordRaw);
    if (!Number.isFinite(rank) || !team || rank < 1 || rank > 365) continue;
    rankings.push({ team, rank, record });
  }
  return rankings;
}

/** Pull a rankings array out of the shapes the NCAA proxy has used. */
export function itemsFromRankingPayload(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const raw = data.data ?? data.rankings ?? data.items ?? null;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.rankings)) return raw.rankings;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.teams)) return raw.teams;
  }
  return [];
}

function rankingsFromEmbeddedJson(html) {
  const jsonMatches = String(html).matchAll(/(?:var|let|const)\s+\w+\s*=\s*(\[[\s\S]*?\]);/g);
  for (const jsonMatch of jsonMatches) {
    try {
      const arr = JSON.parse(jsonMatch[1]);
      const rankings = rankingsFromItems(arr);
      if (rankings.length > 20) return rankings;
    } catch {
      // The page has plenty of arrays that are not rankings.
    }
  }
  return [];
}

/**
 * Largest HTML table on the page. Rank may be a <th> row header; those rows
 * used to be skipped, which dropped the whole table when every rank was a header.
 */
export function parseGenericRankingsTable(html = '') {
  if (!html || typeof html !== 'string') return [];

  const embedded = rankingsFromEmbeddedJson(html);
  if (embedded.length > 20) return embedded;

  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = html.match(tableRegex);
  if (!tables || tables.length === 0) return [];

  const bestTable = tables.reduce((best, table) => {
    const bestRows = (best.match(/<tr/gi) || []).length;
    const tableRows = (table.match(/<tr/gi) || []).length;
    return tableRows > bestRows ? table : best;
  });

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...bestTable.matchAll(rowRegex)];
  let rankCol = -1;
  let teamCol = -1;
  let recordCol = -1;

  if (rows.length > 0) {
    const headerCells = [...String(rows[0][1] || '').matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
      .map((match) => stripHtmlTags(match[1]).trim().toLowerCase());
    for (let col = 0; col < headerCells.length; col += 1) {
      const header = headerCells[col];
      if (rankCol === -1 && /^(#|rank|net|net rk|net rank)$/.test(header)) rankCol = col;
      if (teamCol === -1 && /^(team|school|name)$/.test(header)) teamCol = col;
      if (recordCol === -1 && /^(record|rec|w-l|overall)$/.test(header)) recordCol = col;
    }
  }
  if (teamCol === -1) teamCol = rankCol === 0 ? 1 : 0;
  if (rankCol === -1) rankCol = teamCol === 0 ? 1 : 0;

  const results = [];
  for (let i = 1; i < rows.length; i += 1) {
    const rowHtml = rows[i][1] || '';
    if (!/<td[\s>]/i.test(rowHtml)) continue;

    const cells = [...rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
      .map((match) => stripHtmlTags(match[1]));
    if (cells.length < 2) continue;

    const rank = Number.parseInt(cells[rankCol], 10);
    const team = normalizeTeamName(cells[teamCol] || '');
    if (!Number.isFinite(rank) || !team || rank < 1 || rank > 365) continue;

    let record = recordCol >= 0 && recordCol < cells.length ? cells[recordCol] : null;
    if (record && !/^\d+-\d+$/.test(record)) record = null;
    if (!record) {
      for (let col = 0; col < cells.length; col += 1) {
        if (col !== rankCol && col !== teamCol && /^\d+-\d+$/.test(cells[col])) {
          record = cells[col];
          break;
        }
      }
    }
    results.push({ team, rank, record: record || null });
  }

  return results;
}
