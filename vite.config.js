import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
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
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_SHA__: JSON.stringify(sha),
  },
})
