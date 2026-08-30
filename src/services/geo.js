// src/services/geo.js
// Device geolocation + nearest-saved-location helpers. Distances in miles.

/**
 * Great-circle distance between two lat/lon points, in miles.
 */
export function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3959; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Resolve the device's current position as { lat, lon }.
 * Rejects on permission denial, timeout, or missing geolocation support.
 *
 * @param {PositionOptions} opts
 * @returns {Promise<{lat: number, lon: number}>}
 */
export function getCurrentPosition(opts = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000, ...opts },
    );
  });
}

/**
 * Return the entry from `locations` closest to (lat, lon), or null if the
 * list is empty.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {Array<{lat: number, lon: number}>} locations
 */
export function nearestLocation(lat, lon, locations) {
  let best = null;
  let bestDist = Infinity;
  for (const loc of locations) {
    const d = haversineMiles(lat, lon, loc.lat, loc.lon);
    if (d < bestDist) {
      bestDist = d;
      best = loc;
    }
  }
  return best;
}
