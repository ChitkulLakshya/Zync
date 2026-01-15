import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        changeOrigin: true,
        ws: true,
      },
    },
    headers: {
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://apis.google.com https://www.googleapis.com https://www.gstatic.com; frame-src 'self' https://*.firebaseapp.com https://*.google.com; connect-src 'self' http://localhost:* ws://localhost:* https://*.googleapis.com https://*.firebaseio.com https://*.ws.pusherapp.com https://api.github.com https://github.com https://*.onrender.com wss://*.onrender.com; object-src 'none';"
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
