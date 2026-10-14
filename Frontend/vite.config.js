import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_DEV_BACKEND || "http://localhost:5000";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // Same-origin in development too, so the refresh cookie just works.
      proxy: {
        "/api": { target: backend, changeOrigin: true },
        "/socket.io": { target: backend, ws: true, changeOrigin: true },
      },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            charts: ["chart.js", "react-chartjs-2", "recharts"],
            maps: ["leaflet", "react-leaflet"],
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.js"],
      css: false,
    },
  };
});
