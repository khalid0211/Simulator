import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the local backend during development so the app
    // works same-origin (matches the nginx /api reverse proxy in production).
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
