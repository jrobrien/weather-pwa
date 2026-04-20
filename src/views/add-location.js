import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addLocation } from '../store/locations.js';
import { findNearestStation } from '../services/noaa.js';

// Custom pin avoids the Vite/Leaflet default-marker-image issue
const PIN_ICON = L.divIcon({
  className: '',
  html: '<div class="map-pin"></div>',
  iconSize: [22, 28],
  iconAnchor: [11, 28],
  popupAnchor: [0, -28],
});

/**
 * Open the add-location map modal.
 * @param {function} onAdded  called with the new location's id after save
 */
export function openAddLocationModal(onAdded) {
  // ── Build modal DOM ────────────────────────────────────────────────────────
  const modal = document.createElement('div');
  modal.className = 'modal add-loc-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="add-loc-sheet">
      <div class="add-loc-map-wrap">
        <div class="add-loc-mapbox" id="add-loc-mapbox"></div>
        <button class="add-loc-gps-btn" title="Center on my location">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          </svg>
        </button>
      </div>
      <div class="add-loc-form">
        <div class="add-loc-hint" id="add-loc-hint">Tap the map to place a pin</div>
        <input class="add-loc-name-input" id="add-loc-name"
               placeholder="Location name" type="text" maxlength="50"
               autocomplete="off" spellcheck="false">
        <div class="add-loc-type-row">
          <button class="add-type-btn active" data-type="fishing">Fishing</button>
          <button class="add-type-btn" data-type="hiking">Hiking</button>
        </div>
        <div class="add-loc-footer">
          <button class="add-loc-cancel">Cancel</button>
          <button class="add-loc-save" disabled>Add Location</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const hint      = modal.querySelector('#add-loc-hint');
  const nameInput = modal.querySelector('#add-loc-name');
  const saveBtn   = modal.querySelector('.add-loc-save');
  const typeBtns  = modal.querySelectorAll('.add-type-btn');

  let map          = null;
  let marker       = null;
  let pinLatLng    = null;
  let nearestStation = null;
  let selectedType = 'fishing';

  // ── Init map after paint ───────────────────────────────────────────────────
  requestAnimationFrame(() => {
    map = L.map('add-loc-mapbox', { zoomControl: true });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    // Default to San Diego area; GPS will override
    map.setView([32.72, -117.15], 10);
    centerOnGPS();

    map.on('click', e => placePin(e.latlng));
  });

  // ── GPS centering ──────────────────────────────────────────────────────────
  function centerOnGPS() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => map?.setView([pos.coords.latitude, pos.coords.longitude], 10),
      () => {},  // stay at default if denied
      { timeout: 8000, maximumAge: 60000 }
    );
  }

  // ── Pin placement ──────────────────────────────────────────────────────────
  async function placePin(latlng) {
    pinLatLng = latlng;

    if (marker) marker.remove();
    marker = L.marker(latlng, { icon: PIN_ICON }).addTo(map);

    hint.textContent = 'Finding nearest tide station\u2026';
    hint.className = 'add-loc-hint';
    saveBtn.disabled = true;

    try {
      nearestStation = await findNearestStation(latlng.lat, latlng.lng);
      if (nearestStation) {
        hint.innerHTML = `<span class="station-found">Station: ${nearestStation.name} &mdash; ${nearestStation.distanceMiles.toFixed(0)} mi</span>`;
      } else {
        hint.innerHTML = `<span class="station-none">No tide station within 50 miles</span>`;
        nearestStation = null;
      }
    } catch {
      hint.textContent = 'Could not look up tide station';
      nearestStation = null;
    }

    updateSave();
  }

  function updateSave() {
    saveBtn.disabled = !(pinLatLng && nameInput.value.trim());
  }

  // ── Type toggle ────────────────────────────────────────────────────────────
  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
    });
  });

  // ── Save ───────────────────────────────────────────────────────────────────
  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name || !pinLatLng) return;

    const noaaStationId = (selectedType === 'fishing' && nearestStation)
      ? nearestStation.id
      : null;

    const loc = addLocation({ name, lat: pinLatLng.lat, lon: pinLatLng.lng, type: selectedType, noaaStationId });
    close();
    onAdded(loc.id);
  });

  nameInput.addEventListener('input', updateSave);

  // ── GPS btn / cancel / backdrop ────────────────────────────────────────────
  modal.querySelector('.add-loc-gps-btn').addEventListener('click', centerOnGPS);
  modal.querySelector('.add-loc-cancel').addEventListener('click', close);
  modal.querySelector('.modal-backdrop').addEventListener('click', close);

  document.addEventListener('keydown', onKey);
  function onKey(e) { if (e.key === 'Escape') close(); }

  function close() {
    document.removeEventListener('keydown', onKey);
    if (map) { map.remove(); map = null; }
    modal.remove();
  }
}
