import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // SIM_VERSION is a plain (non-VITE_-prefixed) env var so it can be set the
  // same way in Docker/Coolify without special-casing the client build step.
  define: {
    __SIM_VERSION__: JSON.stringify(process.env.SIM_VERSION || "dev"),
  },
  server: {
    // Forward API calls to the local backend during development so the app
    // works same-origin (matches the nginx /api reverse proxy in production).
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
