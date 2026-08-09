import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode: _mode }) => ({
  define: {
    __FIREBASE_API_KEY__: JSON.stringify(process.env.VITE_FIREBASE_API_KEY || ''),
    __FIREBASE_AUTH_DOMAIN__: JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN || ''),
    __FIREBASE_PROJECT_ID__: JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID || ''),
    __FIREBASE_STORAGE_BUCKET__: JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET || ''),
    __FIREBASE_MESSAGING_SENDER_ID__: JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
    __FIREBASE_APP_ID__: JSON.stringify(process.env.VITE_FIREBASE_APP_ID || ''),
  },
  server: {
    host: '::',
    port: 8081,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        ws: true,
      },
    },
    headers: {

      'Content-Security-Policy':
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://apis.google.com https://www.googleapis.com https://www.gstatic.com https://www.google.com; " +
        "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://www.google.com; " +
        "connect-src 'self' http://localhost:* ws://localhost:* https://apis.google.com https://*.googleapis.com https://*.firebaseio.com https://*.firebase.google.com https://www.google.com https://www.gstatic.com https://*.ws.pusherapp.com https://api.github.com https://github.com https://*.onrender.com wss://*.onrender.com; " +
        "worker-src 'self' blob:; " +
        "object-src 'none';",
    },
  },
  build: {
    cssMinify: 'esbuild',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: _mode === 'development' ? 'prompt' : 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['zync-white.webp', 'zync-dark.webp'],
      manifestFilename: 'manifest.json',
      manifest: {
        name: 'ZYNC',
        short_name: 'ZYNC',
        description: 'ZYNC collaboration platform',
        background_color: '#09090b',
        theme_color: '#09090b',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/zync-white.webp',
            sizes: '192x192',
            type: 'image/webp',
          },
          {
            src: '/zync-white.webp',
            sizes: '512x512',
            type: 'image/webp',
          },
          {
            src: '/zync-white.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
        navigateFallback: '/index.html',

        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
