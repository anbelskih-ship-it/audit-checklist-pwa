import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.GITHUB_PAGES ? '/audit-checklist-pwa/' : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Аудит Чек-лист',
        short_name: 'Аудит',
        start_url: base,
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2979FF',
        lang: 'ru',
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
