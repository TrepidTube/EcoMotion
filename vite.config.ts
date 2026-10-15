import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// SIMA no expone CORS: en desarrollo/preview el navegador lo consulta a través de
// este proxy. En hosting estático usar scripts/fetch_sima.py (public/data/sima_now.json).
const simaProxy = {
  '/sima-live': {
    target: 'https://aire.nl.gob.mx',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/sima-live/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: simaProxy },
  preview: { proxy: simaProxy },
})
