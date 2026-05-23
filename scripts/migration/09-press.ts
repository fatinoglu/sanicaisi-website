/**
 * Basında Biz migration — WP blog posts → press content collection
 *
 * Yapar:
 *   1. Cache'deki tüm WP postlarını okur
 *   2. Her postun featured_media'sını (cache'de yoksa) WP'den çeker
 *   3. Featured image + içerikteki sanicaisi.com.tr görsellerini R2'ye yükler
 *   4. Content HTML → Markdown çevirir, img src'lerini R2 URL'leriyle değiştirir
 *   5. src/content/press/{date}-{slug}.tr.md yazar
 *
 * Kullanım:
 *   npx tsx scripts/migration/09-press.ts
 *   npx tsx scripts/migration/09-press.ts --dry-run
 *   npx tsx scripts/migration/09-press.ts --force
 */
import '../lib/env';
import { wp, type WPPost, type WPMedia } from '../lib/wp';
import { memoize } from '../lib/cache';
import { upload, exists, keyFromWpUrl, publicUrl } from '../lib/r2';
import TurndownService from 'turndown';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'src/content/press';
const WP_BASE = process.env.WP_BASE_URL ?? 'https://www.sanicaisi.com.tr';
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

type PressCategory = 'bizden-haberler' | 'sosyal-sorumluluk' | 'halka-arz';

// WP category ID → bizim category slug
const CAT_MAP: Record<number, PressCategory> = {
  190: 'bizden-haberler',
  192: 'sosyal-sorumluluk',
  184: 'halka-arz',
  186: 'halka-arz',
  188: 'halka-arz',
  1: 'halka-arz', // "Panel Radtatörler" (yanlış etiket) — tüm postlar IPO basın haberi
};

function pickCategory(categories: number[]): PressCategory {
  // Öncelik sırası: sosyal sorumluluk → bizden haberler → halka arz
  if (categories.includes(192)) return 'sosyal-sorumluluk';
  if (categories.includes(190)) return 'bizden-haberler';
  for (const c of categories) {
    if (CAT_MAP[c]) return CAT_MAP[c];
  }
  return 'halka-arz';
}

const td = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
  strongDelimiter: '**',
});

td.addRule('strip-empty', {
  filter: ['style', 'script', 'noscript'],
  replacement: () => '',
});

// WordPress gallery/figure wrapper'larını sadece içeriği geçirip düşür
td.addRule('figure-unwrap', {
  filter: ['figure', 'figcaption'],
  replacement: (content, node) => {
    if (node.nodeName === 'FIGCAPTION') {
      const txt = content.trim();
      return txt ? `\n\n*${txt}*\n\n` : '';
    }
    return `\n\n${content.trim()}\n\n`;
  },
});

// YouTube embed → markdown link
td.addRule('youtube-embed', {
  filter: (node) => {
    return node.nodeName === 'IFRAME' &&
      (node.getAttribute('src') ?? '').includes('youtube.com/embed/');
  },
  replacement: (_content, node) => {
    const src = (node as Element).getAttribute('src') ?? '';
    const title = (node as Element).getAttribute('title') ?? 'YouTube video';
    const match = src.match(/embed\/([^?&/]+)/);
    const watchUrl = match ? `https://www.youtube.com/watch?v=${match[1]}` : src;
    return `\n\n[▶ ${title}](${watchUrl})\n\n`;
  },
});

td.addRule('img-rewrite', {
  filter: 'img',
  replacement: (_content, node) => {
    const el = node as Element;
    const src = el.getAttribute('src') ?? '';
    const alt = (el.getAttribute('alt') ?? '').replace(/[\[\]]/g, '');
    if (!src) return '';
    return `\n\n![${alt}](${src})\n\n`;
  },
});

/** WP'nin "-768x1024" gibi boyut suffix'ini kaldırıp orijinal görseli al */
function originalImageUrl(url: string): string {
  return url.replace(/-(\d+)x(\d+)(\.[a-z0-9]+)(\?.*)?$/i, '$3$4');
}

/** WP HTML'i temizleyip Markdown'a çevirir */
function htmlToMarkdown(html: string): string {
  const cleaned = html
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/<p>\s*&nbsp;\s*<\/p>/g, '')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '…')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&nbsp;/g, ' ');
  let md = td.turndown(cleaned);
  md = md.replace(/\n{3,}/g, '\n\n').trim();
  return md;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '…')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function makeExcerpt(html: string, max = 220): string {
  const txt = decodeHtml(html).replace(/\s+/g, ' ').trim();
  if (txt.length <= max) return txt;
  const cut = txt.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return cut.slice(0, lastSpace > 100 ? lastSpace : cut.length) + '…';
}

async function fetchMediaById(id: number): Promise<WPMedia | null> {
  try {
    return await memoize(`media-${id}.json`, async () => {
      const res = await fetch(`${WP_BASE}/wp-json/wp/v2/media/${id}`);
      if (!res.ok) return null as unknown as WPMedia;
      return (await res.json()) as WPMedia;
    });
  } catch {
    return null;
  }
}

async function downloadBinary(url: string): Promise<{ buf: Buffer; mime: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    const mime = res.headers.get('content-type')?.split(';')[0].trim() ?? 'application/octet-stream';
    return { buf: Buffer.from(arr), mime };
  } catch {
    return null;
  }
}

/** Sanica WP URL'sini R2'ye yükler (idempotent) ve public URL döner. */
async function ingestImage(wpUrl: string): Promise<string | null> {
  // Sadece sanicaisi.com.tr görsellerini R2'ye taşıyoruz
  if (!wpUrl.includes('/wp-content/uploads/')) return wpUrl; // dış URL'leri olduğu gibi bırak
  if (!wpUrl.includes('sanicaisi')) return wpUrl;

  const origUrl = originalImageUrl(wpUrl);
  const r2Key = `news/${keyFromWpUrl(origUrl)}`;

  if (DRY_RUN) {
    return publicUrl(r2Key);
  }

  if (!FORCE && (await exists(r2Key))) {
    return publicUrl(r2Key);
  }

  const dl = await downloadBinary(origUrl);
  if (!dl) {
    // Orijinal başarısızsa boyut suffix'li orijinal URL'i dene
    const dl2 = await downloadBinary(wpUrl);
    if (!dl2) return wpUrl; // ulaşılamadıysa orijinal dış URL'i sakla
    await upload(r2Key, dl2.buf, dl2.mime);
    return publicUrl(r2Key);
  }
  await upload(r2Key, dl.buf, dl.mime);
  return publicUrl(r2Key);
}

/** Markdown içindeki ![alt](url) bağlantılarını R2'ye taşır */
async function rewriteContentImages(md: string): Promise<string> {
  const matches = [...md.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  let out = md;
  for (const m of matches) {
    const [full, alt, url] = m;
    const newUrl = await ingestImage(url);
    if (newUrl && newUrl !== url) {
      out = out.replaceAll(full, `![${alt}](${newUrl})`);
    }
  }
  return out;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

function escapeYamlString(s: string): string {
  // YAML çift-tırnak içinde JSON.stringify kuralları çoğu durumu kapsar
  return JSON.stringify(s);
}

async function main() {
  console.log('📰 Basında Biz migration\n');
  console.log(`  Mode: ${DRY_RUN ? '🟡 DRY-RUN' : FORCE ? '🔴 FORCE' : '🟢 INCREMENTAL'}\n`);

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // Cache'lenmiş tüm postları al; cache yoksa WP'den çek
  const posts = await memoize('all-posts.json', () => wp.posts());
  const cachedMedia = await memoize('all-media.json', () => wp.media());
  const mediaById = new Map(cachedMedia.map((m) => [m.id, m] as const));

  console.log(`📊 Toplam ${posts.length} post bulundu\n`);

  let written = 0;
  let skipped = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i] as WPPost & { featured_media?: number };
    const progress = `[${(i + 1).toString().padStart(2)}/${posts.length}]`;
    const slug = post.slug;
    const date = fmtDate(post.date);
    const title = decodeHtml(post.title.rendered);

    try {
      // 1) Featured image
      let heroR2: string | undefined;
      let heroAlt: string | undefined;
      if (post.featured_media) {
        let media = mediaById.get(post.featured_media);
        if (!media) {
          const fetched = await fetchMediaById(post.featured_media);
          if (fetched) media = fetched;
        }
        if (media?.source_url) {
          const r2Url = await ingestImage(media.source_url);
          if (r2Url) {
            heroR2 = r2Url;
            heroAlt = title;
          }
        }
      }

      // 2) Content → Markdown
      const rawMd = htmlToMarkdown(post.content.rendered);
      const md = await rewriteContentImages(rawMd);

      // 3) Excerpt
      const excerpt = makeExcerpt(post.excerpt.rendered || post.content.rendered);

      // 4) Category
      const category = pickCategory(post.categories);

      // 5) Frontmatter
      const fmLines = [
        '---',
        'lang: tr',
        `slug: ${slug}`,
        `title: ${escapeYamlString(title)}`,
        `date: ${date}`,
        `category: ${category}`,
        `excerpt: ${escapeYamlString(excerpt)}`,
      ];
      if (heroR2) {
        fmLines.push(`heroImage: ${escapeYamlString(heroR2)}`);
        if (heroAlt) fmLines.push(`heroImageAlt: ${escapeYamlString(heroAlt)}`);
      }
      if (post.link) fmLines.push(`sourceUrl: ${escapeYamlString(post.link)}`);
      fmLines.push(`wpId: ${post.id}`);
      fmLines.push('---', '', md, '');

      const filename = `${date}-${slug}.tr.md`;
      const filepath = join(OUT_DIR, filename);

      if (DRY_RUN) {
        console.log(`${progress} 🟡 ${filename} (${category}, hero=${heroR2 ? 'yes' : 'no'})`);
      } else {
        writeFileSync(filepath, fmLines.join('\n'), 'utf-8');
        console.log(`${progress} ✅ ${filename} (${category}, ${md.length} char, hero=${heroR2 ? 'yes' : 'no'})`);
      }
      written += 1;
    } catch (err) {
      console.log(`${progress} ❌ ${slug}: ${(err as Error).message}`);
      skipped += 1;
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`  ${DRY_RUN ? 'Yazılacak' : 'Yazıldı'} : ${written}`);
  console.log(`  Hata     : ${skipped}`);
  console.log('═'.repeat(60));
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
