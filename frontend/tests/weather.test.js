import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeatherUrl, describeWeatherCode, formatWeatherSummary, parseWeather } from '../src/utils/weather.js';

const now = new Date(2026, 9, 18);
const visit = (date, lat = 43.07, lng = -89.4) => ({ date, coffee_shop_lat: lat, coffee_shop_lng: lng });

test('recent days use the forecast endpoint', () => {
  const url = buildWeatherUrl(visit('2026-10-10'), now);
  assert.match(url, /api\.open-meteo\.com\/v1\/forecast/);
  assert.match(url, /start_date=2026-10-10/);
  assert.match(url, /temperature_unit=fahrenheit/);
});

test('old days use the archive endpoint', () => {
  assert.match(buildWeatherUrl(visit('2026-03-01'), now), /archive-api\.open-meteo\.com/);
});

test('no URL without coordinates, a valid date, or when too far ahead', () => {
  assert.equal(buildWeatherUrl(visit('2026-10-10', null, null), now), null);
  assert.equal(buildWeatherUrl(visit('nope'), now), null);
  assert.equal(buildWeatherUrl(visit('2026-12-25'), now), null);
});

test('parseWeather reduces a daily response', () => {
  const w = parseWeather({ daily: { time: ['2026-10-10'], weather_code: [61], temperature_2m_max: [54.4], temperature_2m_min: [41.2], precipitation_sum: [0.3], wind_speed_10m_max: [12.6] } });
  assert.equal(w.label, 'Rain');
  assert.equal(w.high, 54);
  assert.equal(w.low, 41);
  assert.equal(formatWeatherSummary(w), 'Rain · 54°/41°, 0.30 in');
});

test('parseWeather returns null for empty or missing data', () => {
  assert.equal(parseWeather(null), null);
  assert.equal(parseWeather({ daily: { time: [] } }), null);
  assert.equal(parseWeather({ daily: { time: ['x'], temperature_2m_max: [null], temperature_2m_min: [null] } }), null);
});

test('unknown weather codes fall back', () => {
  assert.equal(describeWeatherCode(999).label, 'Weather');
});
