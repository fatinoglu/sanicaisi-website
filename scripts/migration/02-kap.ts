/**
 * KAP Açıklamaları Migration
 *
 * Kaynak: ozel-durum-aciklamalari sayfası (Elementor HTML tablo)
 *         Sütunlar: Tarih · Konu · KAP linki
 * Hedef:  src/content/kap/*.tr.md (her bildirim için tek dosya)
 *
 * Kullanım:
 *   npx tsx scripts/migration/02-kap.ts
 *   npx tsx scripts/migration/02-kap.ts --dry-run   (yaz, kaydetme)
 */
import { wp } from '../lib/wp';
import { memoize } from '../lib/cache';
import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'src/content/kap';
const DRY_RUN = process.argv.includes('--dry-run');

interface KapEntry {
  date: string;           // ISO 2026-05-22
  time?: string;          // 09:14 if known
  title: string;
  kapUrl: string;         // https://www.kap.org.tr/tr/Bildirim/...
  bildirimId?: string;
  category: 'finansal' | 'genel-kurul' | 'yatirim' | 'esg' | 'bilgilendirme' | 'sermaye';
}

/** Türkçe tarih formatlarını ISO'ya çevir
 *  "22.05.2026", "22/05/2026", "22 Mayıs 2026"  → "2026-05-22"
 */
function parseTrDate(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, ' ');

  // dd.mm.yyyy veya dd/mm/yyyy
  const numericMatch = trimmed.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (numericMatch) {
    const [, d, m, y] = numericMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // dd MonthName yyyy
  const months: Record<string, string> = {
    ocak: '01', subat: '02', şubat: '02', mart: '03', nisan: '04',
    mayis: '05', mayıs: '05', haziran: '06', temmuz: '07', agustos: '08', ağustos: '08',
    eylul: '09', eylül: '09', ekim: '10', kasim: '11', kasım: '11', aralik: '12', aralık: '12',
  };
  const namedMatch = trimmed.toLowerCase().match(/(\d{1,2})\s+([a-zçşğüöı]+)\s+(\d{4})/);
  if (namedMatch) {
    const [, d, mName, y] = namedMatch;
    const m = months[mName];
    if (m) return `${y}-${m}-${d.padStart(2, '0')}`;
  }

  return null;
}

/** Başlıktan kategori çıkar (kelime tabanlı sınıflandırma) */
function guessCategory(title: string): KapEntry['category'] {
  const t = title.toLowerCase();
  if (/finans|finansal|konsolide|bilanço|kar.zarar|denetimden ge[çc]mi[şs]/.test(t)) return 'finansal';
  if (/genel kurul|olağan toplantı|olagan toplant|gündem/.test(t)) return 'genel-kurul';
  if (/sermaye|halka arz/.test(t)) return 'sermaye';
  if (/yat[ıi]r[ıi]m karar|tesis|kapasite|ortakl[ıi]k kurulu|ba[ğg]l[ıi] ortakl[ıi]k/.test(t)) return 'yatirim';
  if (/s[üu]rd[üu]r[üu]lebilirlik|esg|tsrs|kar.bon|enerji/.test(t)) return 'esg';
  return 'bilgilendirme';
}

/** KAP URL'inden bildirim ID'sini al
 *  https://www.kap.org.tr/tr/Bildirim/1606661  → 1606661 */
function extractBildirimId(url: string): string | undefined {
  const m = url.match(/\/Bildirim\/(\d+)/);
  return m?.[1];
}

/** Tarih + başlıktan slug üretir (URL-safe, çakışmaya karşı bildirimId eklenebilir) */
function makeSlug(date: string, title: string, bildirimId?: string): string {
  const base = title
    .toLowerCase()
    // Türkçe karakter dönüşümü
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o')
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return bildirimId ? `${date}-${base}-${bildirimId}` : `${date}-${base}`;
}

async function main() {
  console.log('🚚 KAP Açıklamaları migration başlıyor...\n');

  const page = await memoize('page-ozel-durum-aciklamalari.json', async () => {
    return await wp.pageBySlug('ozel-durum-aciklamalari');
  });

  if (!page) {
    console.error('❌ Sayfa bulunamadı: ozel-durum-aciklamalari');
    process.exit(1);
  }

  console.log(`📄 Sayfa: ${page.title.rendered} (id ${page.id})`);

  const $ = cheerio.load(page.content.rendered);
  const entries: KapEntry[] = [];

  // Tüm tablo satırlarını tara
  // Beklenen yapı: <td>tarih</td> <td>başlık</td> <td>kap_url_metin</td>
  // (KAP URL'leri Sanica WP'de <a> değil, düz metin olarak yazılmış)
  $('table tr').each((_, row) => {
    const $row = $(row);
    const cells = $row.find('td');
    if (cells.length < 3) return;

    const dateText = $(cells[0]).text().trim().replace(/\s+/g, ' ');
    const titleText = $(cells[1]).text().trim().replace(/\s+/g, ' ').replace(/&#8217;/g, "'");
    const urlText = $(cells[2]).text().trim();

    // Header satırını atla
    if (/yayınlanma tarihi/i.test(dateText) || /konu başlığı/i.test(titleText)) return;

    const date = parseTrDate(dateText);
    if (!date) return;

    // URL metin içinde mi? (<a> de olabilir, düz metin de)
    const urlMatch = urlText.match(/https?:\/\/(?:www\.)?kap\.org\.tr\/[^\s<>"']+/);
    let kapUrl = urlMatch?.[0];

    // Yedek: <a href> var mı?
    if (!kapUrl) {
      kapUrl = $(cells[2]).find('a[href*="kap.org.tr"]').first().attr('href');
    }

    if (!kapUrl) return;
    if (!titleText || titleText.length < 5) return;

    const bildirimId = extractBildirimId(kapUrl);

    entries.push({
      date,
      title: titleText,
      kapUrl,
      bildirimId,
      category: guessCategory(titleText),
    });
  });

  // Dupes (aynı kap linki tekrarlanıyor olabilir farklı yerlerde)
  const seen = new Set<string>();
  const unique = entries.filter((e) => {
    const key = e.kapUrl;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n📊 ${unique.length} benzersiz KAP açıklaması bulundu (toplam ${entries.length} satırdan)`);

  // Kategorilere göre dağılım
  const byCat = unique.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('\n  Kategoriler:');
  for (const [cat, count] of Object.entries(byCat)) {
    console.log(`    ${cat.padEnd(20)} ${count}`);
  }

  // Yıl dağılımı
  const byYear = unique.reduce((acc, e) => {
    const y = e.date.slice(0, 4);
    acc[y] = (acc[y] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('\n  Yıllar:');
  for (const [y, count] of Object.entries(byYear).sort()) {
    console.log(`    ${y}: ${count}`);
  }

  if (DRY_RUN) {
    console.log('\n🟡 [DRY-RUN] Dosyalar yazılmadı. Örnek 3 kayıt:');
    for (const e of unique.slice(0, 3)) {
      console.log('\n---');
      console.log(`  date     : ${e.date}`);
      console.log(`  category : ${e.category}`);
      console.log(`  title    : ${e.title}`);
      console.log(`  kapUrl   : ${e.kapUrl}`);
      console.log(`  slug     : ${makeSlug(e.date, e.title, e.bildirimId)}`);
    }
    return;
  }

  // Çıktı dizinini temizle (önceki migration'dan kalan dosyaları sil)
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const existing = readdirSync(OUT_DIR).filter((f) => f.endsWith('.tr.md'));
  for (const f of existing) unlinkSync(join(OUT_DIR, f));
  if (existing.length > 0) console.log(`\n🧹 ${existing.length} eski dosya temizlendi`);

  // Yaz
  let written = 0;
  for (const e of unique) {
    const slug = makeSlug(e.date, e.title, e.bildirimId);
    const filename = `${slug}.tr.md`;
    const filepath = join(OUT_DIR, filename);

    const frontmatter = [
      '---',
      'lang: tr',
      `date: ${e.date}`,
      `category: ${e.category}`,
      `title: ${JSON.stringify(e.title)}`,
      `kapUrl: ${e.kapUrl}`,
      '---',
      '',
      `[${e.title}](${e.kapUrl})`,
      '',
      `> Kaynak: [KAP Platformu](${e.kapUrl})`,
      '',
    ].join('\n');

    writeFileSync(filepath, frontmatter, 'utf-8');
    written += 1;
  }

  console.log(`\n✅ ${written} KAP açıklaması dosyası oluşturuldu: ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error('❌ Hata:', err);
  process.exit(1);
});
