import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backendTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:8000'
const ollamaTarget = process.env.OLLAMA_PROXY_TARGET || 'http://localhost:11434'

const proxy = {
  // El frontend llama a POST /api/generate-code; el backend expone POST /generate
  '/api': {
    target: backendTarget,
    changeOrigin: true,
    rewrite: (path) =>
      path.replace(/^\/api\/generate-code$/, '/generate').replace(/^\/api/, ''),
  },
  // Modelos instalados localmente: GET /ollama/api/tags → Ollama /api/tags
  '/ollama': {
    target: ollamaTarget,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/ollama/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy,
  },
  preview: {
    proxy,
  },
})
