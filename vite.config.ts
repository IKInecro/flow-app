import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    pool: 'vmThreads',
    maxWorkers: 2,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
