import { getGridPoint, getForecastHourly } from '../services/nws.js';
import { cacheGridPoint } from '../store/locations.js';

const FMT_HOUR = { hour: 'numeric', hour12: true };
const FMT_DAY  = { weekday: 'long', month: 'short', day: 'numeric' };
const FMT_TIME = { hour: 'numeric', minute: '2-digit', hour12: true };

// Track fetch time per location so the user can see data age
const fetchedAt = {};

function fmtHour(iso) {
  return new Date(iso).toLocaleTimeString('en-US', FMT_HOUR);
}

function ageClass(locId) {
  const t = fetchedAt[locId];
  if (!t) return '';
  const min = (Date.now() - t) / 60000;
  if (min > 60) return 'wx-age-danger';
  if (min > 30) return 'wx-age-warn';
  return '';
}

export async function renderWeather(el, loc) {
  // Show previous age badge while loading so the user knows the data might be stale
  const prevAge = fetchedAt[loc.id]
    ? `<span class="wx-age-badge ${ageClass(loc.id)}">Last fetch ${new Date(fetchedAt[loc.id]).toLocaleTimeString('en-US', FMT_TIME)} — refreshing\u2026</span>`
    : '';

  el.innerHTML = `<div class="view-loading">${prevAge || 'Loading weather\u2026'}</div>`;

  try {
    let gp = loc.nwsGridPoint;
    if (!gp) {
      gp = await getGridPoint(loc.lat, loc.lon);
      cacheGridPoint(loc.id, gp);
    }

    const periods = await getForecastHourly(gp.forecastHourly);
    fetchedAt[loc.id] = Date.now();

    const display = periods.slice(0, 36);
    const cur = display[0];
    const rest = display.slice(1);

    const fetchTimeStr = new Date(fetchedAt[loc.id]).toLocaleTimeString('en-US', FMT_TIME);

    el.innerHTML = `
      <div class="card wx-hero">
        <div class="wx-hero-top">
          <div>
            <div class="wx-temp">${cur.temperature}<span class="wx-deg">°${cur.temperatureUnit}</span></div>
            <div class="wx-condition">${cur.shortForecast}</div>
            <div class="wx-sub">${cur.windDirection} ${cur.windSpeed}</div>
            ${gp.relativeLocation?.properties?.city ? `<div class="wx-sub" style="margin-top:2px;color:var(--text-muted)">${gp.relativeLocation.properties.city}, ${gp.relativeLocation.properties.state}</div>` : ''}
          </div>
          <img class="wx-icon" src="${cur.icon.replace('size=small', 'size=medium')}" alt="">
        </div>
        <div class="wx-fetch-row">
          <span class="wx-age-badge">Fetched ${fetchTimeStr}</span>
          <button class="wx-refresh-btn" aria-label="Refresh weather">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div class="card">
        <div class="wx-hourly-list">
          ${rest.map(p => {
            const d = new Date(p.startTime);
            const dayDivider = d.getHours() === 0
              ? `<div class="wx-day-sep">${d.toLocaleDateString('en-US', FMT_DAY)}</div>`
              : '';
            return `${dayDivider}<div class="wx-hour-row">
              <span class="wx-hour-time">${fmtHour(p.startTime)}</span>
              <img class="wx-hour-icon" src="${p.icon}" alt="">
              <span class="wx-hour-body">
                <span class="wx-hour-short">${p.shortForecast}</span>
                <span class="wx-hour-wind">${p.windDirection} ${p.windSpeed}</span>
              </span>
              <span class="wx-hour-temp">${p.temperature}°</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;

    // Refresh button re-invokes this function
    el.querySelector('.wx-refresh-btn').addEventListener('click', () => renderWeather(el, loc));

  } catch (err) {
    el.innerHTML = `<div class="view-error">Weather unavailable<br><small>${err.message}</small></div>`;
  }
}
