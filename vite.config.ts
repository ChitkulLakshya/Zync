import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";


export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        ws: true,
      },
    },
    headers: {
      // www.google.com + gstatic: Firebase App Check (reCAPTCHA v3); *.googleapis.com covers Firebase Auth & App Check APIs
      'Content-Security-Policy':
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://apis.google.com https://www.googleapis.com https://www.gstatic.com https://www.google.com; " +
        "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://www.google.com; " +
        "connect-src 'self' http://localhost:* ws://localhost:* https://*.googleapis.com https://*.firebaseio.com https://*.firebase.google.com https://www.google.com https://www.gstatic.com https://*.ws.pusherapp.com https://api.github.com https://github.com https://*.onrender.com wss://*.onrender.com; " +
        "worker-src 'self' blob:; " +
        "object-src 'none';",
    }
  },
  build: {
    cssMinify: "esbuild",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["pwa-192x192.png", "pwa-512x512.png", "pwa-maskable-512x512.png"],
      manifestFilename: "manifest.json",
      manifest: {
        name: "ZYNC",
        short_name: "ZYNC",
        description: "ZYNC collaboration platform",
        background_color: "#09090b",
        theme_color: "#09090b",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,json}"],
        navigateFallback: "/index.html",
        // Dashboard bundle is currently >2 MiB; raise cap to avoid SW generation failure on CI.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
