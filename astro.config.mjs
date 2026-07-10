// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://sanicaisi.com.tr',

  // Tam statik build — Cloudflare Pages için ideal
  output: 'static',

  // İki dilli yapı: TR varsayılan (prefix yok), EN /en/ altında
  // Fallback yok — eksik EN içerik düzgün 404 verir (Faz 6'da çevirilerle dolacak)
  i18n: {
    defaultLocale: 'tr',
    locales: ['tr', 'en'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },

  // Sayfa geçişlerinde hız için link prefetch
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },

  // Tarayıcı geçişleri için (Astro 6 native)
  experimental: {
    clientPrerender: true,
  },

  integrations: [
    mdx(),
    sitemap({
      i18n: {
        defaultLocale: 'tr',
        locales: { tr: 'tr-TR', en: 'en-US' },
      },
      filter: (page) => !page.includes('/admin/'),
    }),
  ],

  // Build optimizasyonları
  build: {
    inlineStylesheets: 'auto',
    format: 'directory',
  },

  // Görsel optimizasyonu (Astro built-in)
  image: {
    domains: ['sanicaisi.com.tr', 'www.sanicaisi.com.tr', 'media.sanicaisi.com.tr'],
  },

  // Vite — gerektiğinde özelleştirme için hazır
  vite: {
    css: {
      devSourcemap: true,
    },
  },

  adapter: cloudflare(),
});