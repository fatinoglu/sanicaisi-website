/**
 * PDF index'i + WP medya metadata'yı oku, isim deseninden tasnifle,
 * uygun content collection'a markdown yaz.
 *
 * Output:
 *   src/content/financial-reports/*.tr.md
 *   src/content/annual-reports/*.tr.md
 *   src/content/investor-documents/*.tr.md
 *
 * Kullanım:
 *   npx tsx scripts/migration/05-publish-content.ts
 *   npx tsx scripts/migration/05-publish-content.ts --dry-run
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { wp, type WPMedia } from '../lib/wp';
import { memoize } from '../lib/cache';

const DRY_RUN = process.argv.includes('--dry-run');

interface PdfRecord {
  wpUrl: string;
  r2Key: string;
  publicUrl: string;
  sizeBytes: number;
  status: 'uploaded' | 'skipped' | 'failed';
}

type Doc = {
  collection: 'financial-reports' | 'annual-reports' | 'investor-documents';
  filename: string;
  frontmatter: Record<string, unknown>;
  body: string;
};

/** Türkçe karakter slugify */
function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o')
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function isoDate(dateStr: string): string {
  // 2026-05-03T11:09:53 → 2026-05-03
  return dateStr.split('T')[0];
}

/** PDF filename'inden başlık çıkar
 *  "2026-3-Donemi-Finansal-Rapor.pdf" → "2026 3 Dönemi Finansal Rapor"
 */
function nameToTitle(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Çeyrek mapping: "2026-3-Donemi" → year 2026, quarter Q3
 *  "2025-12-Donemi" → year 2025, quarter annual (12 = yıl sonu = Q4 = yıllık)
 */
function parseFinancialFilename(name: string): { year: number; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' } | null {
  // "2026-3-Donemi-Finansal-Rapor" veya "2025-12-Donemi-Finansal-Rapor"
  const m = name.match(/^(\d{4})-(\d{1,2})-Donemi-Finansal-Rapor/i);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const monthNum = parseInt(m[2], 10);
  // Sanica'nın WP konvansiyonu: 3=Q1 (Mart), 6=Q2 (Haziran), 9=Q3 (Eylül), 12=yıllık
  const quarterMap: Record<number, 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual'> = {
    3: 'Q1', 6: 'Q2', 9: 'Q3', 12: 'annual',
  };
  const quarter = quarterMap[monthNum];
  if (!quarter) return null;
  return { year, quarter };
}

function parseActivityFilename(name: string): { year: number; quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual' } | null {
  // "2026-3-Donemi-Faaliyet-Raporu" — aynı kalıp
  const m = name.match(/^(\d{4})-(\d{1,2})-Donemi-Faaliyet-Raporu/i);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const monthNum = parseInt(m[2], 10);
  const quarterMap: Record<number, 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'annual'> = {
    3: 'Q1', 6: 'Q2', 9: 'Q3', 12: 'annual',
  };
  const quarter = quarterMap[monthNum];
  if (!quarter) return null;
  return { year, quarter };
}

/** PDF'i türüne göre tasnifle ve doc oluştur */
function classify(media: WPMedia, pdf: PdfRecord): Doc | null {
  const filename = media.source_url.split('/').pop() ?? '';
  const nameBase = filename.replace(/\.pdf$/i, '');
  const title = nameToTitle(filename);
  const wpDate = isoDate(media.date ?? media.modified ?? new Date().toISOString());
  const sizeBytes = pdf.sizeBytes || media.media_details?.filesize || 0;

  // Finansal Rapor
  const fin = parseFinancialFilename(nameBase);
  if (fin) {
    return {
      collection: 'financial-reports',
      filename: `${fin.year}-${fin.quarter}.tr.md`,
      frontmatter: {
        lang: 'tr',
        year: fin.year,
        quarter: fin.quarter,
        publishDate: wpDate,
        pdfUrl: pdf.publicUrl,
        pdfSizeBytes: sizeBytes,
        auditFirm: 'PwC Türkiye',
      },
      body: `${title}\n`,
    };
  }

  // Faaliyet Raporu (çeyreklik veya yıllık)
  const act = parseActivityFilename(nameBase);
  if (act) {
    // Kapak rengi yıla göre rotasyonlu (mockup tasarımındaki gibi)
    const coverPalette: Record<string, 'ink' | 'navy' | 'sand' | 'paper'> = {
      '2025': 'ink', '2024': 'sand', '2023': 'navy', '2022': 'paper',
    };
    const coverKind = coverPalette[String(act.year)] ?? 'ink';

    return {
      collection: 'annual-reports',
      filename: `${act.year}-${act.quarter}.tr.md`,
      frontmatter: {
        lang: 'tr',
        year: act.year,
        quarter: act.quarter,
        title: `${act.year} ${act.quarter === 'annual' ? 'Yıllık' : act.quarter} Faaliyet Raporu`,
        publishDate: wpDate,
        pdfUrl: pdf.publicUrl,
        pdfSizeBytes: sizeBytes,
        coverKind,
      },
      body: `${title}\n`,
    };
  }

  // Genel kurul dokümanları
  if (/Olagan-Genel-Kurul|Genel-Kurul/i.test(nameBase)) {
    return {
      collection: 'investor-documents',
      filename: `${wpDate}-${slugify(nameBase)}.tr.md`,
      frontmatter: {
        lang: 'tr',
        slug: slugify(nameBase),
        title,
        date: wpDate,
        type: 'genel-kurul',
        pdfUrl: pdf.publicUrl,
        pdfKey: pdf.r2Key,
        pdfSizeBytes: sizeBytes,
        year: parseInt(nameBase.match(/(\d{4})/)?.[1] ?? '0', 10) || undefined,
      },
      body: `${title}\n`,
    };
  }

  // Politikalar
  if (/Politikasi|Politika/i.test(nameBase)) {
    return {
      collection: 'investor-documents',
      filename: `${wpDate}-${slugify(nameBase)}.tr.md`,
      frontmatter: {
        lang: 'tr',
        slug: slugify(nameBase),
        title,
        date: wpDate,
        type: 'politika',
        pdfUrl: pdf.publicUrl,
        pdfKey: pdf.r2Key,
        pdfSizeBytes: sizeBytes,
      },
      body: `${title}\n`,
    };
  }

  // Komite görev ve çalışma esasları
  if (/Komite|Komitenin/i.test(nameBase) && /Gorev|Calisma/i.test(nameBase)) {
    return {
      collection: 'investor-documents',
      filename: `${wpDate}-${slugify(nameBase)}.tr.md`,
      frontmatter: {
        lang: 'tr',
        slug: slugify(nameBase),
        title,
        date: wpDate,
        type: 'komite',
        pdfUrl: pdf.publicUrl,
        pdfKey: pdf.r2Key,
        pdfSizeBytes: sizeBytes,
      },
      body: `${title}\n`,
    };
  }

  // İç yönerge
  if (/Yonerge/i.test(nameBase)) {
    return {
      collection: 'investor-documents',
      filename: `${wpDate}-${slugify(nameBase)}.tr.md`,
      frontmatter: {
        lang: 'tr',
        slug: slugify(nameBase),
        title,
        date: wpDate,
        type: 'yonetim',
        pdfUrl: pdf.publicUrl,
        pdfKey: pdf.r2Key,
        pdfSizeBytes: sizeBytes,
      },
      body: `${title}\n`,
    };
  }

  // Halka Arz / İzahname / FTR / Fon Kullanım
  if (/Izahname|Halka-Arz|FTR|Fon-Kullanim/i.test(nameBase)) {
    return {
      collection: 'investor-documents',
      filename: `${wpDate}-${slugify(nameBase)}.tr.md`,
      frontmatter: {
        lang: 'tr',
        slug: slugify(nameBase),
        title,
        date: wpDate,
        type: 'halka-arz',
        pdfUrl: pdf.publicUrl,
        pdfKey: pdf.r2Key,
        pdfSizeBytes: sizeBytes,
        year: parseInt(nameBase.match(/(\d{4})/)?.[1] ?? '0', 10) || undefined,
      },
      body: `${title}\n`,
    };
  }

  // Sürdürülebilirlik
  if (/Surdurulebilirlik|TSRS/i.test(nameBase)) {
    return {
      collection: 'investor-documents',
      filename: `${wpDate}-${slugify(nameBase)}.tr.md`,
      frontmatter: {
        lang: 'tr',
        slug: slugify(nameBase),
        title,
        date: wpDate,
        type: 'surdurulebilirlik',
        pdfUrl: pdf.publicUrl,
        pdfKey: pdf.r2Key,
        pdfSizeBytes: sizeBytes,
        year: parseInt(nameBase.match(/(\d{4})/)?.[1] ?? '0', 10) || undefined,
      },
      body: `${title}\n`,
    };
  }

  // Kurumsal yönetim uyum raporu / bilgi formu
  if (/Kurumsal-Yonetim/i.test(nameBase)) {
    return {
      collection: 'investor-documents',
      filename: `${wpDate}-${slugify(nameBase)}.tr.md`,
      frontmatter: {
        lang: 'tr',
        slug: slugify(nameBase),
        title,
        date: wpDate,
        type: 'kurumsal-yonetim',
        pdfUrl: pdf.publicUrl,
        pdfKey: pdf.r2Key,
        pdfSizeBytes: sizeBytes,
        year: parseInt(nameBase.match(/(\d{4})/)?.[1] ?? '0', 10) || undefined,
      },
      body: `${title}\n`,
    };
  }

  // Katılım finans
  if (/Katilim-Finans/i.test(nameBase)) {
    return {
      collection: 'investor-documents',
      filename: `${wpDate}-${slugify(nameBase)}.tr.md`,
      frontmatter: {
        lang: 'tr',
        slug: slugify(nameBase),
        title,
        date: wpDate,
        type: 'katilim-finans',
        pdfUrl: pdf.publicUrl,
        pdfKey: pdf.r2Key,
        pdfSizeBytes: sizeBytes,
        year: parseInt(nameBase.match(/(\d{4})/)?.[1] ?? '0', 10) || undefined,
      },
      body: `${title}\n`,
    };
  }

  // Diğer (Hazirun, Tutanak vb. → genel kurul)
  if (/Hazirun|Tutanak/i.test(nameBase)) {
    return {
      collection: 'investor-documents',
      filename: `${wpDate}-${slugify(nameBase)}.tr.md`,
      frontmatter: {
        lang: 'tr',
        slug: slugify(nameBase),
        title,
        date: wpDate,
        type: 'genel-kurul',
        pdfUrl: pdf.publicUrl,
        pdfKey: pdf.r2Key,
        pdfSizeBytes: sizeBytes,
      },
      body: `${title}\n`,
    };
  }

  // Tasnif edilemedi
  return {
    collection: 'investor-documents',
    filename: `${wpDate}-${slugify(nameBase)}.tr.md`,
    frontmatter: {
      lang: 'tr',
      slug: slugify(nameBase),
      title,
      date: wpDate,
      type: 'diger',
      pdfUrl: pdf.publicUrl,
      pdfKey: pdf.r2Key,
      pdfSizeBytes: sizeBytes,
    },
    body: `${title}\n`,
  };
}

/** Frontmatter + body birleştirip YAML formatında string üret */
function toMarkdown(doc: Doc): string {
  const yaml = Object.entries(doc.frontmatter)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      if (typeof v === 'string') {
        // Çok satırlı veya özel karakter içerenler için JSON quote
        if (/[:#"'\\]/.test(v) || v.length > 80) {
          return `${k}: ${JSON.stringify(v)}`;
        }
        return `${k}: ${v}`;
      }
      return `${k}: ${v}`;
    })
    .join('\n');
  return `---\n${yaml}\n---\n\n${doc.body}`;
}

async function main() {
  console.log('📝 Content collection yazma başlıyor...\n');

  const pdfIndex = JSON.parse(readFileSync('.migration-cache/pdf-index.json', 'utf-8')) as PdfRecord[];
  const successful = pdfIndex.filter((p) => p.status === 'uploaded' || p.status === 'skipped');

  console.log(`📦 ${successful.length} PDF (${pdfIndex.length} toplam)\n`);

  // WP media metadata
  const allMedia = await memoize('all-media.json', () => wp.media());
  const mediaByUrl = new Map<string, WPMedia>();
  for (const m of allMedia) mediaByUrl.set(m.source_url, m);

  // Tasnifle
  const byCollection: Record<string, Doc[]> = {
    'financial-reports': [],
    'annual-reports': [],
    'investor-documents': [],
  };

  let unmatched = 0;
  for (const pdf of successful) {
    const media = mediaByUrl.get(pdf.wpUrl);
    if (!media) {
      console.warn(`  ⚠️  WP media bulunamadı: ${pdf.wpUrl}`);
      unmatched += 1;
      continue;
    }
    const doc = classify(media, pdf);
    if (!doc) {
      unmatched += 1;
      continue;
    }
    byCollection[doc.collection].push(doc);
  }

  console.log('\n📊 Tasnif sonucu:');
  for (const [col, docs] of Object.entries(byCollection)) {
    console.log(`  ${col.padEnd(22)} ${docs.length}`);
  }
  if (unmatched > 0) console.log(`  ${'tasnif edilemedi'.padEnd(22)} ${unmatched}`);

  // Type dağılımı (investor-documents için)
  const docTypes = byCollection['investor-documents'].reduce((acc, d) => {
    const t = d.frontmatter.type as string;
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('\n  Investor-documents alt tipler:');
  for (const [t, c] of Object.entries(docTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t.padEnd(20)} ${c}`);
  }

  if (DRY_RUN) {
    console.log('\n🟡 [DRY-RUN] Dosyalar yazılmadı. Örnek 3:');
    for (const col of Object.keys(byCollection)) {
      const doc = byCollection[col][0];
      if (doc) {
        console.log(`\n--- ${col}/${doc.filename} ---`);
        console.log(toMarkdown(doc).split('\n').slice(0, 12).join('\n'));
      }
    }
    return;
  }

  // Klasörleri temizle ve yaz
  for (const [col, docs] of Object.entries(byCollection)) {
    const dir = `src/content/${col}`;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    // Eski dosyaları temizle
    const existing = readdirSync(dir).filter((f) => f.endsWith('.tr.md'));
    for (const f of existing) unlinkSync(join(dir, f));

    for (const doc of docs) {
      writeFileSync(join(dir, doc.filename), toMarkdown(doc), 'utf-8');
    }
    console.log(`✅ ${docs.length} dosya → ${dir}/`);
  }

  console.log('\n🎉 Content collection yazma tamamlandı.');
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
