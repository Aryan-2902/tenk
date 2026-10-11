import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Every browser this app targets supports ES2020 natively. The default
    // target ships transpiled helpers that Lighthouse flags as legacy
    // JavaScript and that nothing here needs.
    target: 'es2020',
    rollupOptions: {
      output: {
        /**
         * Only the framework is pinned to its own chunk — it is on every
         * page anyway, so a stable filename means it stays cached between
         * deploys.
         *
         * Do NOT add heavy libraries here. Naming `recharts` as a manual
         * chunk made Rollup promote it to a static import of the entry, so
         * 106 KiB of chart code downloaded on every page including ones with
         * no chart at all. Left alone, Vite keeps it inside the lazily
         * loaded route that actually imports it. Measured, not guessed.
         */
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
