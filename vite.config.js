import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { sportsChatPlugin } from './server/sportsChat.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    sportsChatPlugin(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss()
  ],
})
