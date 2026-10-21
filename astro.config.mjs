import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mesaidefterim.com',
  // SEO standardı: tüm sayfa adresleri sondaki eğik çizgiyle (dizin biçimi).
  // Aynı sayfanın çizgili/çizgisiz iki biçimde indekslenmesini önler.
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
