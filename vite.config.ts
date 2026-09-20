import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,ktx2,wasm}'],
        // the satellite map only works online; the big JPEGs are a fallback for
        // devices that cannot transcode KTX2, fetched on demand rather than up front
        globIgnores: ['**/satmap-*.js', '**/satmap-*.css', '**/earth/*.jpg'],
        runtimeCaching: [
          {
            urlPattern: /\/earth\/.*\.jpg$/,
            handler: 'CacheFirst',
            options: { cacheName: 'earth-fallback', expiration: { maxEntries: 8 } },
          },
          {
            urlPattern: /\/foods\.json\.gz$/,
            handler: 'CacheFirst',
            options: { cacheName: 'foods', expiration: { maxEntries: 2 } },
          },
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: 'Milo',
        short_name: 'Milo',
        description: 'Couch to 5K and progressive lifting. Carried daily, grows slowly.',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0d0f',
        theme_color: '#0b0d0f',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
