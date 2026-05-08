import { describe, it, expect } from 'vitest';
import {
  findLargestTable,
  normalizeTeamName,
  parseRankingsHtml,
  parseTableRows,
  stripHtmlTags,
} from '../../shared/html-parsing.js';

describe('stripHtmlTags', () => {
  it('removes tags and decodes common entities', () => {
    expect(stripHtmlTags('<b>Wisconsin</b>&nbsp;Badgers')).toBe('Wisconsin Badgers');
    expect(stripHtmlTags('Tom &amp; Jerry')).toBe('Tom & Jerry');
    expect(stripHtmlTags('&lt;tag&gt;')).toBe('<tag>');
    expect(stripHtmlTags('it&#39;s &quot;ok&quot;')).toBe(`it's "ok"`);
  });

  it('collapses whitespace runs', () => {
    expect(stripHtmlTags('<p>a</p>\n\n<p>  b   </p>')).toBe('a b');
  });

  it('handles empty and missing inputs', () => {
    expect(stripHtmlTags('')).toBe('');
    expect(stripHtmlTags()).toBe('');
  });
});

describe('normalizeTeamName', () => {
  it('uppercases and trims', () => {
    expect(normalizeTeamName('  wisconsin  ')).toBe('WISCONSIN');
  });

  it('expands common Big Ten abbreviations', () => {
    expect(normalizeTeamName('Michigan St')).toBe('MICHIGAN STATE');
    expect(normalizeTeamName('Michigan St.')).toBe('MICHIGAN STATE');
    expect(normalizeTeamName('Ohio St')).toBe('OHIO STATE');
    expect(normalizeTeamName('Penn St.')).toBe('PENN STATE');
  });

  it('passes through unknown names verbatim (uppercased)', () => {
    expect(normalizeTeamName('Indiana')).toBe('INDIANA');
  });
});

describe('findLargestTable', () => {
  it('returns null with no tables', () => {
    expect(findLargestTable('<div>nope</div>')).toBe(null);
    expect(findLargestTable('')).toBe(null);
  });

  it('picks the table with the most <tr>s', () => {
    const html = `
      <table><tr><td>1</td></tr></table>
      <table><tr><td>a</td></tr><tr><td>b</td></tr><tr><td>c</td></tr></table>
    `;
    const t = findLargestTable(html);
    expect((t.match(/<tr/g) || []).length).toBe(3);
  });
});

describe('parseTableRows', () => {
  it('extracts cells per row with tags stripped', () => {
    const html = `
      <table>
        <tr><th>Rank</th><th>Team</th></tr>
        <tr><td>1</td><td><a>Wisconsin</a></td></tr>
        <tr><td>2</td><td>Michigan</td></tr>
      </table>
    `;
    const table = findLargestTable(html);
    const rows = parseTableRows(table);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(['Rank', 'Team']);
    expect(rows[1]).toEqual(['1', 'Wisconsin']);
  });
});

describe('parseRankingsHtml', () => {
  const sampleHtml = `
    <html><body>
      <table>
        <tr><th>Rank</th><th>School</th><th>Record</th></tr>
        <tr><td>1</td><td>Auburn</td><td>20-2</td></tr>
        <tr><td>2</td><td>Wisconsin</td><td>19-3</td></tr>
        <tr><td>3</td><td>Michigan St</td><td>18-4</td></tr>
        <tr><td colspan="3">noise row</td></tr>
      </table>
    </body></html>
  `;

  it('returns one entry per data row with rank/team/record', () => {
    const rankings = parseRankingsHtml(sampleHtml);
    expect(rankings).toHaveLength(3);
    expect(rankings[0]).toEqual({ team: 'AUBURN', rank: 1, record: '20-2' });
    expect(rankings[2].team).toBe('MICHIGAN STATE');
  });

  it('skips ranks outside 1..363', () => {
    const html = `
      <table>
        <tr><th>Rank</th><th>Team</th></tr>
        <tr><td>0</td><td>Bogus</td></tr>
        <tr><td>500</td><td>Bogus2</td></tr>
        <tr><td>50</td><td>Real</td></tr>
      </table>
    `;
    const rankings = parseRankingsHtml(html);
    expect(rankings).toEqual([{ team: 'REAL', rank: 50, record: null }]);
  });

  it('finds the record by regex when no record header is present', () => {
    const html = `
      <table>
        <tr><th>Rank</th><th>School</th><th>misc</th></tr>
        <tr><td>1</td><td>Auburn</td><td>20-2</td></tr>
      </table>
    `;
    expect(parseRankingsHtml(html)[0].record).toBe('20-2');
  });

  it('returns [] for malformed input', () => {
    expect(parseRankingsHtml('')).toEqual([]);
    expect(parseRankingsHtml('<div>no tables</div>')).toEqual([]);
  });
});
