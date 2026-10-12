/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Permite importar desde src con '@/...' en lugar de rutas relativas largas
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Tipos de archivo que se pueden importar como recursos. No agregar .css, .tsx ni .ts
  assetsInclude: ['**/*.svg', '**/*.csv'],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})