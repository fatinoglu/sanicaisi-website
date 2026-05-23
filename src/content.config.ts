/**
 * Content Collections — Astro 6 loader API
 *
 * Her koleksiyon için glob loader + Zod şeması.
 * Faz 4'te WP migration script'i bu şemalara uyacak.
 *
 * i18n: lang alanı frontmatter'da, dosya isminde .tr / .en suffix.
 */

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const locale = z.enum(['tr', 'en']);

/* ── Product Categories ─────────────────────────────────── */
const productCategories = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/product-categories' }),
  schema: z.object({
    lang: locale,
    slug: z.string(),
    name: z.string(),
    tagline: z.string(),
    description: z.string().optional(),
    order: z.number().default(99),
    coverKind: z.enum(['radiator', 'towel', 'boiler', 'pipe']).optional(),
  }),
});

/* ── Products ─────────────────────────────────────────────── */
const products = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/products' }),
  schema: z.object({
    lang: locale,
    slug: z.string(),
    name: z.string(),
    categorySlug: z.enum(['panel-radyator', 'havlupan', 'kombi', 'boru']),
    series: z.string().optional(),
    tagline: z.string(),
    description: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(99),

    specs: z.array(z.object({
      label: z.string(),
      value: z.string(),
      unit: z.string().optional(),
      group: z.string().optional(),
    })).default([]),

    sizes: z.array(z.object({
      label: z.string(),
      sku: z.string().optional(),
      power: z.string().optional(),
    })).default([]),

    certifications: z.array(z.string()).default([]),

    downloads: z.array(z.object({
      label: z.string(),
      kind: z.enum(['catalog', 'datasheet', 'bim', 'manual', 'warranty', 'other']),
      url: z.string().url(),
      sizeBytes: z.number().optional(),
    })).default([]),

    coverKind: z.enum(['radiator', 'towel-aurora', 'towel-classic', 'boiler', 'pipe-section']).default('radiator'),
    coverBg: z.enum(['sand', 'sand-deep', 'terracotta-soft', 'paper']).default('sand'),
  }),
});

/* ── Corporate pages ──────────────────────────────────────── */
const corporate = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/corporate' }),
  schema: z.object({
    lang: locale,
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    section: z.enum(['about', 'history', 'management', 'manufacturing', 'quality', 'documents']),
    order: z.number().default(99),
  }),
});

/* ── KAP açıklamaları (Faz 4'te dolar) ────────────────────── */
const kap = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/kap' }),
  schema: z.object({
    lang: locale,
    date: z.date(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    category: z.enum(['finansal', 'genel-kurul', 'yatirim', 'esg', 'bilgilendirme', 'sermaye']),
    title: z.string(),
    summary: z.string().optional(),
    pdfUrl: z.string().url().optional(),
    pdfSizeBytes: z.number().optional(),
    kapUrl: z.string().url().optional(),
  }),
});

/* ── Finansal raporlar (Faz 4'te dolar) ───────────────────── */
const financialReports = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/financial-reports' }),
  schema: z.object({
    lang: locale,
    year: z.number().int().min(2010),
    quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'annual']),
    publishDate: z.date(),
    pdfUrl: z.string().url(),
    pdfSizeBytes: z.number().optional(),
    auditFirm: z.string().default('PwC Türkiye'),
  }),
});

/* ── Faaliyet raporları (Faz 4'te dolar) ──────────────────── */
const annualReports = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/annual-reports' }),
  schema: z.object({
    lang: locale,
    year: z.number().int(),
    title: z.string(),
    subtitle: z.string().optional(),
    publishDate: z.date(),
    pdfUrl: z.string().url(),
    pdfSizeBytes: z.number().optional(),
    webVersionUrl: z.string().url().optional(),
    coverKind: z.enum(['ink', 'sand', 'navy', 'paper']),
  }),
});

/* ── Basında biz (Faz 4'te dolar) ─────────────────────────── */
const press = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/press' }),
  schema: z.object({
    lang: locale,
    publication: z.enum(['bloomberg-ht', 'dunya', 'para', 'capital', 'fortune', 'forbes', 'anadolu', 'other']),
    publicationName: z.string().optional(),
    date: z.date(),
    title: z.string(),
    externalUrl: z.string().url().optional(),
    excerpt: z.string().optional(),
  }),
});

export const collections = {
  'product-categories': productCategories,
  products,
  corporate,
  kap,
  'financial-reports': financialReports,
  'annual-reports': annualReports,
  press,
};
