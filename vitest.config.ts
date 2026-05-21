import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  // Desabilita o pipeline PostCSS do Vite durante testes — não precisamos compilar Tailwind
  // para unit/integration tests. Isso evita carregar `postcss.config.mjs` (Tailwind v4),
  // que usa o plugin como string e quebra o resolver default do PostCSS sob Vitest.
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', '.aiox-core/**', '.aiox/**', 'tests/integration/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
