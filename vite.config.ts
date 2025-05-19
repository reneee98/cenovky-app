import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/cenovky/', // Základ URL pre podadresár /cenovky/
  build: {
    outDir: 'dist', // Výstupný adresár
    emptyOutDir: true, // Vyčistiť výstupný adresár pred buildom
    sourcemap: false, // Negenerovať sourcemapy v produkcii
    // Nastavenie pre lepšie chunkovanie JavaScript súborov
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@dnd-kit/core', '@dnd-kit/sortable', 'react-icons'],
        }
      }
    }
  }
})
