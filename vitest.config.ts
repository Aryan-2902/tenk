import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // The default 5s is tight for a component test on a slower machine —
    // this suite's own environment setup alone has been observed taking
    // over 10s there. 15s gives real headroom without hiding a test that is
    // actually hung (it still fails, just later).
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/features/**/*.tsx'],
      exclude: ['src/**/*.d.ts'],
    },
  },
})
