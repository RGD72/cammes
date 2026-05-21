import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
