import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Hash corto del commit desplegado: en Vercel viene por env; en local, de git.
// Identifica cada deploy de forma única, complementa a la versión semántica.
const sha = (
  process.env.VERCEL_GIT_COMMIT_SHA ||
  (() => {
    try {
      return execSync('git rev-parse --short HEAD').toString().trim()
    } catch {
      return 'dev'
    }
  })()
).slice(0, 7)

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt': cuando hay una versión nueva NO se activa sola; avisamos al
      // usuario y él decide actualizar (flujo controlado desde la app)
      registerType: 'prompt',
      injectRegister: null, // el registro lo hace useRegisterSW en la app
      manifest: false, // usamos el manifest propio en public/
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'icon-192.png', 'icon-512.png'],
        // Las splash y las variantes de ícono las carga el SO al abrir; no vale
        // la pena precachearlas (pesan y no se necesitan offline)
        globIgnores: ['splash/**', 'icon-light-*.png', 'icon-dark-*.png'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_SHA__: JSON.stringify(sha),
  },
})
