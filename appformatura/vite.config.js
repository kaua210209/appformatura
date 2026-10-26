import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['manifest.json'],
    manifest: {
      name: 'Entrada Show', short_name: 'Entrada Show', description: 'Controle de músicas para entradas de formatura',
      theme_color: '#080b12', background_color: '#080b12', display: 'standalone', orientation: 'any',
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'] }
  })]
})
