/**
 * Site navigasyonu — TR & EN
 *
 * Tek bir kaynak: header, footer, mobile menü buradan beslenir.
 * URL slug'ları locale'e göre değişir (yatirimci-iliskileri / investor-relations).
 */

import type { Locale } from './i18n';

export interface NavItem {
  label: string;
  href: string;
  hasSubmenu?: boolean;
  submenu?: SubNavItem[];
  current?: boolean;
}

export interface SubNavItem {
  label: string;
  href: string;
  description?: string;
  /** Mega-menu grup başlığı. Aynı `group` değerine sahip itemler dropdown'da bir kolon olarak listelenir. */
  group?: string;
}

export interface FooterColumn {
  heading: string;
  items: { label: string; href: string }[];
}

/* ── Ana navigasyon ───────────────────────────────────────── */

export const mainNav: Record<Locale, NavItem[]> = {
  tr: [
    {
      label: 'Ürünler',
      href: '/urunler',
      hasSubmenu: true,
      submenu: [
        { label: 'Kombi', href: '/urunler/kombi', description: 'Hermetik ve yoğuşmalı kombi ailesi.', group: 'Isıtma Sistemleri' },
        { label: 'Panel Radyatör', href: '/urunler/panel-radyator', description: 'Standart ve dizayn panel modelleri.', group: 'Radyatör' },
        { label: 'Dizayn Radyatör', href: '/urunler/dizayn-radyator', description: 'Alüminyum, çelik, paslanmaz, kolon.', group: 'Radyatör' },
        { label: 'Aksesuarlar', href: '/urunler/radyator-aksesuar', description: 'Vana, rekor, uzatma boruları.', group: 'Radyatör' },
        { label: 'Havlupan', href: '/urunler/havlupan', description: 'Standart ve dizayn banyo modelleri.', group: 'Banyo' },
        { label: 'Boru Grubu', href: '/urunler/boru', description: 'Yerden ısıtma + PEX-AL-PEX boru.', group: 'Tesisat' },
      ],
    },
    {
      label: 'Kurumsal',
      href: '/kurumsal',
      hasSubmenu: true,
      submenu: [
        { label: 'Hakkımızda', href: '/kurumsal/hakkimizda', description: 'Sanica Isı kim, ne üretiyor.' },
        { label: 'Tarihçe', href: '/kurumsal/tarihce', description: '1987\'den bugüne üretim yolculuğu.' },
        { label: 'Yönetim Kurulu', href: '/kurumsal/yonetim', description: '6 üye · SPK uyumlu yapı.' },
        { label: 'Üretim & Tesisler', href: '/kurumsal/uretim', description: 'Beylikdüzü merkez, Akhisar üretim.' },
        { label: 'Kalite & Sertifikalar', href: '/kurumsal/kalite', description: 'ISO ve ürün sertifikaları.' },
        { label: 'Kariyer', href: '/kariyer', description: 'Açık pozisyonlar ve İK politikası.' },
      ],
    },
    {
      label: 'Yatırımcı İlişkileri',
      href: '/yatirimci-iliskileri',
      hasSubmenu: true,
      submenu: [
        { label: 'Genel Bakış', href: '/yatirimci-iliskileri', description: 'Hisse performansı, finansal özet ve takvim.' },
        { label: 'Halka Arz', href: '/yatirimci-iliskileri/halka-arz', description: 'İzahname ve SPK mevzuat dokümanları.' },
        { label: 'Kurumsal Yönetim', href: '/yatirimci-iliskileri/kurumsal-yonetim', description: 'Komiteler, esas sözleşme ve politikalar.' },
        { label: 'Raporlar', href: '/yatirimci-iliskileri/raporlar', description: 'Finansal ve faaliyet raporları arşivi.' },
        { label: 'Kamuyu Aydınlatma', href: '/yatirimci-iliskileri/kamuyu-aydinlatma', description: 'KAP açıklamaları kronolojik akış.' },
      ],
    },
    { label: 'Sürdürülebilirlik', href: '/surdurulebilirlik' },
    { label: 'Basında Biz', href: '/basinda-biz' },
  ],
  // EN nav: sadece TAM EN içerikle calisan sayfalar listelenir.
  // Diger sayfalar (urunler, basin, kurumsal alt, IR alt, formlar, yasal)
  // henuz EN'e cevrilmedi; broken link riski yaratmamak icin gizli.
  // Yeni EN sayfa eklendikce buraya satir eklenir + i18n.ts trToEnMap guncellenir.
  en: [
    { label: 'Investor Relations', href: '/en/investor-relations' },
    { label: 'Sustainability', href: '/en/sustainability' },
  ],
};

/* ── Utility (üst koyu bant) ───────────────────────────────── */

export const utilityNav: Record<Locale, NavItem[]> = {
  tr: [
    { label: 'Kariyer', href: '/kariyer' },
    { label: 'İletişim', href: '/iletisim' },
  ],
  // EN utility nav: Careers ve Contact sayfalari henuz EN'e cevrilmedi.
  // Bos array — utility bar EN'de sadece dil switcher gosterir.
  en: [],
};

/* ── Hedef kitle çipleri ───────────────────────────────────── */

export const audienceChips: Record<Locale, { label: string; key: string }[]> = {
  tr: [
    { label: 'Ev Sahibi', key: 'home' },
    { label: 'Profesyonel', key: 'pro' },
    { label: 'Yatırımcı', key: 'investor' },
  ],
  en: [
    { label: 'Homeowner', key: 'home' },
    { label: 'Professional', key: 'pro' },
    { label: 'Investor', key: 'investor' },
  ],
};

/* ── Footer kolonları ─────────────────────────────────────── */

export const footerColumns: Record<Locale, FooterColumn[]> = {
  tr: [
    {
      heading: 'Ürünler',
      items: [
        { label: 'Kombi', href: '/urunler/kombi' },
        { label: 'Panel Radyatör', href: '/urunler/panel-radyator' },
        { label: 'Dizayn Radyatör', href: '/urunler/dizayn-radyator' },
        { label: 'Radyatör Aksesuarları', href: '/urunler/radyator-aksesuar' },
        { label: 'Havlupan', href: '/urunler/havlupan' },
        { label: 'Boru Grubu', href: '/urunler/boru' },
      ],
    },
    {
      heading: 'Kurumsal',
      items: [
        { label: 'Hakkımızda', href: '/kurumsal/hakkimizda' },
        { label: 'Tarihçe', href: '/kurumsal/tarihce' },
        { label: 'Yönetim', href: '/kurumsal/yonetim' },
        { label: 'Üretim & Tesisler', href: '/kurumsal/uretim' },
        { label: 'Kalite & Sertifikalar', href: '/kurumsal/kalite' },
        { label: 'Kariyer', href: '/kariyer' },
      ],
    },
    {
      heading: 'Yatırımcı',
      items: [
        { label: 'Genel Bakış', href: '/yatirimci-iliskileri' },
        { label: 'Halka Arz', href: '/yatirimci-iliskileri/halka-arz' },
        { label: 'Kurumsal Yönetim', href: '/yatirimci-iliskileri/kurumsal-yonetim' },
        { label: 'Raporlar', href: '/yatirimci-iliskileri/raporlar' },
        { label: 'KAP Açıklamaları', href: '/yatirimci-iliskileri/kamuyu-aydinlatma' },
        { label: 'Hisse Performansı', href: '/yatirimci-iliskileri#performance' },
      ],
    },
  ],
  // EN footer: sadece TAM EN icerik var olan sayfalar.
  en: [
    {
      heading: 'Investor Relations',
      items: [
        { label: 'Overview', href: '/en/investor-relations' },
        { label: 'Sustainability', href: '/en/sustainability' },
      ],
    },
    {
      heading: 'In Turkish',
      items: [
        { label: 'Türkçe site', href: '/' },
      ],
    },
  ],
};
