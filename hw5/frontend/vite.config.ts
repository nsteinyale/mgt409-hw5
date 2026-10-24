import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The backend (backend/main.py) allows this origin: http://localhost:5173
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true }, // `npm run dev` adds --open to launch the browser
})
