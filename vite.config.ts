import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative asset paths are required for a Manifest V3 extension page.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: ['chrome110', 'firefox115'],
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
  },
})
