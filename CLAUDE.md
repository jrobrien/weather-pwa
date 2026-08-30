# weather-pwa

Personal PWA for fishing and hiking use. Mobile-first, dark theme, offline-capable.
Deploys to GitHub Pages at `/weather-pwa/` via `.github/workflows/deploy.yml` on push to `master`.

## Stack
- Vanilla JS + Vite 8, no framework
- `vite-plugin-pwa` (autoUpdate service worker, runtime caching for NWS + NOAA APIs)
- Leaflet for maps, suncalc for solar/lunar math
- State persisted to `localStorage` (no backend)

## Layout
- `index.html` — app shell: header, four-tab nav, location picker modal
- `src/main.js` — tab routing, location selection, modal wiring, dev seed data
- `src/style.css` — all styles
- `src/services/` — external data:
  - `nws.js` — NWS forecast (two-step: points → hourly forecast)
  - `noaa.js` — NOAA CO-OPS tide predictions, 6-min curve data, nearest-station lookup
  - `sun.js` — suncalc wrapper; offline sunrise/sunset/twilight/moon phase
  - `geocode.js` — Nominatim reverse geocoding (pin → place name)
  - `geo.js` — device geolocation + nearest-saved-location math
- `src/store/locations.js` — localStorage location store, type migration, grid-point cache
- `src/views/` — one module per tab plus modal/prompt helpers:
  - `weather.js`, `tides.js`, `sun.js`, `map-view.js` — the four tabs
  - `add-location.js` — map-based add-location flow
  - `location-map.js` — mini map inside the picker
  - `ios-install-prompt.js` — "Add to Home Screen" banner for iOS Safari

## Current state
All four tabs implemented and working: Weather, Tides, Sun, Map.
Location add/edit/delete works via a map picker with reverse geocoding.
On launch the app renders the first saved location, then swaps to whichever
saved location is nearest the device once geolocation resolves (silent on
denial/timeout). Header location control is a full-width bar — pin left, name
centred, caret right; the picker marks the active location with a check.

## Dev
- `npm install` — clean install, no flags needed. `.npmrc` sets
  `ignore-scripts=true` (supply-chain guard); after adding a dependency that
  needs a build step, run `npm run build` to confirm it still works.
- `npm run dev` — Vite dev server at http://localhost:5173/weather-pwa/
- `npm run build` / `npm run preview`
- `node scripts/gen-icons.mjs` — regenerate PWA icons from the source SVG
