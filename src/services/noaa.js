// src/services/noaa.js
// NOAA CO-OPS Tides & Currents API — free, no key required
// Docs: https://api.tidesandcurrents.noaa.gov/api/prod/

const NOAA_BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

// Format a Date object to NOAA's expected format: yyyyMMdd
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// Use this instead of new Date() for default arguments
function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Fetch high/low tide predictions for a NOAA station.
 * This is the primary function you'll use — returns the tide table
 * for a date range as an array of high/low events.
 *
 * Datum MLLW (Mean Lower Low Water) is the standard for tide tables
 * and matches what's printed in tide books.
 *
 * @param {string} stationId  — 7-digit NOAA station ID e.g. "9410170"
 * @param {Date}   beginDate  — start date (default: today)
 * @param {Date}   endDate    — end date (default: 3 days from today)
 * @returns {Promise<Array>}  array of tide events
 */
export async function getTidePredictions(
  stationId,
  beginDate = new Date(),
  endDate = new Date(today().getTime() + 3 * 24 * 60 * 60 * 1000)
) {
  const params = new URLSearchParams({
    station:   stationId,
    product:   'predictions',
    datum:     'MLLW',
    interval:  'hilo',        // high/low events only (not 6-minute intervals)
    units:     'english',     // feet
    time_zone: 'lst_ldt',     // local standard/daylight time
    format:    'json',
    begin_date: formatDate(beginDate),
    end_date:   formatDate(endDate),
    application: 'weather-pwa'
  });

  const url = `${NOAA_BASE}?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`NOAA tides fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // NOAA returns errors in the JSON body rather than HTTP status codes
  if (data.error) {
    throw new Error(`NOAA API error: ${data.error.message}`);
  }

  return data.predictions;
  // Each prediction object:
  //   .t  — time string "2025-06-15 06:23"
  //   .v  — water height in feet e.g. "4.321"
  //   .type — "H" (high) or "L" (low)
}

/**
 * Fetch station metadata — name, location, available products.
 * Useful for verifying a station ID is valid and getting its display name.
 *
 * @param {string} stationId
 * @returns {Promise<object>} station metadata
 */
export async function getStationInfo(stationId) {
  const url = `https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/${stationId}.json`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`NOAA station lookup failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (!data.stations || data.stations.length === 0) {
    throw new Error(`No station found for ID: ${stationId}`);
  }

  return data.stations[0];
  // Useful fields:
  //   .name   — "San Diego"
  //   .lat
  //   .lng
  //   .state  — "CA"
  //   .timezonecorr — timezone offset
}

/**
 * Convenience: fetch tide predictions for today + the next N days.
 *
 * @param {string} stationId
 * @param {number} days — how many days ahead to fetch (default 3)
 * @returns {Promise<Array>}
 */
export async function getTidesForNextDays(stationId, days = 3) {
  const begin = new Date();
  const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return getTidePredictions(stationId, begin, end);
}

/**
 * Fetch 6-minute resolution tide predictions for charting.
 * Returns enough data points to draw a smooth tide curve.
 *
 * Keep the date range short — 6-minute data is verbose:
 *   1 day  = ~240 points
 *   2 days = ~480 points
 * The API limits this product to 1 year per request, but in practice
 * you'll only ever want a day or two for a chart.
 *
 * @param {string} stationId
 * @param {Date}   beginDate — start date (default: today)
 * @param {Date}   endDate   — end date (default: 2 days from today)
 * @returns {Promise<Array>} array of {t, v} objects
 */
export async function getTideCurve(
  stationId,
  beginDate = new Date(),
  endDate = new Date(today().getTime() + 2 * 24 * 60 * 60 * 1000)
) {
  const params = new URLSearchParams({
    station:    stationId,
    product:    'predictions',
    datum:      'MLLW',
    // omitting interval defaults to 6-minute resolution
    units:      'english',    // feet
    time_zone:  'lst_ldt',    // local standard/daylight time
    format:     'json',
    begin_date: formatDate(beginDate),
    end_date:   formatDate(endDate),
    application: 'weather-pwa'
  });

  const url = `${NOAA_BASE}?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`NOAA tide curve fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`NOAA API error: ${data.error.message}`);
  }

  return data.predictions;
  // Each point:
  //   .t — time string "2025-06-15 06:06"
  //   .v — water height in feet e.g. "3.847"
  // Note: no .type field — that only comes with interval: 'hilo'
  // Overlay getTidePredictions() hilo results to mark H/L on the chart.
}
