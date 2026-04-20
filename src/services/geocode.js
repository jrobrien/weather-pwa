// Nominatim reverse geocoding — free, no key, OSM-powered
// Policy: max 1 req/sec, identify your app. One call per pin placement is fine.

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';

/**
 * Reverse-geocode a lat/lon to a short human-readable place name.
 * Returns e.g. "Mission Bay, CA" or "Cuyamaca, CA".
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string|null>} null if lookup fails
 */
export async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    lat, lon,
    format: 'json',
    zoom: 14,           // neighbourhood/suburb detail level
    addressdetails: 1,
  });

  const res = await fetch(`${NOMINATIM}?${params}`, {
    headers: { 'Accept-Language': 'en' },
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.address) return null;

  const a = data.address;
  const locality = a.suburb ?? a.neighbourhood ?? a.quarter
                ?? a.hamlet ?? a.village ?? a.town ?? a.city ?? a.county;
  const region   = a.state_code ?? a.state;

  if (locality && region) return `${locality}, ${region}`;
  if (locality)            return locality;
  return data.display_name ?? null;
}
