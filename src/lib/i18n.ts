/**
 * i18n yardımcı fonksiyonları
 *
 * Astro built-in i18n ile birlikte çalışır.
 * Locale: 'tr' (default, prefix yok) | 'en' (/en/* prefix'li)
 */

export const locales = ['tr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'tr';

const locConfig = {
  tr: { code: 'tr-TR', label: 'Türkçe', short: 'TR' },
  en: { code: 'en-US', label: 'English', short: 'EN' },
} as const;

/** Astro.url.pathname'den locale'i çıkar */
export function getLocale(pathname: string): Locale {
  if (pathname.startsWith('/en/') || pathname === '/en') return 'en';
  return 'tr';
}

/** Locale-aware tarih formatı (örn. "22 Mayıs 2026") */
export function formatDate(date: Date | string, locale: Locale = 'tr'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locConfig[locale].code, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** Kompakt tarih (22.05.2026) */
export function formatDateShort(date: Date | string, locale: Locale = 'tr'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locConfig[locale].code).format(d);
}

/** Para birimi formatı (TR: ₺24,80 / EN: ₺24.80) */
export function formatCurrency(amount: number, locale: Locale = 'tr'): string {
  return new Intl.NumberFormat(locConfig[locale].code, {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Sayı formatı (1.234.567 TR / 1,234,567 EN) */
export function formatNumber(n: number, locale: Locale = 'tr'): string {
  return new Intl.NumberFormat(locConfig[locale].code).format(n);
}

/** Yüzde formatı (%24,80) */
export function formatPercent(n: number, locale: Locale = 'tr', decimals = 2): string {
  return new Intl.NumberFormat(locConfig[locale].code, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n / 100);
}

/** Dosya boyutu formatı (PDF · 1,2 MB) */
export function formatBytes(bytes: number, locale: Locale = 'tr'): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  const mb = bytes / (1024 * 1024);
  return new Intl.NumberFormat(locConfig[locale].code, { maximumFractionDigits: 1 }).format(mb) + ' MB';
}

/** Locale ekli URL üretir
 *  ('tr', '/urunler')           → '/urunler'
 *  ('en', '/products')          → '/en/products'
 *  ('tr', '/yatirimci-iliskileri') → '/yatirimci-iliskileri' */
export function localizedUrl(locale: Locale, path: string): string {
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  if (locale === defaultLocale) return cleaned;
  return `/${locale}${cleaned}`;
}

/** TR → EN tam EN versiyonu olan sayfa eşleştirmeleri.
 *
 *  EN sitesi şu an Plan-B kapsamında: yalnızca Anasayfa, Sustainability ve
 *  Investor Relations (ana sayfa) tam EN içerikle çalışıyor. Diğer TR sayfalar
 *  için EN equivalent oluşturulmamış; lang switcher karşılığı olmayan bir
 *  sayfaya gönderirse kullanıcı 404 ya da boş içerikle karşılaşır.
 *
 *  Bu yüzden alternateLocaleUrl bu map'i kullanır:
 *   - Map'te varsa: EN sayfasına gönderir, isAvailable=true
 *   - Yoksa: /en/ ana sayfasına geri düşer (isAvailable=false)
 *
 *  Yeni EN sayfa eklendikçe buraya bir satır eklemek yeterli.
 */
const trToEnMap: Record<string, string> = {
  '/': '/en/',
  '/surdurulebilirlik': '/en/sustainability',
  '/yatirimci-iliskileri': '/en/investor-relations',
};

const enToTrMap: Record<string, string> = Object.fromEntries(
  Object.entries(trToEnMap).map(([tr, en]) => [en.replace(/\/$/, '') || '/', tr]),
);

export interface AlternateUrl {
  /** Hedef URL — her zaman tıklanabilir, hiç değilse /en/ ya da / ana sayfaya gider. */
  url: string;
  /** Aynı sayfanın diğer dilde tam karşılığı var mı? false ise ana sayfaya düşülüyor. */
  isAvailable: boolean;
}

/** Diğer dile geçiş URL'i — slug eşleştirme map'i (trToEnMap) üzerinden. */
export function alternateLocaleUrl(currentLocale: Locale, currentPath: string): AlternateUrl {
  const normalized = currentPath.replace(/\/$/, '') || '/';
  if (currentLocale === 'tr') {
    const en = trToEnMap[normalized];
    return en ? { url: en, isAvailable: true } : { url: '/en/', isAvailable: false };
  }
  const tr = enToTrMap[normalized];
  return tr ? { url: tr, isAvailable: true } : { url: '/', isAvailable: false };
}

export { locConfig };
