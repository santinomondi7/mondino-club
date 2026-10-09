import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'images/mondino_app_logo.jpg',
        ],
        manifest: {
          id: '/',
          name: 'Mondino Club — Farmacia y Perfumería Mondino',
          short_name: 'MondinoClub',
          description:
            'Programa de fidelización para clientes de Farmacia y Perfumería Mondino. Sumá puntos con tu código QR y canjeá beneficios exclusivos.',
          theme_color: '#0F5132',
          background_color: '#FFFFFF',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          orientation: 'portrait-primary',
          icons: [
            {
              src: '/images/mondino_app_logo.jpg',
              sizes: '811x775',
              type: 'image/jpeg',
              purpose: 'any',
            },
            {
              src: '/images/mondino_app_logo.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any maskable',
            },
            {
              src: '/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff,woff2}'],
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio to prevent WebSocket closed errors in Cloud Run proxy
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
