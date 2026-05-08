import { describe, it, expect } from 'vitest';
import {
  DEFAULT_NET_RANKINGS_URL,
  ESPN_SCHEDULE_BASE,
  ESPN_SUMMARY_BASE,
  EXTERNAL_CACHE_TTL_S,
  FETCH_TIMEOUT_MS,
  WISCONSIN_TEAM_ID,
  espnSummaryUrl,
  espnTeamScheduleUrl,
} from '../../shared/constants.js';

describe('shared/constants', () => {
  it('exports stable values', () => {
    expect(WISCONSIN_TEAM_ID).toBe('275');
    expect(FETCH_TIMEOUT_MS).toBe(10_000);
    expect(EXTERNAL_CACHE_TTL_S).toBeGreaterThan(0);
    expect(ESPN_SCHEDULE_BASE).toContain('mens-college-basketball/teams');
    expect(ESPN_SUMMARY_BASE).toContain('summary');
    expect(DEFAULT_NET_RANKINGS_URL).toContain('warrennolan.com');
  });
});

describe('espnTeamScheduleUrl', () => {
  it('defaults to Wisconsin', () => {
    expect(espnTeamScheduleUrl('2025')).toBe(`${ESPN_SCHEDULE_BASE}/275/schedule?season=2025`);
  });

  it('honors a custom team id', () => {
    expect(espnTeamScheduleUrl('2024', '99')).toBe(`${ESPN_SCHEDULE_BASE}/99/schedule?season=2024`);
  });
});

describe('espnSummaryUrl', () => {
  it('builds the summary URL for an event', () => {
    expect(espnSummaryUrl('401635120')).toBe(`${ESPN_SUMMARY_BASE}?event=401635120`);
  });
});
