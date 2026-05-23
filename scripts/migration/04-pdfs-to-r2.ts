/**
 * PDF Migration — Sanica WP'deki tüm PDF'leri R2'ye yükle
 *
 * Her PDF için:
 *   1. WP'den indir (https://www.sanicaisi.com.tr/wp-content/uploads/...)
 *   2. R2'ye yükle (key = WP path: 2026/05/file.pdf)
 *   3. İdempotent: zaten varsa atla
 *
 * Kullanım:
 *   npx tsx scripts/migration/04-pdfs-to-r2.ts
 *   npx tsx scripts/migration/04-pdfs-to-r2.ts --dry-run
 *   npx tsx scripts/migration/04-pdfs-to-r2.ts --force   (zaten varsa da yeniden yükle)
 */
import { wp, type WPMedia } from '../lib/wp';
import { memoize } from '../lib/cache';
import { upload, exists, keyFromWpUrl, publicUrl, R2 } from '../lib/r2';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

interface MigrationResult {
  wpUrl: string;
  r2Key: string;
  publicUrl: string;
  sizeBytes: number;
  status: 'uploaded' | 'skipped' | 'failed';
  error?: string;
}

async function downloadPdf(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  console.log('📦 PDF Migration → Cloudflare R2\n');
  console.log(`  Bucket  : ${R2.bucket}`);
  console.log(`  Mode    : ${DRY_RUN ? '🟡 DRY-RUN' : FORCE ? '🔴 FORCE (overwrite)' : '🟢 INCREMENTAL'}\n`);

  // WP medyasını çek (cache'den)
  const allMedia = await memoize('all-media.json', () => wp.media());
  const pdfs = allMedia.filter((m) => m.mime_type === 'application/pdf');

  console.log(`📊 Toplam ${pdfs.length} PDF bulundu`);
  const totalSize = pdfs.reduce((sum, p) => sum + (p.media_details?.filesize ?? 0), 0);
  console.log(`   Toplam boyut: ${(totalSize / 1024 / 1024).toFixed(1)} MB\n`);

  if (DRY_RUN) {
    console.log('🟡 [DRY-RUN] Yükleme yapılmayacak. İlk 10 örnek:');
    for (const m of pdfs.slice(0, 10)) {
      const key = keyFromWpUrl(m.source_url);
      const size = m.media_details?.filesize ? `${(m.media_details.filesize / 1024).toFixed(0)} KB` : '?';
      console.log(`   ${size.padStart(8)}  ${key}`);
    }
    if (pdfs.length > 10) console.log(`   ... ve ${pdfs.length - 10} tane daha`);
    return;
  }

  const results: MigrationResult[] = [];
  let uploaded = 0, skipped = 0, failed = 0;

  for (let i = 0; i < pdfs.length; i++) {
    const m = pdfs[i];
    const r2Key = keyFromWpUrl(m.source_url);
    const expectedSize = m.media_details?.filesize ?? 0;
    const progress = `[${(i + 1).toString().padStart(3)}/${pdfs.length}]`;

    try {
      // Idempotency check
      if (!FORCE && (await exists(r2Key))) {
        skipped += 1;
        results.push({
          wpUrl: m.source_url,
          r2Key,
          publicUrl: publicUrl(r2Key),
          sizeBytes: expectedSize,
          status: 'skipped',
        });
        console.log(`${progress} ⏭️  ${r2Key} (mevcut)`);
        continue;
      }

      // Download
      const buf = await downloadPdf(m.source_url);

      // Upload
      await upload(r2Key, buf, 'application/pdf');

      uploaded += 1;
      results.push({
        wpUrl: m.source_url,
        r2Key,
        publicUrl: publicUrl(r2Key),
        sizeBytes: buf.length,
        status: 'uploaded',
      });

      const sizeKb = (buf.length / 1024).toFixed(0);
      console.log(`${progress} ✅ ${r2Key} (${sizeKb} KB)`);

    } catch (err) {
      failed += 1;
      const errMsg = (err as Error).message;
      results.push({
        wpUrl: m.source_url,
        r2Key,
        publicUrl: publicUrl(r2Key),
        sizeBytes: 0,
        status: 'failed',
        error: errMsg,
      });
      console.log(`${progress} ❌ ${r2Key}: ${errMsg}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`  Yüklendi : ${uploaded}`);
  console.log(`  Atlandı  : ${skipped} (mevcut)`);
  console.log(`  Hata     : ${failed}`);
  console.log('═'.repeat(60));

  // Sonucu cache'e yaz (sonraki adımlar için)
  const { writeFileSync } = await import('node:fs');
  const indexPath = '.migration-cache/pdf-index.json';
  writeFileSync(indexPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n📝 PDF index: ${indexPath}`);
  console.log(`   (sonraki scriptler bu haritayı kullanır)\n`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
