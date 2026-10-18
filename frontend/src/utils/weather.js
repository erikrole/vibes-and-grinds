import { getVisitCoordinates } from './coords.js';
import { parseLocalDate } from './dates.js';

// Open-Meteo: free, no key. The forecast endpoint serves the last ~90 days and
// the next 16; older dates come from the archive endpoint.
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const FORECAST_WINDOW_DAYS = 85;
const FUTURE_LIMIT_DAYS = 15;
const DAILY_FIELDS = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max';

const cache = new Map();

// WMO weather interpretation codes -> label + emoji.
const WMO = [
  [[0], 'Clear', '☀️'],
  [[1], 'Mostly clear', '🌤️'],
  [[2], 'Partly cloudy', '⛅'],
  [[3], 'Overcast', '☁️'],
  [[45, 48], 'Fog', '🌫️'],
  [[51, 53, 55, 56, 57], 'Drizzle', '🌦️'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'Rain', '🌧️'],
  [[71, 73, 75, 77, 85, 86], 'Snow', '🌨️'],
  [[95, 96, 99], 'Thunderstorm', '⛈️'],
];

export function describeWeatherCode(code) {
  const hit = WMO.find(([codes]) => codes.includes(Number(code)));
  return hit ? { label: hit[1], icon: hit[2] } : { label: 'Weather', icon: '🌡️' };
}

function daysFromToday(dateStr, now = new Date()) {
  const date = parseLocalDate(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((date - today) / 86400000);
}

/** Build the Open-Meteo request URL for one visit day, or null if it can't be fetched. */
export function buildWeatherUrl(visit, now = new Date()) {
  const coords = getVisitCoordinates(visit);
  const offset = daysFromToday(visit?.date, now);
  if (!coords || offset === null || offset > FUTURE_LIMIT_DAYS) return null;
  const base = offset < -FORECAST_WINDOW_DAYS ? ARCHIVE_URL : FORECAST_URL;
  const params = new URLSearchParams({
    latitude: coords.lat.toFixed(3),
    longitude: coords.lng.toFixed(3),
    start_date: visit.date,
    end_date: visit.date,
    daily: DAILY_FIELDS,
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'auto',
  });
  return `${base}?${params}`;
}

/** Reduce an Open-Meteo daily response to the fields the UI shows, or null. */
export function parseWeather(json) {
  const d = json?.daily;
  if (!d || !Array.isArray(d.time) || d.time.length === 0) return null;
  const high = d.temperature_2m_max?.[0];
  const low = d.temperature_2m_min?.[0];
  if (high == null || low == null) return null;
  return {
    ...describeWeatherCode(d.weather_code?.[0]),
    high: Math.round(high),
    low: Math.round(low),
    precipitation: d.precipitation_sum?.[0] ?? 0,
    wind: Math.round(d.wind_speed_10m_max?.[0] ?? 0),
    forecast: false,
  };
}

/** Fetch the day's weather at a visit's coordinates. Resolves null when unavailable. */
export async function fetchVisitWeather(visit, { signal, now = new Date() } = {}) {
  const url = buildWeatherUrl(visit, now);
  if (!url) return null;
  if (cache.has(url)) return cache.get(url);
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const weather = parseWeather(await res.json());
    if (weather) {
      weather.forecast = daysFromToday(visit.date, now) >= 0;
      // Forecasts change; only cache settled days.
      if (!weather.forecast) cache.set(url, weather);
    }
    return weather;
  } catch {
    return null;
  }
}

export function formatWeatherSummary(w) {
  if (!w) return '';
  const rain = w.precipitation >= 0.05 ? `, ${w.precipitation.toFixed(2)} in` : '';
  return `${w.label} · ${w.high}°/${w.low}°${rain}`;
}
