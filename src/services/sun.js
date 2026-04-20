// src/services/sun.js
// Sunrise, sunset, twilight, moon phase — computed locally via suncalc.
// No API call, works fully offline.
//
// Install: npm install suncalc
// Docs: https://github.com/mourner/suncalc

import SunCalc from 'suncalc';

// ─── Twilight phase names in order of darkness ───────────────────────────────
// SunCalc returns these time keys from getTimes():
//
//   sunrise          — top of sun crosses horizon (morning)
//   sunriseEnd       — bottom of sun clears horizon
//   goldenHourEnd    — golden hour ends (soft morning light)
//   solarNoon        — sun at highest point
//   goldenHour       — golden hour begins (soft evening light)
//   sunsetStart      — bottom of sun touches horizon
//   sunset           — top of sun crosses horizon (evening)
//   dusk             — civil dusk   (sun 6° below horizon)
//   nauticalDusk     — nautical dusk (sun 12° below horizon)
//   astronomicalDusk — astronomical dusk (sun 18° below horizon)
//   nadir            — sun at lowest point (solar midnight)
//   astronomicalDawn — astronomical dawn (sun 18° below horizon, rising)
//   nauticalDawn     — nautical dawn (sun 12° below horizon)
//   dawn             — civil dawn   (sun 6° below horizon)

/**
 * Get all solar times for a given location and date.
 * Returns the times most useful for outdoor planning.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {Date}   date — defaults to today
 * @returns {object} solar times as Date objects
 */
export function getSolarTimes(lat, lon, date = new Date()) {
  const times = SunCalc.getTimes(date, lat, lon);

  return {
    astronomicalDawn: times.astronomicalDawn,  // first light
    nauticalDawn:     times.nauticalDawn,       // horizon visible
    civilDawn:        times.dawn,               // outdoor work possible
    sunrise:          times.sunrise,            // sun clears horizon
    solarNoon:        times.solarNoon,          // sun at peak
    sunset:           times.sunset,             // sun touches horizon
    civilDusk:        times.dusk,               // outdoor work still possible
    nauticalDusk:     times.nauticalDusk,       // horizon fades
    astronomicalDusk: times.astronomicalDusk,   // full darkness
    nadir:            times.nadir,              // solar midnight
  };
  // All values are Date objects — format them however you like in the UI.
  // If the sun never sets (midnight sun) or never rises, some values
  // will be NaN. Worth guarding against if you add Alaska locations.
}

/**
 * Get solar times for today and the next N days.
 * Useful for a multi-day trip overview.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {number} days — number of days (default 3)
 * @returns {Array<object>} array of daily solar time objects, each with a .date field
 */
export function getSolarTimesRange(lat, lon, days = 3) {
  const results = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + i);

    results.push({
      date,
      ...getSolarTimes(lat, lon, date)
    });
  }

  return results;
}

/**
 * Get moon phase and illumination for a given date.
 *
 * @param {Date} date — defaults to now
 * @returns {object} moon phase data
 */
export function getMoonPhase(date = new Date()) {
  const illum = SunCalc.getMoonIllumination(date);

  return {
    fraction:  illum.fraction,   // 0.0–1.0, illuminated portion
    phase:     illum.phase,      // 0.0–1.0, position in lunar cycle
    angle:     illum.angle,      // midpoint angle of illuminated limb
    phaseName: getPhaseName(illum.phase),
    isWaxing:  illum.phase < 0.5,
  };
  // phase values:
  //   0.0       new moon
  //   0.0–0.25  waxing crescent
  //   0.25      first quarter
  //   0.25–0.5  waxing gibbous
  //   0.5       full moon
  //   0.5–0.75  waning gibbous
  //   0.75      last quarter
  //   0.75–1.0  waning crescent
  //   1.0       new moon (cycle complete)
}

/**
 * Get moon rise and set times for a location and date.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {Date}   date — defaults to today
 * @returns {object} { rise: Date, set: Date }
 */
export function getMoonTimes(lat, lon, date = new Date()) {
  const times = SunCalc.getMoonTimes(date, lat, lon);

  return {
    rise: times.rise,   // Date or undefined if moon doesn't rise today
    set:  times.set,    // Date or undefined if moon doesn't set today
    alwaysUp:   times.alwaysUp   ?? false,
    alwaysDown: times.alwaysDown ?? false,
  };
}

/**
 * Convenience: get everything needed for a night/dawn planning view.
 * Combines solar times, moon phase, and moon rise/set.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {Date}   date — defaults to today
 * @returns {object} { solar, moon }
 */
export function getNightSummary(lat, lon, date = new Date()) {
  return {
    solar: getSolarTimes(lat, lon, date),
    moon: {
      ...getMoonPhase(date),
      ...getMoonTimes(lat, lon, date),
    }
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Convert a suncalc phase value (0.0–1.0) to a human-readable name.
 *
 * @param {number} phase
 * @returns {string}
 */
function getPhaseName(phase) {
  if (phase < 0.0625 || phase >= 0.9375) return 'New Moon';
  if (phase < 0.1875) return 'Waxing Crescent';
  if (phase < 0.3125) return 'First Quarter';
  if (phase < 0.4375) return 'Waxing Gibbous';
  if (phase < 0.5625) return 'Full Moon';
  if (phase < 0.6875) return 'Waning Gibbous';
  if (phase < 0.8125) return 'Last Quarter';
  return 'Waning Crescent';
}