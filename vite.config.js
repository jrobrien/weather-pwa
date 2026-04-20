import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/weather-pwa/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Weather PWA',
        short_name: 'Weather',
        description: 'Fishing and hiking weather, tides, and sun tracker',
        theme_color: '#0d1117',
        background_color: '#0d1117',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/weather-pwa/',
        start_url: '/weather-pwa/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        runtimeCaching: [
          {
            // NWS forecasts — fresh within 1 hour, fall back to cache
            urlPattern: /^https:\/\/api\.weather\.gov\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nws-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 3600 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // NOAA tides — fresh within 1 hour, fall back to cache
            urlPattern: /^https:\/\/api\.tidesandcurrents\.noaa\.gov\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'noaa-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 3600 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
});
