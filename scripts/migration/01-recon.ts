/**
 * Recon — WP'deki içeriği keşfet, neyle karşı karşıyayız bilgi ver
 *
 * Kullanım:
 *   npx tsx scripts/migration/01-recon.ts
 */
import { wp, type WPPage } from '../lib/wp';
import { memoize } from '../lib/cache';

async function main() {
  console.log('🔎 Sanica WP içerik keşfi başlıyor...\n');

  const pages = await memoize('all-pages.json', () => wp.pages());
  const posts = await memoize('all-posts.json', () => wp.posts());
  const media = await memoize('all-media.json', () => wp.media());

  console.log(`\n📊 Genel sayım:`);
  console.log(`  Sayfa  : ${pages.length}`);
  console.log(`  Yazı   : ${posts.length}`);
  console.log(`  Medya  : ${media.length}`);

  // Parent-child ağacını çıkar
  const byId = new Map<number, WPPage>();
  for (const p of pages) byId.set(p.id, p);

  function getPath(p: WPPage): string[] {
    const parts = [p.slug];
    let cur: WPPage | undefined = p;
    while (cur && cur.parent !== 0) {
      cur = byId.get(cur.parent);
      if (cur) parts.unshift(cur.slug);
    }
    return parts;
  }

  // Yatırımcı ağacı
  const investorRoot = pages.find((p) => p.slug === 'yatirimci-iliskileri');
  if (investorRoot) {
    console.log('\n📑 Yatırımcı İlişkileri ağacı:');
    const tree = pages.filter((p) => {
      const path = getPath(p);
      return path[0] === 'yatirimci-iliskileri';
    });
    for (const p of tree) {
      const path = getPath(p);
      const indent = '  '.repeat(path.length);
      console.log(`${indent}└─ ${p.slug.padEnd(40)} (id ${p.id})`);
    }
  }

  // Medya istatistikleri
  console.log('\n📁 Medya türlerine göre dağılım:');
  const byType = new Map<string, number>();
  for (const m of media) {
    byType.set(m.mime_type, (byType.get(m.mime_type) ?? 0) + 1);
  }
  for (const [type, count] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(40)} ${count}`);
  }

  // PDF'leri ayrıca listele
  const pdfs = media.filter((m) => m.mime_type === 'application/pdf');
  console.log(`\n📄 PDF dosyaları (${pdfs.length}):`);
  const totalSize = pdfs.reduce((sum, p) => sum + (p.media_details?.filesize ?? 0), 0);
  console.log(`  Toplam boyut: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
  for (const p of pdfs.slice(0, 10)) {
    const size = p.media_details?.filesize ? `${(p.media_details.filesize / 1024).toFixed(0)} KB` : '?';
    console.log(`  ${p.slug.padEnd(50)} ${size}`);
  }
  if (pdfs.length > 10) console.log(`  ... ve ${pdfs.length - 10} tane daha`);

  // Ürün ve kurumsal sayfa adayları
  const productSlugs = ['adriana','aurora','arta','azra','braga','cabra','calmo','cordoba','curvy','daroca','dina','elda','fiji','fredo','kral','laro','laza','lucena','lugo','malaga','manila','mardan','miko','milas','mira','nadia','nelas','nina','pozo','ronda-column-horizontal','ronda-column-vertical','salta','samara','santona','serpa','soley','tanya','tenpa','velada','vigo','zafra','zamora','zarago','zeyna','sanica-condensing-boiler','zirve-yogusmali-kombi','flat-panel-radiator','elite-flat-panel-radiator','dizayn-panel-radiators','dizayn-towel-rails','cast-radiators','column-radiators','stainless-steel-radiators','straight-towels','oval-towels','standard-radiators','standard-towel-rails','accessories','type-10-33-panel-radiators'];

  const products = pages.filter((p) => productSlugs.includes(p.slug));
  console.log(`\n🔧 Ürün adayları (${products.length}):`);
  console.log(`  Örnek: ${products.slice(0, 5).map((p) => p.slug).join(', ')}...`);

  const corporateSlugs = ['hakkimizda', 'tarihce', 'yonetim', 'uretim', 'kalite', 'kvkk', 'iletisim'];
  const corporate = pages.filter((p) => corporateSlugs.includes(p.slug));
  console.log(`\n🏢 Kurumsal sayfa adayları (${corporate.length}):`);
  for (const p of corporate) console.log(`  ${p.slug}`);

  console.log('\n✅ Keşif tamamlandı. Cache: .migration-cache/');
}

main().catch((err) => {
  console.error('❌ Hata:', err);
  process.exit(1);
});
