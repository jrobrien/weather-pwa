import { getTideCurve, getTidePredictions } from '../services/noaa.js';

function parseT(str) {
  // NOAA returns "2025-06-15 06:06" — parse as local time
  return new Date(str.replace(' ', 'T'));
}

function fmtTime(d) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export async function renderTides(el, loc) {
  el.innerHTML = '<div class="view-loading">Loading tides\u2026</div>';
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end1 = new Date(start.getTime() + 24 * 60 * 60 * 1000);   // today only for chart
    const end3 = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days for table

    // Primary station (harmonic) for the smooth curve chart; nearest station
    // (may be subordinate) for the hi/lo table.
    const curveStationId   = loc.noaaPrimaryStationId ?? loc.noaaStationId;
    const hiloStationId    = loc.noaaStationId;
    const curveName        = loc.noaaPrimaryStationName ?? loc.noaaStationName ?? curveStationId;
    const hiloName         = loc.noaaStationName ?? hiloStationId;

    const [curveResult, hiloResult] = await Promise.allSettled([
      getTideCurve(curveStationId, start, end1),
      getTidePredictions(hiloStationId, start, end3),
    ]);

    if (hiloResult.status === 'rejected') throw hiloResult.reason;

    const hilo  = hiloResult.value;
    const curve = curveResult.status === 'fulfilled' ? curveResult.value : null;

    // Source attribution row
    const sameStation = curveStationId === hiloStationId;
    const sourceHtml = curve && !sameStation
      ? `<div class="tide-sources"><span>Chart: ${curveName}</span><span class="tide-source-sep">&middot;</span><span>Table: ${hiloName}</span></div>`
      : `<div class="tide-sources"><span>${sameStation ? 'Source' : 'Table'}: ${hiloName}</span></div>`;

    let tideDay = null;
    const tidesHtml = hilo.map(p => {
      const t = parseT(p.t);
      const isH = p.type === 'H';
      const dayStr = fmtDate(t);
      const sep = dayStr !== tideDay ? `<div class="tide-day-sep">${dayStr}</div>` : '';
      tideDay = dayStr;
      const ht = parseFloat(p.v).toFixed(2).padStart(5, '\u00A0');
      return `${sep}<div class="tide-row">
              <span class="tide-badge ${isH ? 'tide-hi' : 'tide-lo'}">${isH ? 'H' : 'L'}</span>
              <span class="mono">${fmtTime(t)}</span>
              <span class="mono tide-ht">${ht} ft</span>
            </div>`;
    }).join('');

    el.innerHTML = `
      ${curve ? '<canvas class="tide-canvas"></canvas>' : ''}
      ${sourceHtml}
      <div class="card">
        <div class="section-label">Tide Table</div>
        <div class="tide-list">${tidesHtml}</div>
      </div>`;

    if (curve) {
      // Defer drawing until the canvas has real layout dimensions — offsetWidth
      // is 0 when the tides view is hidden (display:none) at render time.
      const canvas = el.querySelector('.tide-canvas');
      const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            ro.disconnect();
            drawChart(entry.target, curve, hilo, start);
          }
        }
      });
      ro.observe(canvas);
    }
  } catch (err) {
    el.innerHTML = `<div class="view-error">Tides unavailable<br><small>${err.message}</small></div>`;
  }
}

const PAD = { t: 20, r: 8, b: 24, l: 30 };

function drawChart(canvas, curve, hilo, day) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const tomorrow = new Date(day.getTime() + 24 * 60 * 60 * 1000);

  const pts = curve
    .map(p => ({ t: parseT(p.t), v: parseFloat(p.v) }))
    .filter(p => p.t >= day && p.t < tomorrow);

  if (!pts.length) return;

  const dW = W - PAD.l - PAD.r;
  const dH = H - PAD.t - PAD.b;
  const minV = Math.min(...pts.map(p => p.v));
  const maxV = Math.max(...pts.map(p => p.v));
  const vSpan = maxV - minV || 1;

  const xOf = t => PAD.l + ((t - day) / (tomorrow - day)) * dW;
  const yOf = v => PAD.t + dH - ((v - minV) / vSpan) * dH;

  // Background
  ctx.fillStyle = '#161b22';
  ctx.fillRect(0, 0, W, H);

  // Date label
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), PAD.l, 13);

  // Horizontal grid lines + y-axis labels
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#8b949e';
  ctx.font = '10px ui-monospace, monospace';
  ctx.textAlign = 'right';
  for (let v = Math.ceil(minV); v <= Math.floor(maxV); v++) {
    const y = Math.round(yOf(v)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(PAD.l, y);
    ctx.lineTo(W - PAD.r, y);
    ctx.stroke();
    ctx.fillText(`${v}`, PAD.l - 4, y + 3.5);
  }

  // Vertical grid lines + x-axis labels
  const X_HOURS = [0, 6, 12, 18, 24];
  const X_LABELS = { 0: '12a', 6: '6a', 12: '12p', 18: '6p', 24: '12a' };
  ctx.strokeStyle = '#30363d';
  for (const h of X_HOURS) {
    const t = new Date(day.getTime() + h * 3600000);
    const x = Math.round(xOf(t)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, PAD.t);
    ctx.lineTo(x, H - PAD.b);
    ctx.stroke();
    ctx.fillStyle = '#8b949e';
    ctx.textAlign = h === 0 ? 'left' : h === 24 ? 'right' : 'center';
    ctx.fillText(X_LABELS[h], h === 0 ? PAD.l : x, H - PAD.b + 12);
  }

  // Filled area under curve
  ctx.beginPath();
  ctx.moveTo(xOf(pts[0].t), yOf(pts[0].v));
  pts.forEach(p => ctx.lineTo(xOf(p.t), yOf(p.v)));
  ctx.lineTo(xOf(pts.at(-1).t), H - PAD.b);
  ctx.lineTo(xOf(pts[0].t), H - PAD.b);
  ctx.closePath();
  ctx.fillStyle = 'rgba(57,208,160,0.10)';
  ctx.fill();

  // Curve line
  ctx.beginPath();
  ctx.moveTo(xOf(pts[0].t), yOf(pts[0].v));
  pts.forEach(p => ctx.lineTo(xOf(p.t), yOf(p.v)));
  ctx.strokeStyle = '#39d0a0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Hi/Lo dots + height labels
  hilo
    .map(p => ({ t: parseT(p.t), v: parseFloat(p.v), type: p.type }))
    .filter(p => p.t >= day && p.t < tomorrow)
    .forEach(p => {
      const x = xOf(p.t);
      const y = yOf(p.v);
      const c = p.type === 'H' ? '#58a6ff' : '#3fb950';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
      ctx.fillStyle = c;
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${p.v.toFixed(1)}`, x, p.type === 'H' ? y - 7 : y + 15);
    });

  // "Now" dashed line
  const now = new Date();
  if (now > day && now < tomorrow) {
    const x = Math.round(xOf(now)) + 0.5;
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#d29922';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, PAD.t);
    ctx.lineTo(x, H - PAD.b);
    ctx.stroke();
    ctx.restore();
  }
}
