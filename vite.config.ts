import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')) },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon-v7.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
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
          { src: '/icon-192-v7.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-v7.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-192-v7.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-maskable-512-v7.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
