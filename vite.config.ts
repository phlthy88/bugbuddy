import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
   server: {
     port: 3001,
     open: true,
   },
  esbuild: {
    // Skip TypeScript checking for now
    tsconfigRaw: {
      compilerOptions: {
        noEmit: true,
        skipLibCheck: true,
        strict: false,
      },
    },
  },
})