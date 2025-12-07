import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './' // 👈 Ensures CSS and JS use relative paths for static hosting (like Vercel)
})
