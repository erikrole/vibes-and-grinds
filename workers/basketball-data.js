/**
 * Cloudflare Worker for Basketball Data
 *
 * Fetches Big Ten conference standings from WarrenNolan, AP Poll from NCAA.com,
 * and full D1 NET rankings via shared/ncaa.js (NCAA.com → NCAA API → WarrenNolan).
 *
 * Response shape:
 *   {
 *     standings: [ { team, conf, ovr, apRank, netRank, wins, losses, confWins, confLosses } ],
 *     netRankings: { "DUKE": 1, "BYU": 14, ... },
 *     rankings: [ { team, rank, record }, ... ]
 *   }
 */

import {
  UA,
  NCAA_URLS,
  stripHtmlTags,
  fetchAllNetRankings,
  parseAPPoll,
} from '../shared/ncaa.js';

const BIG_TEN_URL = 'https://www.warrennolan.com/basketball/2026/conference/Big-Ten';

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      const [conferenceResponse, apPollResponse] = await Promise.all([
        fetch(BIG_TEN_URL, { headers: { 'User-Agent': UA } }),
        fetch(NCAA_URLS.apPoll, { headers: { 'User-Agent': UA } }),
      ]);

      if (!conferenceResponse.ok) {
        throw new Error(`WarrenNolan conference returned ${conferenceResponse.status}`);
      }

      const conferenceHTML = await conferenceResponse.text();
      const apPollHTML = apPollResponse.ok ? await apPollResponse.text() : '';

      const standings = parseConferenceTable(conferenceHTML);
      if (!standings || standings.length === 0) {
        throw new Error('No standings data found');
      }

      const apRankings = parseAPPoll(apPollHTML);
      for (const team of standings) {
        team.apRank = apRankings[team.team] ?? 999;
      }

      const netResult = await fetchAllNetRankings();

      // Backfill with Big Ten data we already have from the conference page
      for (const team of standings) {
        if (team.netRank && !netResult.netRankings[team.team]) {
          netResult.netRankings[team.team] = team.netRank;
          netResult.rankings.push({ team: team.team, rank: team.netRank, record: team.ovr });
        }
      }

      return new Response(JSON.stringify({
        standings,
        netRankings: netResult.netRankings,
        rankings: netResult.rankings,
        netSource: netResult.source,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};

/**
 * Parse WarrenNolan conference standings table (/conference/Big-Ten)
 * Columns: Rank | Team | Conf Record | Conf Win% | GB | Overall Record | Overall Win% | NET | Q1
 */
function parseConferenceTable(html) {
  const standings = [];

  try {
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = html.match(tableRegex);
    if (!tables || tables.length === 0) throw new Error('No tables found');

    let standingsTable = null;
    for (const table of tables) {
      if (table.includes('-') && (table.match(/<tr/gi) || []).length > 5) {
        standingsTable = table;
        break;
      }
    }
    if (!standingsTable) throw new Error('Could not find standings table');

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [...standingsTable.matchAll(rowRegex)];

    for (let i = 1; i < rows.length; i++) {
      const rowHTML = rows[i][1];
      if (rowHTML.includes('<th')) continue;

      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells = [...rowHTML.matchAll(cellRegex)].map((m) => stripHtmlTags(m[1]));

      if (cells.length < 8) continue;

      const teamName = cells[1];
      const confRecord = cells[2];
      const ovrRecord = cells[5];
      const netRankStr = cells[7];

      if (!teamName || !confRecord || !ovrRecord) continue;

      const confMatch = confRecord.match(/(\d+)-(\d+)/);
      const ovrMatch = ovrRecord.match(/(\d+)-(\d+)/);

      standings.push({
        team: teamName.toUpperCase(),
        conf: confRecord,
        ovr: ovrRecord,
        apRank: 999,
        netRank: netRankStr && /^\d+$/.test(netRankStr) ? parseInt(netRankStr, 10) : null,
        wins: ovrMatch ? parseInt(ovrMatch[1], 10) : 0,
        losses: ovrMatch ? parseInt(ovrMatch[2], 10) : 0,
        confWins: confMatch ? parseInt(confMatch[1], 10) : 0,
        confLosses: confMatch ? parseInt(confMatch[2], 10) : 0,
      });
    }
  } catch (error) {
    throw new Error(`Conference parse error: ${error.message}`);
  }

  return standings;
}
