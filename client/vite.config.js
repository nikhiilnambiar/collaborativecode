import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Trick Vite: When y-monaco asks for this specific deep file, 
      // just give it the main monaco-editor package instead.
      'monaco-editor/esm/vs/editor/editor.api.js': 'monaco-editor'
    }
  }
})