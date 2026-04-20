// src/main.js
import { seedLocations, loadLocations } from './store/locations.js';
import { renderWeather }        from './views/weather.js';
import { renderTides }           from './views/tides.js';
import { renderSun }             from './views/sun.js';
import { openAddLocationModal }   from './views/add-location.js';
import { maybeShowInstallPrompt } from './views/ios-install-prompt.js';
import { removeLocation }         from './store/locations.js';

// ── Seed dev data ──────────────────────────────────────────────────────────
seedLocations();

// ── State ──────────────────────────────────────────────────────────────────
let activeView = 'weather';
let selectedLocationId = loadLocations()[0]?.id ?? null;

// ── DOM refs ───────────────────────────────────────────────────────────────
const tabs          = document.querySelectorAll('.tab');
const views         = document.querySelectorAll('.view');
const locationName  = document.getElementById('location-name');
const locationBtn   = document.getElementById('location-btn');
const locationModal = document.getElementById('location-modal');
const locationList  = document.getElementById('location-list');
const backdrop      = locationModal.querySelector('.modal-backdrop');
const addLocationBtn = document.getElementById('add-location-btn');
const tideTab       = document.querySelector('.tab[data-view="tides"]');

// ── Tab navigation ─────────────────────────────────────────────────────────
function switchView(viewName) {
  activeView = viewName;

  tabs.forEach(tab => {
    const isActive = tab.dataset.view === viewName;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  views.forEach(view => {
    view.classList.toggle('active', view.id === `view-${viewName}`);
  });
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => switchView(tab.dataset.view));
});

// ── Location helpers ───────────────────────────────────────────────────────
function getSelectedLocation() {
  return loadLocations().find(loc => loc.id === selectedLocationId) ?? null;
}

function updateHeaderLocation() {
  const loc = getSelectedLocation();
  locationName.textContent = loc ? loc.name : 'Select location';

  // Hide tides tab for hiking spots that have no NOAA station
  const hasTides = loc?.noaaStationId != null;
  tideTab.classList.toggle('hidden', !hasTides);

  // If currently on tides view and location has no tides, switch to weather
  if (!hasTides && activeView === 'tides') {
    switchView('weather');
  }
}

function renderPlaceholder(viewEl, message) {
  viewEl.innerHTML = `
    <div class="placeholder">
      <p>${message}</p>
    </div>
  `;
}

// ── Location modal ─────────────────────────────────────────────────────────
function renderLocationList() {
  const locations = loadLocations();
  locationList.innerHTML = '';

  if (locations.length === 0) {
    locationList.innerHTML = '<li style="color: var(--text-muted); font-size: 14px; padding: 8px 10px;">No locations saved yet.</li>';
    return;
  }

  locations.forEach(loc => {
    const li = document.createElement('li');
    li.className = 'location-item-wrap';

    const inner = document.createElement('div');
    inner.className = 'location-item' + (loc.id === selectedLocationId ? ' selected' : '');
    inner.setAttribute('role', 'option');
    inner.setAttribute('aria-selected', loc.id === selectedLocationId);
    inner.innerHTML = `
      <span class="location-type-badge badge-${loc.type}">${loc.type}</span>
      <span class="location-item-name">${loc.name}</span>
      <span class="location-item-coords">${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}</span>
    `;
    inner.addEventListener('click', () => {
      if (inner.dataset.swiping) return; // ignore tap if swipe was in progress
      selectLocation(loc.id);
    });

    li.appendChild(inner);
    attachSwipeDelete(li, inner, loc);
    locationList.appendChild(li);
  });
}

function openLocationModal() {
  renderLocationList();
  locationModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLocationModal() {
  locationModal.hidden = true;
  document.body.style.overflow = '';
}

function selectLocation(id) {
  selectedLocationId = id;
  updateHeaderLocation();
  loadViewData();
  closeLocationModal();
}

locationBtn.addEventListener('click', openLocationModal);
backdrop.addEventListener('click', closeLocationModal);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLocationModal();
});

// ── Add location ───────────────────────────────────────────────────────────
addLocationBtn.addEventListener('click', () => {
  closeLocationModal();
  openAddLocationModal(newId => {
    selectedLocationId = newId;
    updateHeaderLocation();
    loadViewData();
  });
});

// ── Swipe to delete ────────────────────────────────────────────────────────
function attachSwipeDelete(wrap, inner, loc) {
  const THRESHOLD = 80;

  // Real DOM button — pseudo-elements can't receive clicks
  const delBtn = document.createElement('button');
  delBtn.className = 'swipe-del-btn';
  delBtn.textContent = 'Delete';
  delBtn.setAttribute('aria-label', `Delete ${loc.name}`);
  wrap.insertBefore(delBtn, inner);
  delBtn.addEventListener('click', doDelete);

  let startX = 0, startY = 0, dx = 0, dragging = false, active = false;

  function onStart(clientX, clientY) {
    startX = clientX; startY = clientY;
    dx = 0; dragging = false; active = true;
    inner.style.transition = 'none';
    delete inner.dataset.swiping;
  }

  function onMove(clientX, clientY) {
    if (!active) return;
    dx = clientX - startX;
    const dy = clientY - startY;
    if (!dragging && (Math.abs(dx) < 8 || Math.abs(dy) > Math.abs(dx))) return;
    if (dx > 0) return;
    dragging = true;
    inner.dataset.swiping = '1';
    inner.style.transform = `translateX(${Math.max(dx, -THRESHOLD - 20)}px)`;
    wrap.classList.toggle('swipe-open', dx < -THRESHOLD / 2);
  }

  function onEnd() {
    if (!active) return;
    active = false;
    inner.style.transition = '';
    if (!dragging) { setTimeout(() => delete inner.dataset.swiping, 50); return; }
    if (dx < -THRESHOLD) {
      doDelete();
    } else {
      inner.style.transform = '';
      wrap.classList.remove('swipe-open');
    }
    setTimeout(() => delete inner.dataset.swiping, 50);
  }

  function doDelete() {
    inner.style.transform = 'translateX(-100%)';
    wrap.style.transition = 'max-height 0.25s ease, opacity 0.25s ease';
    wrap.style.maxHeight = wrap.offsetHeight + 'px';
    requestAnimationFrame(() => { wrap.style.maxHeight = '0'; wrap.style.opacity = '0'; });
    setTimeout(() => {
      removeLocation(loc.id);
      if (selectedLocationId === loc.id) {
        selectedLocationId = loadLocations()[0]?.id ?? null;
        updateHeaderLocation();
        loadViewData();
      }
      renderLocationList();
    }, 260);
  }

  // Touch
  inner.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  inner.addEventListener('touchmove',  e => onMove(e.touches[0].clientX, e.touches[0].clientY),  { passive: true });
  inner.addEventListener('touchend',   onEnd, { passive: true });

  // Mouse — attach move/up to document so dragging outside the element still works
  inner.addEventListener('mousedown', e => {
    onStart(e.clientX, e.clientY);
    const up   = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); onEnd(); };
    const move = e => onMove(e.clientX, e.clientY);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
}

// ── View data loading ──────────────────────────────────────────────────────
function loadViewData() {
  const loc = getSelectedLocation();

  if (!loc) {
    views.forEach(view => renderPlaceholder(view, 'Select a location to get started.'));
    return;
  }

  renderWeather(document.getElementById('view-weather'), loc);

  if (loc.noaaStationId) {
    renderTides(document.getElementById('view-tides'), loc);
  } else {
    renderPlaceholder(document.getElementById('view-tides'), 'No tide station for this location.');
  }

  renderSun(document.getElementById('view-sun'), loc);
  renderPlaceholder(document.getElementById('view-alarm'), 'Alarms coming soon.');
}

// ── Init ───────────────────────────────────────────────────────────────────
updateHeaderLocation();
loadViewData();
maybeShowInstallPrompt();
