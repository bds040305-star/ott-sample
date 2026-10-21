import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { livePlugin } from './server/youtubeLive.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    livePlugin(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss()
  ],
})
