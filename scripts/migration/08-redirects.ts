/**
 * Redirect map generator — eski WP slug → yeni route 301 yönlendirme
 *
 * Çıktı: public/_redirects (Cloudflare Pages native format)
 *   /old-path  /new-path  301
 *
 * Kullanım:
 *   npx tsx scripts/migration/08-redirects.ts
 */
import '../lib/env';
import { writeFileSync } from 'node:fs';

interface Redirect {
  from: string;
  to: string;
  comment?: string;
  status?: 301 | 302;
}

// Statik redirect kuralları
const redirects: Redirect[] = [
  // ── Kurumsal ───────────────────────────────────────────
  { from: '/hakkimizda', to: '/kurumsal/hakkimizda', comment: 'WP: hakkimizda → yeni: kurumsal alt' },
  { from: '/hakkimizda/', to: '/kurumsal/hakkimizda', status: 301 },
  { from: '/kvkk', to: '/kurumsal/kvkk' },
  { from: '/kvkk/', to: '/kurumsal/kvkk' },
  { from: '/iletisim', to: '/iletisim' },                 // aynı kalır

  // ── Yatırımcı İlişkileri (WP ağacı → yeni IR sayfası) ──
  { from: '/yatirimci-iliskileri', to: '/yatirimci-iliskileri' }, // aynı slug
  { from: '/yatirimci-iliskileri/halka-arz', to: '/yatirimci-iliskileri#halka-arz' },
  { from: '/yatirimci-iliskileri/kurumsal-yonetim', to: '/yatirimci-iliskileri/#capital' },
  { from: '/yatirimci-iliskileri/kamuyu-aydinlatma', to: '/yatirimci-iliskileri/#kap' },
  { from: '/yatirimci-iliskileri/raporlar', to: '/yatirimci-iliskileri/#financial' },

  // WP IR alt sayfaları → yeni IR ana sayfa'da bölüm
  { from: '/yatirimci-iliskileri/kurumsal-yonetim/ozel-durum-aciklamalari', to: '/yatirimci-iliskileri/#kap' },
  { from: '/yatirimci-iliskileri/kurumsal-yonetim/yonetim-kurulu', to: '/yatirimci-iliskileri/#capital' },
  { from: '/yatirimci-iliskileri/kurumsal-yonetim/ortaklik-yapisi', to: '/yatirimci-iliskileri/#capital' },
  { from: '/yatirimci-iliskileri/kurumsal-yonetim/yonetim-kurulu-komiteleri', to: '/yatirimci-iliskileri/#capital' },
  { from: '/yatirimci-iliskileri/kurumsal-yonetim/yonetim-kurulu-komite-uyeleri', to: '/yatirimci-iliskileri/#capital' },
  { from: '/yatirimci-iliskileri/kurumsal-yonetim/politikalar', to: '/yatirimci-iliskileri/#capital' },
  { from: '/yatirimci-iliskileri/kurumsal-yonetim/genel-kurullar', to: '/yatirimci-iliskileri/#capital' },
  { from: '/yatirimci-iliskileri/kurumsal-yonetim/genel-kurul-ic-yonergesi', to: '/yatirimci-iliskileri/#capital' },
  { from: '/yatirimci-iliskileri/kurumsal-yonetim/yonetim-ic-yonergesi', to: '/yatirimci-iliskileri/#capital' },
  { from: '/yatirimci-iliskileri/kurumsal-yonetim/bagimsiz-denetci', to: '/yatirimci-iliskileri/#capital' },
  { from: '/yatirimci-iliskileri/kurumsal-yonetim/sermaye-artirimlari', to: '/yatirimci-iliskileri/#capital' },

  { from: '/yatirimci-iliskileri/raporlar/finansal-raporlar', to: '/yatirimci-iliskileri/#financial' },
  { from: '/yatirimci-iliskileri/raporlar/faaliyet-raporlari', to: '/yatirimci-iliskileri/#annual' },
  { from: '/yatirimci-iliskileri/raporlar/kurumsal-yonetim-ilkelerine-uyum-raporlari', to: '/yatirimci-iliskileri/#annual' },
  { from: '/yatirimci-iliskileri/raporlar/surdurulebilirlik-raporu', to: '/yatirimci-iliskileri/#annual' },
  { from: '/yatirimci-iliskileri/raporlar/surdurulebilirlik-uyum-raporlari', to: '/yatirimci-iliskileri/#annual' },
  { from: '/yatirimci-iliskileri/raporlar/fon-kullanim-yeri-raporlari', to: '/yatirimci-iliskileri/#annual' },
  { from: '/yatirimci-iliskileri/raporlar/halka-arz-fiyati-degerlendirme-raporlari', to: '/yatirimci-iliskileri/#annual' },
  { from: '/yatirimci-iliskileri/raporlar/katilim-finans-ilkeleri-formlari', to: '/yatirimci-iliskileri/#annual' },

  // ── Bilgi toplumu / şikayet vb. ───────────────────────
  { from: '/bilgi-toplumu-hizmetleri', to: '/kurumsal' },
  { from: '/sikayet-formu-2', to: '/iletisim' },
  { from: '/memnuniyet-formu', to: '/iletisim' },
  { from: '/dealer-request-form', to: '/bayi-bul' },
  { from: '/haberler', to: '/basinda-biz' },

  // ── Eski wp-content uploads → R2 (PDF'ler) ────────────
  // Cloudflare Pages _redirects splat ile çalışır:
  { from: '/wp-content/uploads/*', to: 'https://pub-ac09aed3790d4233a2c890d8b8d8fa16.r2.dev/:splat' },
];

function formatRedirect(r: Redirect): string {
  const status = r.status ?? 301;
  return `${r.from.padEnd(70)} ${r.to.padEnd(60)} ${status}`;
}

const header = `# Cloudflare Pages — _redirects
# Eski WP URL'lerinden yeni Astro route'lara 301 yönlendirme
# Format: source  destination  status
# Splat (*) ve placeholder (:splat) destekli
#
# Otomatik üretildi: scripts/migration/08-redirects.ts
# Manuel düzenleme: bu dosya değil, scripti güncelleyin

`;

const content = header + redirects.map(formatRedirect).join('\n') + '\n';

writeFileSync('public/_redirects', content, 'utf-8');

console.log(`✅ public/_redirects yazıldı — ${redirects.length} kural`);
console.log(`   Cloudflare Pages build sırasında dist/_redirects'a kopyalanır`);
