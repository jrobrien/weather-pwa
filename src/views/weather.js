import { getGridPoint, getForecastHourly } from '../services/nws.js';
import { cacheGridPoint } from '../store/locations.js';

const FMT_HOUR = { hour: 'numeric', hour12: true };
const FMT_DAY  = { weekday: 'long', month: 'short', day: 'numeric' };

function fmtHour(iso) {
  return new Date(iso).toLocaleTimeString('en-US', FMT_HOUR);
}

export async function renderWeather(el, loc) {
  el.innerHTML = '<div class="view-loading">Loading weather\u2026</div>';
  try {
    let gp = loc.nwsGridPoint;
    if (!gp) {
      gp = await getGridPoint(loc.lat, loc.lon);
      cacheGridPoint(loc.id, gp);
    }

    const periods = await getForecastHourly(gp.forecastHourly);
    const display = periods.slice(0, 36);
    const cur = display[0];
    const rest = display.slice(1);

    el.innerHTML = `
      <div class="card wx-hero">
        <div class="wx-hero-top">
          <div>
            <div class="wx-temp">${cur.temperature}<span class="wx-deg">°${cur.temperatureUnit}</span></div>
            <div class="wx-condition">${cur.shortForecast}</div>
            <div class="wx-sub">${cur.windDirection} ${cur.windSpeed}</div>
          </div>
          <img class="wx-icon" src="${cur.icon.replace('size=small', 'size=medium')}" alt="">
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
  } catch (err) {
    el.innerHTML = `<div class="view-error">Weather unavailable<br><small>${err.message}</small></div>`;
  }
}
