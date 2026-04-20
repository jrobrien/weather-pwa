import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addLocation } from '../store/locations.js';
import { findNearestStation, findNearestPrimaryStation } from '../services/noaa.js';
import { reverseGeocode } from '../services/geocode.js';

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
 * @param {function} onAdded    called with the new location's id after save
 * @param {object|null} currentLoc  currently selected location, shown as reference pin
 */
export function openAddLocationModal(onAdded, currentLoc = null) {
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
          <button class="add-type-btn" data-type="tides">Tides</button>
          <button class="add-type-btn active" data-type="weather">Weather Only</button>
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

  let map             = null;
  let marker          = null;
  let pinLatLng       = null;
  let nearestStation  = null;  // closest of any type — hi/lo table
  let primaryStation  = null;  // closest harmonic — curve chart
  let stationMarkers  = [];    // markers shown on the map for found stations
  let selectedType    = 'weather';

  // ── Init map after paint ───────────────────────────────────────────────────
  requestAnimationFrame(() => {
    map = L.map('add-loc-mapbox', { zoomControl: true });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    // Show currently selected location as a reference pin
    if (currentLoc) {
      L.marker([currentLoc.lat, currentLoc.lon], {
        icon: L.divIcon({
          className: '',
          html: '<div class="map-pin map-pin-dim"></div>',
          iconSize: [22, 28], iconAnchor: [11, 28],
        }),
      }).addTo(map).bindTooltip(currentLoc.name, { direction: 'top', offset: [0, -30] });
      map.setView([currentLoc.lat, currentLoc.lon], 12);
    } else {
      map.setView([32.72, -117.15], 12);
    }

    centerOnGPS(true);
    map.on('click', e => placePin(e.latlng));
  });

  // ── GPS centering ──────────────────────────────────────────────────────────
  function centerOnGPS(autoPin = false) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map?.setView([latlng.lat, latlng.lng], 12);
        if (autoPin) placePin(latlng);
      },
      () => {},  // stay at default if denied
      { timeout: 8000, maximumAge: 60000 }
    );
  }

  // ── Pin placement ──────────────────────────────────────────────────────────
  async function placePin(latlng) {
    pinLatLng = latlng;

    if (marker) marker.remove();
    marker = L.marker(latlng, { icon: PIN_ICON }).addTo(map);

    hint.textContent = 'Looking up location\u2026';
    hint.className = 'add-loc-hint';
    saveBtn.disabled = true;

    const [geoResult, anyResult, primaryResult] = await Promise.allSettled([
      reverseGeocode(latlng.lat, latlng.lng),
      findNearestStation(latlng.lat, latlng.lng),
      findNearestPrimaryStation(latlng.lat, latlng.lng),
    ]);

    const geocodedName = geoResult.status === 'fulfilled' ? geoResult.value : null;
    nearestStation = anyResult.status === 'fulfilled' ? anyResult.value : null;
    primaryStation = primaryResult.status === 'fulfilled' ? primaryResult.value : null;

    // Update station markers on the map
    stationMarkers.forEach(m => m.remove());
    stationMarkers = [];
    if (nearestStation) {
      const same = primaryStation?.id === nearestStation.id;
      stationMarkers.push(
        L.marker([nearestStation.lat, nearestStation.lon], {
          icon: L.divIcon({
            className: '',
            html: `<div class="map-station-dot ${same ? 'map-station-both' : 'map-station-hilo'}"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7],
          }),
        }).addTo(map).bindTooltip(`Table: ${nearestStation.name}`, { direction: 'top' })
      );
    }
    if (primaryStation && primaryStation.id !== nearestStation?.id) {
      stationMarkers.push(
        L.marker([primaryStation.lat, primaryStation.lon], {
          icon: L.divIcon({
            className: '',
            html: '<div class="map-station-dot map-station-primary"></div>',
            iconSize: [14, 14], iconAnchor: [7, 7],
          }),
        }).addTo(map).bindTooltip(`Chart: ${primaryStation.name}`, { direction: 'top' })
      );
    }

    updateHint();
    nameInput.value = geocodedName ?? nearestStation?.name ?? '';
    updateSave();
  }

  function updateHint() {
    if (!pinLatLng) return;
    if (selectedType === 'weather') {
      hint.innerHTML = `<span class="station-none">Weather only — no tides</span>`;
      return;
    }
    if (!nearestStation) {
      hint.innerHTML = `<span class="station-none">No tide station within 50 miles</span>`;
      return;
    }
    const sameStation = !primaryStation || primaryStation.id === nearestStation.id;
    if (sameStation) {
      hint.innerHTML = `<span class="station-found">Station: ${nearestStation.name} &mdash; ${nearestStation.distanceMiles.toFixed(0)} mi</span>`;
    } else {
      hint.innerHTML =
        `<span class="station-found">Table: ${nearestStation.name} (${nearestStation.distanceMiles.toFixed(0)} mi)</span><br>` +
        `<span class="station-found">Chart: ${primaryStation.name} (${primaryStation.distanceMiles.toFixed(0)} mi)</span>`;
    }
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
      updateHint();
    });
  });

  // ── Save ───────────────────────────────────────────────────────────────────
  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name || !pinLatLng) return;

    const isTides = selectedType === 'tides';
    const noaaStationId            = (isTides && nearestStation)  ? nearestStation.id    : null;
    const noaaStationName          = (isTides && nearestStation)  ? nearestStation.name  : null;
    const noaaStationLat           = (isTides && nearestStation)  ? nearestStation.lat   : null;
    const noaaStationLon           = (isTides && nearestStation)  ? nearestStation.lon   : null;
    const noaaPrimaryStationId     = (isTides && primaryStation)  ? primaryStation.id    : null;
    const noaaPrimaryStationName   = (isTides && primaryStation)  ? primaryStation.name  : null;
    const noaaPrimaryStationLat    = (isTides && primaryStation)  ? primaryStation.lat   : null;
    const noaaPrimaryStationLon    = (isTides && primaryStation)  ? primaryStation.lon   : null;

    const loc = addLocation({ name, lat: pinLatLng.lat, lon: pinLatLng.lng, type: selectedType,
      noaaStationId, noaaStationName, noaaStationLat, noaaStationLon,
      noaaPrimaryStationId, noaaPrimaryStationName, noaaPrimaryStationLat, noaaPrimaryStationLon });
    close();
    onAdded(loc.id);
  });

  nameInput.addEventListener('input', updateSave);

  // ── GPS btn / cancel / backdrop ────────────────────────────────────────────
  modal.querySelector('.add-loc-gps-btn').addEventListener('click', () => centerOnGPS(false));
  modal.querySelector('.add-loc-cancel').addEventListener('click', close);
  modal.querySelector('.modal-backdrop').addEventListener('click', close);

  document.addEventListener('keydown', onKey);
  function onKey(e) { if (e.key === 'Escape') close(); }

  function close() {
    document.removeEventListener('keydown', onKey);
    stationMarkers.forEach(m => m.remove());
    stationMarkers = [];
    if (map) { map.remove(); map = null; }
    modal.remove();
  }
}
