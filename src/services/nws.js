// services/nws.js
// National Weather Service API — free, no key required
// Docs: https://www.weather.gov/documentation/services-web-api

const NWS_BASE = 'https://api.weather.gov';

// NWS requires a User-Agent header identifying your app.
// They use this for contact if your app causes problems.
// Format: (appname, contact)
const HEADERS = {
  'User-Agent': '(weather-pwa, obrien987@gmail.com)',
  'Accept': 'application/geo+json'
};

/**
 * Step 1: Resolve a lat/lon to an NWS grid point.
 * Returns the metadata object from api.weather.gov/points/{lat},{lon}
 * Cache this — it doesn't change for a given location.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<object>} NWS grid point properties
 */
export async function getGridPoint(lat, lon) {
  const url = `${NWS_BASE}/points/${lat},${lon}`;
  const res = await fetch(url, { headers: HEADERS });

  if (!res.ok) {
    throw new Error(`NWS points lookup failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.properties;
  // Useful fields in properties:
  //   .forecast         — URL for 12-hour period forecast
  //   .forecastHourly   — URL for hourly forecast
  //   .forecastGridData — URL for raw grid data
  //   .relativeLocation.properties.city
  //   .relativeLocation.properties.state
  //   .timeZone
  //   .radarStation
}

/**
 * Step 2: Fetch the 7-day forecast using the URL from getGridPoint().
 * Returns an array of forecast periods.
 *
 * @param {string} forecastUrl — from gridPoint.forecast
 * @returns {Promise<Array>} forecast periods
 */
export async function getForecast(forecastUrl) {
  const res = await fetch(forecastUrl, { headers: HEADERS });

  if (!res.ok) {
    throw new Error(`NWS forecast fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.properties.periods;
  // Each period has:
  //   .name              — "Tonight", "Wednesday", "Wednesday Night", etc.
  //   .startTime         — ISO 8601
  //   .endTime           — ISO 8601
  //   .isDaytime         — boolean
  //   .temperature       — number
  //   .temperatureUnit   — "F"
  //   .windSpeed         — "10 mph" (string)
  //   .windDirection     — "SW"
  //   .shortForecast     — "Mostly Cloudy"
  //   .detailedForecast  — full paragraph description
  //   .icon              — URL to NWS icon image
}

/**
 * Step 2 (alternate): Fetch hourly forecast.
 * More granular — useful for same-day planning.
 *
 * @param {string} forecastHourlyUrl — from gridPoint.forecastHourly
 * @returns {Promise<Array>} hourly forecast periods
 */
export async function getForecastHourly(forecastHourlyUrl) {
  const res = await fetch(forecastHourlyUrl, { headers: HEADERS });

  if (!res.ok) {
    throw new Error(`NWS hourly forecast fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.properties.periods;
  // Same structure as getForecast() periods but one entry per hour.
  // .detailedForecast is usually empty for hourly — use .shortForecast
}

/**
 * Convenience: fetch everything for a lat/lon in one call.
 * On first call for a location this makes 2 HTTP requests.
 * Cache gridPoint in your location store to reduce to 1 on subsequent calls.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<object>} { gridPoint, forecast, forecastHourly }
 */
export async function getWeatherForLocation(lat, lon) {
  const gridPoint = await getGridPoint(lat, lon);

  const [forecast, forecastHourly] = await Promise.all([
    getForecast(gridPoint.forecast),
    getForecastHourly(gridPoint.forecastHourly)
  ]);

  return { gridPoint, forecast, forecastHourly };
}