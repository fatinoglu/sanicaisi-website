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
  en: [
    {
      label: 'Products',
      href: '/en/products',
      hasSubmenu: true,
      submenu: [
        { label: 'Boiler', href: '/en/products/kombi', description: 'Hermetic & condensing boilers.', group: 'Heating' },
        { label: 'Panel Radiator', href: '/en/products/panel-radyator', description: 'Standard & designer panel models.', group: 'Radiator' },
        { label: 'Designer Radiator', href: '/en/products/dizayn-radyator', description: 'Aluminum, steel, stainless, column.', group: 'Radiator' },
        { label: 'Accessories', href: '/en/products/radyator-aksesuar', description: 'Valves, fittings, extension pipes.', group: 'Radiator' },
        { label: 'Towel Warmer', href: '/en/products/havlupan', description: 'Standard & designer bathroom heat.', group: 'Bathroom' },
        { label: 'Pipe Systems', href: '/en/products/boru', description: 'Underfloor heating + PEX-AL-PEX pipe.', group: 'Plumbing' },
      ],
    },
    {
      label: 'Corporate',
      href: '/en/corporate',
      hasSubmenu: true,
      submenu: [
        { label: 'About Us', href: '/en/corporate/about', description: 'Who we are, what we make.' },
        { label: 'History', href: '/en/corporate/history', description: 'Manufacturing journey since 1987.' },
        { label: 'Board of Directors', href: '/en/corporate/management', description: '6 members · CMB compliant.' },
        { label: 'Manufacturing', href: '/en/corporate/manufacturing', description: 'Beylikdüzü HQ, Akhisar facilities.' },
        { label: 'Quality & Certifications', href: '/en/corporate/quality', description: 'ISO and product certificates.' },
        { label: 'Careers', href: '/en/careers', description: 'Open positions and HR policy.' },
      ],
    },
    {
      label: 'Investor Relations',
      href: '/en/investor-relations',
      hasSubmenu: true,
      submenu: [
        { label: 'Overview', href: '/en/investor-relations', description: 'Stock performance and financial summary.' },
        { label: 'IPO', href: '/en/investor-relations/halka-arz', description: 'Prospectus and CMB documents.' },
        { label: 'Corporate Governance', href: '/en/investor-relations/kurumsal-yonetim', description: 'Committees, articles and policies.' },
        { label: 'Reports', href: '/en/investor-relations/raporlar', description: 'Financial and annual reports archive.' },
        { label: 'Public Disclosures', href: '/en/investor-relations/kamuyu-aydinlatma', description: 'PDP disclosures chronological feed.' },
      ],
    },
    { label: 'Sustainability', href: '/en/sustainability' },
    { label: 'In the Press', href: '/en/press' },
  ],
};

/* ── Utility (üst koyu bant) ───────────────────────────────── */

export const utilityNav: Record<Locale, NavItem[]> = {
  tr: [
    { label: 'Kariyer', href: '/kariyer' },
    { label: 'İletişim', href: '/iletisim' },
  ],
  en: [
    { label: 'Careers', href: '/en/careers' },
    { label: 'Contact', href: '/en/contact' },
  ],
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
  en: [
    {
      heading: 'Products',
      items: [
        { label: 'Panel Radiator', href: '/en/products/panel-radiator' },
        { label: 'Designer Radiator', href: '/en/products/designer-radiator' },
        { label: 'Towel Warmer', href: '/en/products/towel-warmer' },
        { label: 'Condensing Boiler', href: '/en/products/boiler' },
        { label: 'PEX-AL-PEX Pipe', href: '/en/products/pipe' },
      ],
    },
    {
      heading: 'Corporate',
      items: [
        { label: 'About Us', href: '/en/corporate/about' },
        { label: 'History', href: '/en/corporate/history' },
        { label: 'Management', href: '/en/corporate/management' },
        { label: 'Manufacturing', href: '/en/corporate/manufacturing' },
        { label: 'Quality & Certifications', href: '/en/corporate/quality' },
        { label: 'Careers', href: '/en/careers' },
      ],
    },
    {
      heading: 'Investor',
      items: [
        { label: 'Overview', href: '/en/investor-relations' },
        { label: 'IPO', href: '/en/investor-relations/halka-arz' },
        { label: 'Corporate Governance', href: '/en/investor-relations/kurumsal-yonetim' },
        { label: 'Reports', href: '/en/investor-relations/raporlar' },
        { label: 'Public Disclosures', href: '/en/investor-relations/kamuyu-aydinlatma' },
        { label: 'Stock Performance', href: '/en/investor-relations#performance' },
      ],
    },
  ],
};
