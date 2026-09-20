import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts')) return 'recharts'
          if (id.includes('framer-motion')) return 'framer-motion'
          // leaflet.heat fica de fora do chunk 'leaflet': ele só é
          // carregado via import() dinâmico (ver GeoHeatmap.tsx) pra
          // garantir que window.L já existe antes do plugin rodar — se
          // cair no mesmo chunk síncrono do leaflet, o bundler otimiza o
          // import dinâmico pra estático e quebra essa garantia de ordem.
          if (id.includes('leaflet') && !id.includes('leaflet.heat')) return 'leaflet'
          if (id.includes('react-dom') || id.includes('/react/')) return 'react'
        },
      },
    },
  },
})
