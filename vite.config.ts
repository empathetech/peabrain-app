import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://empathetech.github.io/peabrain-app/ in production.
  base: process.env.NODE_ENV === 'production' ? '/peabrain-app/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Peabrain',
        short_name: 'Peabrain',
        description: 'Plan your garden — climate, surface, sun, and season aware.',
        theme_color: '#2f7d32',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // Includes json so the bundled Köppen / frost-date grids in
        // public/data/ are available offline after first load.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
        // The Köppen grid is ~150KB and trips the default 2MB cap once
        // additional reference data lands; lift the per-asset limit.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
