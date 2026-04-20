# weather-pwa

Personal PWA for fishing and hiking use. Mobile-first, dark theme.

## Stack
- Vanilla JS + Vite
- No framework

## Services (all verified working)
- `src/services/nws.js` — NWS weather forecast (two-step: points → forecast)
- `src/services/noaa.js` — NOAA CO-OPS tide predictions and 6-min curve data
- `src/services/sun.js` — suncalc, offline, sunrise/sunset/twilight/moon phase
- `src/store/locations.js` — localStorage location store

## Current state
Shell UI complete — tabs, location modal, dark theme.
Views are stubs (placeholder text), ready to be filled in.

## Next steps
- Weather view
- Sun/moon view  
- Tides view with chart
- Alarm view