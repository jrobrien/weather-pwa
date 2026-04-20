// src/store/locations.js
// Manages the list of saved locations (fishing spots, hiking areas).
// Persists to localStorage as JSON.

const STORAGE_KEY = 'weather-pwa-locations';

// Location object shape:
// {
//   id:             string    — unique identifier, generated on creation
//   name:           string    — display name, e.g. "Shelter Island"
//   lat:            number    — latitude
//   lon:            number    — longitude
//   type:           string    — "fishing" | "hiking"
//   noaaStationId:  string|null — NOAA tide station ID, null for hiking spots
//   nwsGridPoint:   object|null — cached NWS grid point, null until first fetch
// }

/**
 * Load all locations from localStorage.
 * Returns an empty array if nothing is stored yet.
 *
 * @returns {Array}
 */
export function loadLocations() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse locations from localStorage:', e);
    return [];
  }
}

/**
 * Save the full locations array to localStorage.
 *
 * @param {Array} locations
 */
export function saveLocations(locations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
}

/**
 * Add a new location.
 * Generates a unique ID automatically.
 *
 * @param {object} location — all fields except id
 * @returns {object} the new location with id assigned
 */
export function addLocation({
  name, lat, lon, type,
  noaaStationId = null, noaaStationName = null, noaaStationLat = null, noaaStationLon = null,
  noaaPrimaryStationId = null, noaaPrimaryStationName = null, noaaPrimaryStationLat = null, noaaPrimaryStationLon = null,
}) {
  const locations = loadLocations();

  const newLocation = {
    id: crypto.randomUUID(),
    name, lat, lon, type,
    noaaStationId, noaaStationName, noaaStationLat, noaaStationLon,
    noaaPrimaryStationId, noaaPrimaryStationName, noaaPrimaryStationLat, noaaPrimaryStationLon,
    nwsGridPoint: null
  };

  locations.push(newLocation);
  saveLocations(locations);
  return newLocation;
}

/**
 * Remove a location by id.
 *
 * @param {string} id
 */
export function removeLocation(id) {
  const locations = loadLocations().filter(loc => loc.id !== id);
  saveLocations(locations);
}

/**
 * Update a location by id.
 * Pass only the fields you want to change.
 *
 * @param {string} id
 * @param {object} changes
 * @returns {object|null} updated location, or null if not found
 */
export function updateLocation(id, changes) {
  const locations = loadLocations();
  const index = locations.findIndex(loc => loc.id === id);
  if (index === -1) return null;

  locations[index] = { ...locations[index], ...changes };
  saveLocations(locations);
  return locations[index];
}

/**
 * Cache the NWS grid point for a location so we don't re-fetch it every time.
 * Call this after a successful getGridPoint() call in nws.js.
 *
 * @param {string} id
 * @param {object} gridPoint — the properties object from NWS /points response
 */
export function cacheGridPoint(id, gridPoint) {
  updateLocation(id, { nwsGridPoint: gridPoint });
}

/**
 * Get a single location by id.
 *
 * @param {string} id
 * @returns {object|null}
 */
export function getLocation(id) {
  return loadLocations().find(loc => loc.id === id) ?? null;
}

/**
 * Seed some initial locations for development/testing.
 * Call this once from main.js during development.
 * Remove before production.
 */
export function migrateTypes() {
  const locs = loadLocations();
  const MAP = { fishing: 'tides', hiking: 'weather' };
  const next = locs.map(loc => MAP[loc.type] ? { ...loc, type: MAP[loc.type] } : loc);
  if (next.some((loc, i) => loc.type !== locs[i].type)) saveLocations(next);
}

export function seedLocations() {
  if (loadLocations().length > 0) return; // don't overwrite existing data

  addLocation({
    name: 'Cuyamaca',
    lat: 32.8737,
    lon: -116.4162,
    type: 'weather',
    noaaStationId: null
  });

  addLocation({
    name: 'Shelter Island',
    lat: 32.7157,
    lon: -117.1795,
    type: 'tides',
    noaaStationId: '9410230'   // Scripps Pier
  });
}