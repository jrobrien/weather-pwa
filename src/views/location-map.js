import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let _map = null;

function locIcon(selected) {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin${selected ? '' : ' map-pin-dim'}"></div>`,
    iconSize: [22, 28],
    iconAnchor: [11, 28],
  });
}

function stationIcon(cssClass) {
  return L.divIcon({
    className: '',
    html: `<div class="map-station-dot ${cssClass}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/**
 * Render all saved locations (and their tide stations) on a Leaflet map
 * inside `container`. Clicking a location marker calls onSelect(id).
 */
export function showLocationMap(container, locations, selectedId, onSelect) {
  if (_map) { _map.remove(); _map = null; }

  _map = L.map(container, { zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(_map);

  const pts = [];

  for (const loc of locations) {
    const sel = loc.id === selectedId;

    L.marker([loc.lat, loc.lon], { icon: locIcon(sel) })
      .addTo(_map)
      .bindTooltip(loc.name, { permanent: sel, direction: 'top', offset: [0, -30] })
      .on('click', () => onSelect(loc.id));
    pts.push([loc.lat, loc.lon]);

    if (loc.type !== 'tides') continue;

    if (loc.noaaStationLat != null) {
      L.marker([loc.noaaStationLat, loc.noaaStationLon], { icon: stationIcon('map-station-hilo') })
        .addTo(_map)
        .bindTooltip(`Table: ${loc.noaaStationName || loc.noaaStationId}`, { direction: 'top' });
      pts.push([loc.noaaStationLat, loc.noaaStationLon]);
    }

    if (loc.noaaPrimaryStationLat != null && loc.noaaPrimaryStationId !== loc.noaaStationId) {
      L.marker([loc.noaaPrimaryStationLat, loc.noaaPrimaryStationLon], { icon: stationIcon('map-station-primary') })
        .addTo(_map)
        .bindTooltip(`Chart: ${loc.noaaPrimaryStationName || loc.noaaPrimaryStationId}`, { direction: 'top' });
      pts.push([loc.noaaPrimaryStationLat, loc.noaaPrimaryStationLon]);
    }
  }

  if (pts.length > 1) {
    _map.fitBounds(pts, { padding: [50, 50] });
  } else if (pts.length === 1) {
    _map.setView(pts[0], 12);
  }

  requestAnimationFrame(() => _map?.invalidateSize());
}

export function hideLocationMap() {
  if (_map) { _map.remove(); _map = null; }
}
