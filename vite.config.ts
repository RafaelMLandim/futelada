import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA: instala no celular ("Adicionar à tela inicial") e funciona sem internet
    VitePWA({
      registerType: 'autoUpdate',
      // o service worker é registrado no main.tsx (só no site; o app de loja já tem tudo dentro)
      injectRegister: false,
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'sons/*.mp3'],
      manifest: {
        name: 'Dois ou Dez',
        short_name: 'Dois ou Dez',
        description: 'Pelada e torneio: lista de chegada, rodízio de times, placar, cartões e tabela.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        // gira com o celular (a chave do mata-mata em tela cheia fica melhor deitada)
        orientation: 'any',
        background_color: '#FFD23F',
        theme_color: '#10223A',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // versão nova entra na hora (sem esperar fechar todas as abas do app)
        skipWaiting: true,
        clientsClaim: true,
        // guarda o app e os áudios de gol para tocar sem internet
        globPatterns: ['**/*.{js,css,html,png,svg,mp3}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // /__/auth/ é a volta do login do Google (servida pelo Firebase Hosting, não pelo app)
        navigateFallbackDenylist: [/^\/__\//],
        runtimeCaching: [{
          urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
          handler: 'CacheFirst',
          options: { cacheName: 'fontes', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        }],
      },
    }),
  ],
})
