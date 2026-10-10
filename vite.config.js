import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    allowedHosts: ['forming-carefully-seconds-visit.trycloudflare.com'],
  },
});
