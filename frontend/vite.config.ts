import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// No dev proxy: the app talks to Supabase directly and loads its map data as a bundle
// asset, so there is no backend to forward /api to.
export default defineConfig({
  // Pinned to v4 — v5+ requires Vite 8 and this project is on Vite 5. Without this plugin
  // esbuild still compiles JSX, but there is no Fast Refresh, so every edit reloads a page
  // holding a 46,970-feature map.
  plugins: [react()],

  build: {
    rollupOptions: {
      output: {
        // Split the large, rarely-changing libraries out of the app chunk so they stay cached
        // across deploys instead of being invalidated by any application change.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          leaflet: ['leaflet', 'react-leaflet'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
