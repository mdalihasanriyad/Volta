import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Phase 3+: forward API calls to the local Express server
    proxy: { '/api': 'http://localhost:5000' },
  },
})
