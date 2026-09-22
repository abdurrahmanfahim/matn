import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'وَرّاق — من نص إلى كتاب',
        short_name: 'وَرّاق',
        description: 'حوّل نص كتابك بصيغة Markdown مبسّطة إلى كتاب منسّق بعدة تنسيقات جاهزة للطباعة.',
        start_url: '/',
        display: 'standalone',
        background_color: '#1c1815',
        theme_color: '#1c1815',
        dir: 'rtl',
        lang: 'ar',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Precache every build output (JS/CSS/HTML) — including the
        // lazy-loaded CodeMirror/jszip/mammoth/pdfjs chunks — so the
        // full app works offline after the very first visit, not just
        // whatever the person happened to click into.
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg}'],
        // Raise the default 2MB precache limit — the pdf.js worker
        // alone is ~1.2MB unminified-ish.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Google Fonts stylesheet (the @font-face rules themselves)
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // The actual font files — content-hashed and immutable, so
            // safe to cache aggressively for a long time.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 30 },
            },
          },
        ],
      },
    }),
  ],
})
