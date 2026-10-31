import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    fs: {
      // Allow serving files from one level up to access ../src
      allow: [path.resolve(__dirname, '..')]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    }
  },
  optimizeDeps: {
    include: [
      'react-router-dom',
      'axios',
      'lucide-react',
      'react-chartjs-2',
      'chart.js'
    ]
  }
})