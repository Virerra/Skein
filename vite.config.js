import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages project sites are served from /<repo-name>/, not the
  // domain root. Update this to match whatever you name the repo, or
  // set it to '/' if this ends up on a custom domain / user root page.
  base: '/skein/',
})
