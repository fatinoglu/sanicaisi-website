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
  current?: boolean;
}

export interface FooterColumn {
  heading: string;
  items: { label: string; href: string }[];
}

/* ── Ana navigasyon ───────────────────────────────────────── */

export const mainNav: Record<Locale, NavItem[]> = {
  tr: [
    { label: 'Ürünler', href: '/urunler', hasSubmenu: true },
    { label: 'Kurumsal', href: '/kurumsal', hasSubmenu: true },
    { label: 'Yatırımcı İlişkileri', href: '/yatirimci-iliskileri' },
    { label: 'Sürdürülebilirlik', href: '/surdurulebilirlik' },
    { label: 'Basında Biz', href: '/basinda-biz' },
  ],
  en: [
    { label: 'Products', href: '/en/products', hasSubmenu: true },
    { label: 'Corporate', href: '/en/corporate', hasSubmenu: true },
    { label: 'Investor Relations', href: '/en/investor-relations' },
    { label: 'Sustainability', href: '/en/sustainability' },
    { label: 'In the Press', href: '/en/press' },
  ],
};

/* ── Utility (üst koyu bant) ───────────────────────────────── */

export const utilityNav: Record<Locale, NavItem[]> = {
  tr: [
    { label: 'Bayi Portalı', href: '/bayi-portali' },
    { label: 'Yetkili Servis', href: '/yetkili-servis' },
    { label: 'Kariyer', href: '/kariyer' },
    { label: 'İletişim', href: '/iletisim' },
  ],
  en: [
    { label: 'Dealer Portal', href: '/en/dealer-portal' },
    { label: 'Service', href: '/en/service' },
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
        { label: 'Panel Radyatör', href: '/urunler/panel-radyator' },
        { label: 'Tasarım Radyatör', href: '/urunler/tasarim-radyator' },
        { label: 'Havlupan', href: '/urunler/havlupan' },
        { label: 'Yoğuşmalı Kombi', href: '/urunler/kombi' },
        { label: 'PEX-AL-PEX Boru', href: '/urunler/boru' },
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
        { label: 'Hisse Performansı', href: '/yatirimci-iliskileri#performance' },
        { label: 'KAP Açıklamaları', href: '/yatirimci-iliskileri/kap' },
        { label: 'Finansal Raporlar', href: '/yatirimci-iliskileri/finansal-raporlar' },
        { label: 'Faaliyet Raporları', href: '/yatirimci-iliskileri/faaliyet-raporlari' },
        { label: 'Sermaye Yapısı', href: '/yatirimci-iliskileri/sermaye-yapisi' },
        { label: 'Yatırımcı İletişim', href: '/yatirimci-iliskileri/iletisim' },
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
        { label: 'Stock Performance', href: '/en/investor-relations#performance' },
        { label: 'PDP Disclosures', href: '/en/investor-relations/disclosures' },
        { label: 'Financial Reports', href: '/en/investor-relations/financial-reports' },
        { label: 'Annual Reports', href: '/en/investor-relations/annual-reports' },
        { label: 'Capital Structure', href: '/en/investor-relations/capital-structure' },
        { label: 'Investor Contact', href: '/en/investor-relations/contact' },
      ],
    },
  ],
};
