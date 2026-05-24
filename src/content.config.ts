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

// Tam URL ('https://...') ya da kok-relative path ('/wp-content/...').
// Site icinde servis edilen gorsel/PDF'ler relative; harici linkler URL.
const urlOrPath = z.string().refine(
  (v) => /^https?:\/\//.test(v) || v.startsWith('/'),
  { message: 'URL veya / ile baslayan path olmali' },
);

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
    // UI menü/grup başlığı — ör. "Radyatör" (panel-radyator, dizayn-radyator, radyator-aksesuar bunun altında listelenir)
    parentGroup: z.string().optional(),
  }),
});

/* ── Products ─────────────────────────────────────────────── */
const products = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/products' }),
  schema: z.object({
    lang: locale,
    slug: z.string(),
    name: z.string(),
    categorySlug: z.enum([
      'panel-radyator',
      'dizayn-radyator',
      'radyator-aksesuar',
      'havlupan',
      'kombi',
      'boru',
    ]),
    series: z.string().optional(),
    tagline: z.string(),
    description: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(99),

    // Resmi ürün görseli (R2'den relative path, ya da harici URL).
    heroImage: urlOrPath.optional(),
    heroImageAlt: z.string().optional(),
    gallery: z.array(z.object({
      url: urlOrPath,
      alt: z.string().optional(),
      caption: z.string().optional(),
    })).default([]),

    // Modeller içinde alt-model listesi (ör. Aluminyum serisinin LUGO, CORDOBA, MALAGA…)
    variants: z.array(z.object({
      name: z.string(),
      image: urlOrPath.optional(),
      note: z.string().optional(),
    })).default([]),

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
      url: urlOrPath,
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
    quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'annual']).default('annual'),
    title: z.string(),
    subtitle: z.string().optional(),
    publishDate: z.date(),
    pdfUrl: z.string().url(),
    pdfSizeBytes: z.number().optional(),
    webVersionUrl: z.string().url().optional(),
    coverKind: z.enum(['ink', 'sand', 'navy', 'paper']),
  }),
});

/* ── Yatırımcı dokümanları (genel — Genel Kurul, politikalar,
       komite esasları, halka arz raporları, vb.) ──────────── */
const investorDocuments = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/investor-documents' }),
  schema: z.object({
    lang: locale,
    slug: z.string(),
    title: z.string(),
    date: z.date(),
    type: z.enum([
      'genel-kurul',         // Genel Kurul çağrı/bilgilendirme/vekaletname/tutanak/hazirun
      'politika',            // Kar dağıtım/ücret/bilgilendirme politikaları
      'komite',              // Komite görev ve çalışma esasları
      'yonetim',             // İç yönergeler
      'halka-arz',           // İzahname, FTR raporları, fon kullanım
      'kurumsal-yonetim',    // Kurumsal yönetim uyum raporu, bilgi formu
      'surdurulebilirlik',   // TSRS sürdürülebilirlik raporu
      'katilim-finans',      // Katılım finans ilkeleri bilgi formu
      'diger',
    ]),
    pdfUrl: z.string().url(),
    pdfKey: z.string(),                  // R2 key (URL değişirse bağımsız)
    pdfSizeBytes: z.number().optional(),
    year: z.number().int().optional(),
    description: z.string().optional(),
  }),
});

/* ── Legal — KVKK, Bilgi Toplumu Hizmetleri, Çerez, Aydınlatma ── */
const legal = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/legal' }),
  schema: z.object({
    lang: locale,
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    updatedAt: z.date().optional(),
    order: z.number().default(99),
  }),
});

/* ── Basında biz — WP blog/news migration ─────────────────── */
const press = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/press' }),
  schema: z.object({
    lang: locale,
    slug: z.string(),
    title: z.string(),
    date: z.date(),
    category: z.enum(['bizden-haberler', 'sosyal-sorumluluk', 'halka-arz']),
    excerpt: z.string().optional(),
    heroImage: urlOrPath.optional(),
    heroImageAlt: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    wpId: z.number().int().optional(),
  }),
});

export const collections = {
  'product-categories': productCategories,
  products,
  corporate,
  kap,
  'financial-reports': financialReports,
  'annual-reports': annualReports,
  'investor-documents': investorDocuments,
  press,
  legal,
};
