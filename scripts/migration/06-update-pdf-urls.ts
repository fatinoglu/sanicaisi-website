/**
 * URL Update — content dosyalarındaki R2 public base URL'lerini
 * mevcut R2_PUBLIC_BASE ile değiştir
 *
 * Public access sonradan açıldıysa veya custom domain bind edildiyse
 * tek seferlik çalıştırılır
 *
 * Kullanım:
 *   npx tsx scripts/migration/06-update-pdf-urls.ts
 *   npx tsx scripts/migration/06-update-pdf-urls.ts --dry-run
 */
import './../lib/env';
import { readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

const NEW_BASE = process.env.R2_PUBLIC_BASE;
const DRY_RUN = process.argv.includes('--dry-run');

if (!NEW_BASE) {
  console.error('❌ R2_PUBLIC_BASE .env.local içinde yok');
  process.exit(1);
}

// Eski URL kalıbı: pub-{32-karakter-hash}.r2.dev (yer tutucu olmuş olabilir)
const OLD_URL_RX = /https:\/\/pub-[a-z0-9]{32,}\.r2\.dev/g;

async function main() {
  console.log('🔄 R2 public URL güncelleme...\n');
  console.log(`  New base: ${NEW_BASE}\n`);

  const dirs = [
    'src/content/financial-reports',
    'src/content/annual-reports',
    'src/content/investor-documents',
  ];

  let scanned = 0;
  let updated = 0;
  const changes: string[] = [];

  for (const dir of dirs) {
    for await (const file of glob(`${dir}/**/*.md`)) {
      scanned += 1;
      const content = readFileSync(file, 'utf-8');

      // Eski URL'leri bul ve yeni base ile değiştir
      const matches = content.match(OLD_URL_RX);
      if (!matches) continue;

      const oldBase = matches[0];
      if (oldBase === NEW_BASE) continue;  // Zaten doğru

      const updated_content = content.replaceAll(oldBase, NEW_BASE);

      if (updated_content !== content) {
        if (!DRY_RUN) writeFileSync(file, updated_content, 'utf-8');
        updated += 1;
        changes.push(`${file}\n   ${oldBase}\n   → ${NEW_BASE}`);
      }
    }
  }

  console.log(`📊 Taranan : ${scanned} dosya`);
  console.log(`   Güncellenen: ${updated} dosya\n`);

  if (changes.length > 0 && changes.length <= 5) {
    console.log('Örnek değişiklikler:');
    for (const c of changes) console.log(`  ${c}\n`);
  } else if (changes.length > 5) {
    console.log(`(${changes.length - 3} daha fazla)`);
  }

  if (DRY_RUN) console.log('\n🟡 [DRY-RUN] Dosyalar yazılmadı.');
  else console.log('\n✅ Güncelleme tamamlandı.');
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
