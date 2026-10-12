import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite React's development preamble is an inline script. Allow exactly its hash.
// The production HTML retains script-src 'self' with no inline script permission.
const refreshHash = "'sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk='"
const devPolicy = `default-src 'self'; script-src 'self' ${refreshHash}; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:8000 ws://127.0.0.1:5173; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
export default defineConfig({
  plugins: [react(), tailwindcss(), { name: 'local-dev-csp', apply: 'serve', transformIndexHtml: { order: 'post', handler: html => html.replace("script-src 'self';", `script-src 'self' ${refreshHash};`) } }],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, headers: { 'Content-Security-Policy': devPolicy } },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], exclude: ['e2e/**', 'node_modules/**'] },
})
