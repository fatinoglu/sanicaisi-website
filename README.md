# Sanica Isı — Kurumsal Web Sitesi

> [sanicaisi.com.tr](https://sanicaisi.com.tr) · BIST: **SNICA**

Astro + Cloudflare Pages üzerinde yeniden inşa edilen kurumsal site. Tam iki dilli (TR / EN), statik üretim, yatırımcı bölümü Sveltia CMS ile yönetilir.

## Yığın

| Katman | Seçim |
|---|---|
| Framework | Astro 6 (statik build) |
| Dil | TypeScript (strict) |
| Stil | Vanilla CSS + CSS değişkenleri (tasarım token'ları) |
| Tipografi | Fraunces · Inter · IBM Plex Mono |
| CMS | Sveltia CMS (git-based, Faz 5) |
| Medya | Cloudflare R2 (Faz 4'te entegre) |
| Hosting | Cloudflare Pages |
| Arama | Pagefind (Faz 7) |
| Form | Cloudflare Pages Functions (Faz 7) |
| Hisse veri | Yahoo Finance build-time fetch (Faz 7) |

## Komutlar

```bash
npm install        # Bağımlılıklar
npm run dev        # Dev sunucusu (http://localhost:4321)
npm run build      # Prodüksiyon build (dist/)
npm run preview    # Build çıktısını yerel olarak önizle
npm run check      # Type & content collection check
npm run format     # Prettier
```

## Proje yapısı

```
src/
├── components/     # Astro bileşenleri (layout, ui, investor, products)
├── content/        # Content collections (kap, raporlar, ürünler, vb.)
├── data/           # Statik JSON (nav, sertifikalar, hisse cache)
├── layouts/        # BaseLayout, PageLayout, InvestorLayout
├── lib/            # i18n, format, stock helpers
├── pages/          # Astro routes (TR root, /en/* için EN)
└── styles/         # tokens.css, base.css, typography.css, global.css

scripts/            # Tek-seferlik (WP migration, OG image gen, vb.)
functions/api/      # Cloudflare Pages Functions (form endpoint'leri)
mockup/             # Onaylı tasarım mockup'ları (referans, deploy edilmez)
```

## i18n

- **TR** varsayılan, prefix yok: `/yatirimci-iliskileri`
- **EN** `/en/*` prefix'li: `/en/investor-relations`
- URL slug'ları locale'e göre değişir (bkz. `src/lib/nav.ts`)
- Tarih, sayı, para formatları locale-aware (`src/lib/i18n.ts`)

## Geliştirme aşaması

**Faz 0** tamamlandı: iskelet, tasarım token'ları, header/footer, i18n, anasayfa scaffold.

Sıradaki fazlar:

- **Faz 1** — Anasayfa bölümlerinin mockup'tan port'u
- **Faz 2** — Yatırımcı İlişkileri sayfası ve alt sayfaları
- **Faz 3** — Ürünler ve Kurumsal sayfalar
- **Faz 4** — WordPress'ten içerik migrasyonu + R2 medya yükleme
- **Faz 5** — Sveltia CMS kurulumu + ilk yayınlama testi
- **Faz 6** — EN içerik (AI çeviri + redaksiyon)
- **Faz 7** — Form endpoint'leri, Pagefind arama, hisse veri cron
- **Faz 8** — QA + accessibility + performance budget
- **Faz 9** — DNS cutover

Plan: `C:\Users\cagri\.claude\plans\sanica-isi-teknik-uygulama-plani.md`

## Mockup referansı

Onaylı tasarım iki HTML dosyası olarak `mockup/` klasöründe:

- `mockup/index-v2.html` — Anasayfa (Endüstriyel Editorial, 9 bölüm)
- `mockup/yatirimci-iliskileri.html` — Yatırımcı İlişkileri (7 bölüm)

Bu dosyalar bileşenleştirme için tek doğruluk kaynağıdır.

## Lisans

Özel — Sanica Isı Sanayi A.Ş.
