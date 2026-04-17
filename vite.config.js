import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ganti 'fx-terminal' dengan nama repo GitHub kamu
// Contoh: repo = https://github.com/username/fx-terminal
// maka base = '/fx-terminal/'
export default defineConfig({
  plugins: [react()],
  base: '/LiveAI/',   // ← GANTI sesuai nama repo kamu
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})
