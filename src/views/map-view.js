import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let _map = null;

function stationIcon(cssClass) {
  return L.divIcon({
    className: '',
    html: `<div class="map-station-dot ${cssClass}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/**
 * Render a map focused on `loc` with pins for the location and its tide stations.
 * Handles display:none by deferring invalidateSize via ResizeObserver.
 */
export function renderMapView(el, loc) {
  if (_map) { _map.remove(); _map = null; }

  el.innerHTML = '<div class="map-view-container"></div>';
  const container = el.querySelector('.map-view-container');

  _map = L.map(container, { zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(_map);

  const pts = [[loc.lat, loc.lon]];

  // Location pin
  L.marker([loc.lat, loc.lon], {
    icon: L.divIcon({
      className: '',
      html: '<div class="map-pin"></div>',
      iconSize: [22, 28],
      iconAnchor: [11, 28],
    }),
  }).addTo(_map)
    .bindTooltip(loc.name, { permanent: true, direction: 'top', offset: [0, -30] });

  if (loc.type === 'tides') {
    const sameStation = loc.noaaPrimaryStationId === loc.noaaStationId ||
                        !loc.noaaPrimaryStationId;

    if (loc.noaaStationLat != null) {
      const css = sameStation ? 'map-station-both' : 'map-station-hilo';
      L.marker([loc.noaaStationLat, loc.noaaStationLon], { icon: stationIcon(css) })
        .addTo(_map)
        .bindTooltip(
          `${sameStation ? 'Station' : 'Table'}: ${loc.noaaStationName || loc.noaaStationId}`,
          { direction: 'top' }
        );
      pts.push([loc.noaaStationLat, loc.noaaStationLon]);
    }

    if (loc.noaaPrimaryStationLat != null && !sameStation) {
      L.marker([loc.noaaPrimaryStationLat, loc.noaaPrimaryStationLon], { icon: stationIcon('map-station-primary') })
        .addTo(_map)
        .bindTooltip(`Chart: ${loc.noaaPrimaryStationName || loc.noaaPrimaryStationId}`, { direction: 'top' });
      pts.push([loc.noaaPrimaryStationLat, loc.noaaPrimaryStationLon]);
    }
  }

  if (pts.length > 1) {
    _map.fitBounds(pts, { padding: [60, 60] });
  } else {
    _map.setView(pts[0], 13);
  }

  // Defer invalidateSize — view may be display:none when first rendered
  const ro = new ResizeObserver(entries => {
    for (const entry of entries) {
      if (entry.contentRect.width > 0) {
        ro.disconnect();
        _map?.invalidateSize();
      }
    }
  });
  ro.observe(container);
}

export function destroyMapView() {
  if (_map) { _map.remove(); _map = null; }
}
