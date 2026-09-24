/**
 * Java-sarmalı PDF onarımı — R2'deki bozuk PDF'leri tespit edip düzeltir
 *
 * Eski WP'ye Mayıs 2025'ten sonra yüklenen bazı PDF'ler, başlarına Java
 * serileştirme başlığı eklenmiş halde kaydedilmiş (ObjectOutputStream ile
 * yazılmış byte[]). Tarayıcı bunları açamıyor ("PDF yüklenemedi").
 *
 * Başlık sabit 27 bayt:
 *   AC ED 00 05          stream magic + version
 *   75 72 00 02 5B 42 …  TC_ARRAY, TC_CLASSDESC "[B" (+ serialVersionUID, flags)
 *   78 70                TC_ENDBLOCKDATA, TC_NULL
 *   xx xx xx xx          dizi uzunluğu (big-endian) = asıl PDF'in boyutu
 * Başlık atılınca geriye bozulmamış PDF kalır.
 *
 * Orijinaller üzerine yazılmadan önce .migration-cache/pdf-backup/ altına yedeklenir.
 *
 * Kullanım:
 *   npx tsx scripts/migration/12-fix-wrapped-pdfs.ts --dry-run
 *   npx tsx scripts/migration/12-fix-wrapped-pdfs.ts
 */
import '../lib/env';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { r2, R2, listAll, upload } from '../lib/r2';
import { cachePath } from '../lib/cache';

const DRY_RUN = process.argv.includes('--dry-run');
const BACKUP_DIR = cachePath('pdf-backup');

const JAVA_HEADER = Buffer.from([
  0xac, 0xed, 0x00, 0x05, 0x75, 0x72, 0x00, 0x02, 0x5b, 0x42, 0xac, 0xf3,
  0x17, 0xf8, 0x06, 0x08, 0x54, 0xe0, 0x02, 0x00, 0x00, 0x78, 0x70,
]);
const HEADER_LEN = JAVA_HEADER.length + 4;

async function getBytes(key: string, range?: string): Promise<Buffer> {
  const res = await r2().send(new GetObjectCommand({ Bucket: R2.bucket, Key: key, Range: range }));
  return Buffer.from(await res.Body!.transformToByteArray());
}

/** Sarmalı çözer; beklenen yapıda değilse null döner (dosyaya dokunulmaz). */
function unwrap(buf: Buffer): Buffer | null {
  if (buf.length <= HEADER_LEN) return null;
  if (!buf.subarray(0, JAVA_HEADER.length).equals(JAVA_HEADER)) return null;
  const declared = buf.readUInt32BE(JAVA_HEADER.length);
  if (declared !== buf.length - HEADER_LEN) return null;
  const pdf = buf.subarray(HEADER_LEN);
  if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') return null;
  if (!pdf.subarray(-1024).toString('latin1').includes('%%EOF')) return null;
  return pdf;
}

async function main() {
  console.log(`🩺 Java-sarmalı PDF taraması${DRY_RUN ? ' (dry-run)' : ''}\n`);

  const keys = (await listAll()).filter((k) => k.toLowerCase().endsWith('.pdf'));
  console.log(`  ${keys.length} PDF taranıyor…\n`);

  const wrapped: string[] = [];
  for (const key of keys) {
    const head = await getBytes(key, 'bytes=0-3');
    if (head.equals(JAVA_HEADER.subarray(0, 4))) wrapped.push(key);
  }
  console.log(`  Sarmalı: ${wrapped.length}\n`);

  let fixed = 0;
  const skipped: string[] = [];
  for (const key of wrapped) {
    const orig = await getBytes(key);
    const pdf = unwrap(orig);
    if (!pdf) {
      skipped.push(key);
      console.log(`  ⚠️  beklenmeyen yapı, atlandı: ${key}`);
      continue;
    }
    console.log(`  ${DRY_RUN ? '·' : '✅'} ${key}  ${orig.length} → ${pdf.length} bayt`);
    if (DRY_RUN) continue;

    const backup = join(BACKUP_DIR, key);
    mkdirSync(dirname(backup), { recursive: true });
    writeFileSync(backup, orig);

    await upload(key, pdf, 'application/pdf');
    const check = await getBytes(key, 'bytes=0-4');
    if (check.toString('latin1') !== '%PDF-') throw new Error(`Yükleme doğrulanamadı: ${key}`);
    fixed++;
  }

  console.log(`\n  ${DRY_RUN ? 'Düzeltilecek' : 'Düzeltildi'}: ${DRY_RUN ? wrapped.length - skipped.length : fixed}`);
  if (skipped.length) console.log(`  Atlanan: ${skipped.length}`);
  if (!DRY_RUN && fixed) console.log(`  Yedekler: ${BACKUP_DIR}/`);
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
