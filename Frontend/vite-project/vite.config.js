import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000',
        '/health': env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000',
      },
    },
  }
})
