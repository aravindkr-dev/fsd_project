import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Dev proxy so the browser talks to one origin; the API stays on :5000.
    proxy: { '/api': 'http://localhost:5000' },
  },
})
