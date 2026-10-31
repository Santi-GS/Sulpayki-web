// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // Generación estática (SSG) por defecto para todas las páginas públicas.
  // Solo las rutas de /admin y /api/admin optan por ejecución en servidor con `prerender = false`.
  output: 'static',
  image: {
    domains: ['res.cloudinary.com'],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: vercel(),
});
