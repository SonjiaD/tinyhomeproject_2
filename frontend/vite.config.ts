import { defineConfig } from 'vite'

// No dev proxy: the app talks to Supabase directly and loads its map data as a bundle
// asset, so there is no backend to forward /api to.
export default defineConfig({})
