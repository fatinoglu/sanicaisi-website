/**
 * Image Migration — Sanica WP'deki tum gorselleri R2'ye yukle.
 *
 * Kaynak iki yerden cekilir:
 *   1. WP REST /media endpoint'indeki image attachment'lari
 *   2. WP page + post HTML iceriklerinde gomulu <img src>/srcset URL'leri
 *      (theme/sayfa icine dogrudan yazilan ve attachment olmayan gorseller)
 *
 * Boyut varyantlari da indirilir (image-300x200.jpg gibi WP otomatik
 * thumbnail'leri) cunku HTML'lerde bu varyantlar referans veriliyor olabilir.
 *
 * Her gorsel icin:
 *   1. WP URL'den indir
 *   2. R2'ye yukle (key = WP path, ornegin 2023/10/sanica-adana.jpg)
 *   3. Idempotent: zaten varsa atla
 *
 * public/_redirects icinde /wp-content/uploads/* -> R2 yonlendirmesi oldugu
 * icin yuklenen gorseller otomatik olarak yeni siteden ve eski URL'lerden
 * erisilebilir olur.
 *
 * Kullanim:
 *   npx tsx scripts/migration/10-images-to-r2.ts
 *   npx tsx scripts/migration/10-images-to-r2.ts --dry-run
 *   npx tsx scripts/migration/10-images-to-r2.ts --force
 */
import { wp, type WPMedia } from '../lib/wp';
import { memoize } from '../lib/cache';
import { upload, exists, keyFromWpUrl, publicUrl, R2 } from '../lib/r2';
import { writeFileSync } from 'node:fs';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const IMG_EXT_RE = /\.(jpe?g|png|webp|gif|svg|avif)(?:\?|#|$)/i;

interface MigrationResult {
  wpUrl: string;
  r2Key: string;
  publicUrl: string;
  sizeBytes: number;
  status: 'uploaded' | 'skipped' | 'failed';
  source: 'media' | 'html';
  error?: string;
}

function extractImgUrls(html: string): Set<string> {
  const urls = new Set<string>();
  const reSrc = /\bsrc=["']([^"']+)["']/g;
  const reSrcset = /\bsrcset=["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = reSrc.exec(html)) !== null) urls.add(m[1]);
  while ((m = reSrcset.exec(html)) !== null) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u) urls.add(u);
    }
  }
  return urls;
}

function isWpUploadImg(u: string): boolean {
  return /\/wp-content\/uploads\//.test(u) && IMG_EXT_RE.test(u);
}

function stripQuery(u: string): string {
  return u.split('?')[0].split('#')[0];
}

function normalizeUrl(u: string): string {
  // Protocol-relative (//host/path) -> https://host/path
  if (u.startsWith('//')) return 'https:' + u;
  return u;
}

async function downloadImage(url: string): Promise<{ buf: Buffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  const ab = await res.arrayBuffer();
  return { buf: Buffer.from(ab), contentType };
}

async function main() {
  console.log('Image Migration -> Cloudflare R2\n');
  console.log(`  Bucket  : ${R2.bucket}`);
  console.log(`  Mode    : ${DRY_RUN ? 'DRY-RUN' : FORCE ? 'FORCE (overwrite)' : 'INCREMENTAL'}\n`);

  // 1) REST media'dan image attachment'lari
  const allMedia = await memoize('all-media.json', () => wp.media());
  const imageAttachments = allMedia.filter((m) => m.mime_type?.startsWith('image/'));

  // 2) Pages + posts HTML iceriklerinden gomulu img URL'leri
  const allPages = await memoize('all-pages.json', () => wp.pages());
  const allPosts = await memoize('all-posts.json', () => wp.posts());

  const htmlImgUrls = new Set<string>();
  for (const items of [allPages, allPosts]) {
    for (const it of items as Array<{ content?: { rendered?: string } }>) {
      const html = it.content?.rendered ?? '';
      for (const u of extractImgUrls(html)) {
        if (isWpUploadImg(u)) htmlImgUrls.add(stripQuery(u));
      }
    }
  }

  // Birlestir: ikisi arasinda tekrar olmayanlar
  const seen = new Set<string>();
  type Item = { url: string; source: 'media' | 'html'; expectedSize?: number };
  const items: Item[] = [];

  for (const m of imageAttachments as WPMedia[]) {
    const url = normalizeUrl(stripQuery(m.source_url));
    if (!seen.has(url)) {
      seen.add(url);
      items.push({ url, source: 'media', expectedSize: m.media_details?.filesize });
    }
  }
  for (const rawUrl of htmlImgUrls) {
    const url = normalizeUrl(rawUrl);
    if (!seen.has(url)) {
      seen.add(url);
      items.push({ url, source: 'html' });
    }
  }

  console.log(`Bulundu: ${imageAttachments.length} attachment + ${htmlImgUrls.size} HTML-gomulu = ${items.length} essiz gorsel\n`);

  if (DRY_RUN) {
    console.log('[DRY-RUN] Yukleme yapilmayacak. Ilk 15 ornek:');
    for (const it of items.slice(0, 15)) {
      const key = keyFromWpUrl(it.url);
      console.log(`   [${it.source}] ${key}`);
    }
    if (items.length > 15) console.log(`   ... ve ${items.length - 15} tane daha`);
    return;
  }

  const results: MigrationResult[] = [];
  let uploaded = 0, skipped = 0, failed = 0;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const r2Key = keyFromWpUrl(it.url);
    const progress = `[${(i + 1).toString().padStart(3)}/${items.length}]`;

    try {
      if (!FORCE && (await exists(r2Key))) {
        skipped += 1;
        results.push({
          wpUrl: it.url,
          r2Key,
          publicUrl: publicUrl(r2Key),
          sizeBytes: it.expectedSize ?? 0,
          status: 'skipped',
          source: it.source,
        });
        console.log(`${progress} SKIP  ${r2Key}`);
        continue;
      }

      const { buf, contentType } = await downloadImage(it.url);
      await upload(r2Key, buf, contentType);

      uploaded += 1;
      results.push({
        wpUrl: it.url,
        r2Key,
        publicUrl: publicUrl(r2Key),
        sizeBytes: buf.length,
        status: 'uploaded',
        source: it.source,
      });

      const sizeKb = (buf.length / 1024).toFixed(0);
      console.log(`${progress} OK    ${r2Key} (${sizeKb} KB, ${it.source})`);
    } catch (err) {
      failed += 1;
      const errMsg = (err as Error).message;
      results.push({
        wpUrl: it.url,
        r2Key,
        publicUrl: publicUrl(r2Key),
        sizeBytes: 0,
        status: 'failed',
        source: it.source,
        error: errMsg,
      });
      console.log(`${progress} FAIL  ${r2Key}: ${errMsg}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  Yuklendi : ${uploaded}`);
  console.log(`  Atlandi  : ${skipped} (mevcut)`);
  console.log(`  Hata     : ${failed}`);
  console.log('='.repeat(60));

  const indexPath = '.migration-cache/image-index.json';
  writeFileSync(indexPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nImage index: ${indexPath}`);
  console.log(`public/_redirects icindeki /wp-content/uploads/* -> R2 kurali`);
  console.log(`yuklenen tum gorseller icin eski WP URL'lerini calisir kilar.\n`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('FAIL', err);
  process.exit(1);
});
