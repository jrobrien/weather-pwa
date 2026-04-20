import { getSolarTimesRange, getMoonPhase, getMoonTimes } from '../services/sun.js';

const FMT_TIME = { hour: 'numeric', minute: '2-digit', hour12: true };
const FMT_DATE = { weekday: 'short', month: 'short', day: 'numeric' };

function fmt(d) {
  return (!d || isNaN(d)) ? '\u2014' : d.toLocaleTimeString('en-US', FMT_TIME);
}

const SOLAR_ROWS = [
  { key: 'astronomicalDawn', label: 'Astro Dawn' },
  { key: 'nauticalDawn',     label: 'Nautical Dawn' },
  { key: 'civilDawn',        label: 'Civil Dawn' },
  { key: 'sunrise',          label: 'Sunrise' },
  { key: 'solarNoon',        label: 'Solar Noon' },
  { key: 'sunset',           label: 'Sunset' },
  { key: 'civilDusk',        label: 'Civil Dusk' },
  { key: 'nauticalDusk',     label: 'Nautical Dusk' },
  { key: 'astronomicalDusk', label: 'Astro Dusk' },
];

export function renderSun(el, loc) {
  const days = getSolarTimesRange(loc.lat, loc.lon, 4);
  const today = days[0];
  const moon = getMoonPhase();
  const moonTimes = getMoonTimes(loc.lat, loc.lon);
  const now = new Date();

  // Find which row is currently active (between this time and the next)
  let activeIdx = -1;
  for (let i = 0; i < SOLAR_ROWS.length - 1; i++) {
    const a = today[SOLAR_ROWS[i].key];
    const b = today[SOLAR_ROWS[i + 1].key];
    if (a && b && now >= a && now < b) { activeIdx = i + 1; break; }
  }

  el.innerHTML = `
    <div class="card">
      <div class="section-label">${today.date.toLocaleDateString('en-US', FMT_DATE)}</div>
      <div class="sun-phases">
        ${SOLAR_ROWS.map((r, i) => {
          const t = today[r.key];
          const past = t && t < now;
          const active = i === activeIdx;
          return `<div class="sun-row${past ? ' sun-past' : ''}${active ? ' sun-active' : ''}">
            <span class="sun-label">${r.label}</span>
            <span class="mono">${fmt(t)}</span>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="moon-top">
        <div>
          <div class="moon-name">${moon.phaseName}</div>
          <div class="moon-illum">${Math.round(moon.fraction * 100)}% illuminated</div>
        </div>
        <canvas class="moon-canvas"></canvas>
      </div>
      <div class="kv-list">
        <div class="kv-row"><span>Moonrise</span><span class="mono">${fmt(moonTimes.rise)}</span></div>
        <div class="kv-row"><span>Moonset</span><span class="mono">${fmt(moonTimes.set)}</span></div>
      </div>
    </div>

    <div class="card">
      <div class="section-label">Upcoming</div>
      <div class="kv-list">
        ${days.slice(1).map(d => `
          <div class="kv-row">
            <span>${d.date.toLocaleDateString('en-US', FMT_DATE)}</span>
            <span class="mono">Rise ${fmt(d.sunrise)}&nbsp; Set ${fmt(d.sunset)}</span>
          </div>
        `).join('')}
      </div>
    </div>`;

  drawMoon(el.querySelector('.moon-canvas'), moon.phase);
}

function drawMoon(canvas, phase) {
  const dpr = window.devicePixelRatio || 1;
  const S = 44;
  canvas.width  = S * dpr;
  canvas.height = S * dpr;
  canvas.style.width  = S + 'px';
  canvas.style.height = S + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = S / 2, cy = S / 2, r = S / 2 - 2;

  // Dark disc base
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1117';
  ctx.fill();
  ctx.strokeStyle = '#484f58';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Illumination fraction 0→1→0 across the phase cycle
  const lit = phase <= 0.5 ? phase * 2 : (1 - phase) * 2;
  if (lit < 0.01) return;

  // Lit shape: a semicircle (waxing=right, waning=left) closed by the terminator
  // kx is the horizontal extent of the terminator ellipse at y=cy:
  //   lit=0 → kx=+r  (terminator coincides with semicircle edge → crescent sliver)
  //   lit=0.5 → kx=0 (straight line → quarter moon)
  //   lit=1 → kx=-r  (terminator on opposite side → full circle)
  const isWaxing = phase < 0.5;
  const kx = r * Math.cos(Math.PI * lit);
  const sign = isWaxing ? 1 : -1;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, !isWaxing);
  // Bezier approximation of the terminator semi-ellipse
  ctx.bezierCurveTo(
    cx + sign * kx, cy + r * 0.5523,
    cx + sign * kx, cy - r * 0.5523,
    cx, cy - r
  );
  ctx.closePath();
  ctx.fillStyle = '#c9d1d9';
  ctx.fill();
  ctx.restore();
}
