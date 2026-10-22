// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// `site` drives canonical, OG and sitemap URLs.
export default defineConfig({
  site: 'https://wiseup.in',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'auto' },
});
