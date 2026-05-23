/**
 * Kurumsal sayfalar migration
 *
 * WP'den gerçek anlamda "corporate" olan sayfaları çek, HTML→MD ile aktar.
 * Şu an WP'de mevcut: hakkimizda, kvkk
 *
 * Not: Yatırımcı ağacındaki kurumsal sayfalar (ortaklik-yapisi,
 * yonetim-kurulu, vb.) investor-documents olarak ele alındı (PDF link'li).
 *
 * Kullanım:
 *   npx tsx scripts/migration/07-corporate.ts
 *   npx tsx scripts/migration/07-corporate.ts --dry-run
 */
import '../lib/env';
import { wp, type WPPage } from '../lib/wp';
import { memoize } from '../lib/cache';
import TurndownService from 'turndown';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'src/content/corporate';
const DRY_RUN = process.argv.includes('--dry-run');

interface MapEntry {
  wpSlug: string;
  ourSlug: string;
  section: 'about' | 'history' | 'management' | 'manufacturing' | 'quality' | 'documents';
  order: number;
  titleOverride?: string;
}

// WP slug → bizim collection mapping
// Sadece "corporate" anlamına gelen sayfaları taşıyoruz
const MAPPING: MapEntry[] = [
  { wpSlug: 'hakkimizda', ourSlug: 'hakkimizda', section: 'about', order: 1 },
  { wpSlug: 'kvkk', ourSlug: 'kvkk', section: 'documents', order: 50 },
];

// Turndown ayarları
const td = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
  strongDelimiter: '**',
});

// Elementor wrapper'larını ve gereksiz attribute'leri temizle
td.addRule('elementor-strip', {
  filter: ['style', 'script', 'noscript'],
  replacement: () => '',
});

td.addRule('class-strip', {
  filter: (node) => {
    return node.nodeName === 'DIV' && (
      node.getAttribute('data-elementor-type') !== null ||
      (node.getAttribute('class') ?? '').includes('elementor')
    );
  },
  replacement: (content) => content, // sadece içeriği geçir, div wrapper'ı düş
});

/** WP HTML'i temiz Markdown'a çevir */
function htmlToMarkdown(html: string): string {
  // Boş paragraf temizliği
  const cleaned = html
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/<p>\s*&nbsp;\s*<\/p>/g, '')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...');

  let md = td.turndown(cleaned);

  // Çok boş satırları azalt
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return md;
}

/** İlk paragraftan veya excerpt'ten 200 karakter açıklama üret */
function extractDescription(html: string, fallback: string): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < 20) return fallback;
  if (text.length <= 200) return text;
  return text.slice(0, 197).trim() + '...';
}

async function main() {
  console.log('🏢 Kurumsal sayfalar migration\n');

  let migrated = 0;
  let skipped = 0;

  for (const entry of MAPPING) {
    console.log(`\n  📄 ${entry.wpSlug}`);

    const page = await memoize(`page-${entry.wpSlug}.json`, async () => {
      return await wp.pageBySlug(entry.wpSlug);
    });

    if (!page) {
      console.log(`     ⚠️  WP'de bulunamadı, atlandı`);
      skipped += 1;
      continue;
    }

    const title = entry.titleOverride ?? page.title.rendered.trim();
    const description = extractDescription(
      page.excerpt?.rendered ?? page.content.rendered,
      title,
    );
    const body = htmlToMarkdown(page.content.rendered);

    const frontmatter = [
      '---',
      'lang: tr',
      `slug: ${entry.ourSlug}`,
      `title: ${JSON.stringify(title)}`,
      `description: ${JSON.stringify(description)}`,
      `section: ${entry.section}`,
      `order: ${entry.order}`,
      '---',
      '',
      body,
      '',
    ].join('\n');

    const filename = `${entry.ourSlug}.tr.md`;
    const filepath = join(OUT_DIR, filename);

    if (DRY_RUN) {
      console.log(`     🟡 [DRY-RUN] Yazılacak: ${filepath}`);
      console.log(`     ${body.split('\n').slice(0, 6).join('\n     ')}`);
    } else {
      if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
      writeFileSync(filepath, frontmatter, 'utf-8');
      console.log(`     ✅ ${filepath} (${body.length} karakter)`);
      migrated += 1;
    }
  }

  console.log(`\n${DRY_RUN ? '🟡 [DRY-RUN]' : '✅'} ${migrated} dosya yazıldı, ${skipped} atlandı`);
  if (!DRY_RUN && migrated > 0) {
    console.log('\n💡 Not: WP\'den gelen içerik mevcut manuel dosyaları override etti.');
    console.log('   Gerekirse src/content/corporate/ dosyalarını manuel düzenleyin.');
  }
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
