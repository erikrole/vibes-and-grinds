import type { VestGame } from '../types';

// ranking: Wisconsin's AP ranking at tip-off (null = unranked). Fill in from the ESPN schedule screenshot.
// Cast: rows omit `overtime` when false; consumers treat the missing value as falsy.
export const vestGames = ([
  { id: 1,  date: '2025-11-03', opponent: 'Campbell',         location: 'vs', outfit: 'Dark Gray Vest',          result: 'W', ranking: null },
  { id: 2,  date: '2025-11-07', opponent: 'Northern Illinois',location: 'vs', outfit: 'Red Vest',                result: 'W', ranking: null },
  { id: 3,  date: '2025-11-11', opponent: 'Ball State',       location: 'vs', outfit: 'Black Zipup Vest',        result: 'W', ranking: null },
  { id: 4,  date: '2025-11-17', opponent: 'SIU Edwardsville', location: 'vs', outfit: 'Black with Bucky',        result: 'W', ranking: null },
  { id: 5,  date: '2025-11-21', opponent: 'BYU',              location: 'N',  outfit: 'Puffer with Block W',     result: 'L', ranking: 9 },
  { id: 6,  date: '2025-11-27', opponent: 'Providence',       location: 'N',  outfit: 'Red Vest',                result: 'W', ranking: null },
  { id: 7,  date: '2025-11-28', opponent: 'TCU',              location: 'N',  outfit: 'Black Pullover',          result: 'L', ranking: null },
  { id: 8,  date: '2025-12-03', opponent: 'Northwestern',     location: 'vs', outfit: 'Blue Suit',               result: 'W', ranking: null },
  { id: 9,  date: '2025-12-06', opponent: 'Marquette',        location: 'vs', outfit: 'Dark Gray Suit',          result: 'W', ranking: null },
  { id: 10, date: '2025-12-10', opponent: 'Nebraska',         location: '@',  outfit: 'Black with Old W/Bucky',  result: 'L', ranking: 23 },
  { id: 11, date: '2025-12-19', opponent: 'Villanova',        location: 'N',  outfit: 'Dark Gray Vest',          result: 'L', ranking: null, overtime: true },
  { id: 12, date: '2025-12-22', opponent: 'Central Michigan', location: 'vs', outfit: 'Red Vest',                result: 'W', ranking: null },
  { id: 13, date: '2025-12-30', opponent: 'Milwaukee',        location: 'vs', outfit: 'Light Gray Vest',         result: 'W', ranking: null },
  { id: 14, date: '2026-01-03', opponent: 'Purdue',           location: 'vs', outfit: 'Blue Suit',               result: 'L', ranking: 5 },
  { id: 15, date: '2026-01-06', opponent: 'UCLA',             location: 'vs', outfit: 'Red Vest',                result: 'W', ranking: null },
  { id: 16, date: '2026-01-10', opponent: 'Michigan',         location: '@',  outfit: 'Light Gray Vest',         result: 'W', ranking: 2 },
  { id: 17, date: '2026-01-13', opponent: 'Minnesota',        location: '@',  outfit: 'Red Vest',                result: 'W', ranking: null },
  { id: 18, date: '2026-01-17', opponent: 'Rutgers',          location: 'vs', outfit: 'Light Gray Vest',         result: 'W', ranking: null },
  { id: 19, date: '2026-01-22', opponent: 'Penn State',       location: '@',  outfit: 'Red Vest',                result: 'W', ranking: null },
  { id: 20, date: '2026-01-25', opponent: 'USC',              location: 'vs', outfit: 'Light Gray Vest',         result: 'L', ranking: null },
  { id: 21, date: '2026-01-28', opponent: 'Minnesota',        location: 'vs', outfit: 'Red Vest',                result: 'W', ranking: null },
  { id: 22, date: '2026-01-31', opponent: 'Ohio State',       location: 'vs', outfit: 'Blue Suit',               result: 'W', ranking: null },
  { id: 23, date: '2026-02-07', opponent: 'Indiana',          location: '@',  outfit: 'Black Vest',              result: 'L', ranking: null, overtime: true },
  { id: 24, date: '2026-02-10', opponent: 'Illinois',         location: '@',  outfit: 'Red Vest',                result: 'W', ranking: 8, overtime: true },
  { id: 25, date: '2026-02-13', opponent: 'Michigan State',   location: 'vs', outfit: 'Gray Suit Coat',          result: 'W', ranking: 10 },
  { id: 26, date: '2026-02-17', opponent: 'Ohio State',       location: '@',  outfit: 'Red Vest',                result: 'L', ranking: null },
] as unknown) as VestGame[];
