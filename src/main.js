// src/main.js
import { seedLocations, loadLocations } from './store/locations.js';
import { renderWeather } from './views/weather.js';
import { renderTides }   from './views/tides.js';
import { renderSun }     from './views/sun.js';

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
    li.className = 'location-item' + (loc.id === selectedLocationId ? ' selected' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', loc.id === selectedLocationId);
    li.innerHTML = `
      <span class="location-type-badge badge-${loc.type}">${loc.type}</span>
      <span class="location-item-name">${loc.name}</span>
      <span class="location-item-coords">${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}</span>
    `;
    li.addEventListener('click', () => selectLocation(loc.id));
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

// Close modal on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLocationModal();
});

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
