/**
 * Şirket iletişim bilgileri — tek kaynak.
 * Footer, iletişim sayfası, form sayfaları, JSON-LD ve IRContactSection
 * tümü bu dosyadan beslenir.
 *
 * Kaynak: https://www.sanicaisi.com.tr/iletisim/
 */

export interface ContactInfo {
  company: string;
  legalName: string;
  address: {
    street: string;
    postal: string;
    district: string;
    city: string;
    country: string;
  };
  addressShort: string;
  addressOneLine: string;
  phones: {
    main: { display: string; href: string };
    service: { display: string; href: string };
    fax: { display: string; href: string };
  };
  emails: {
    info: string;
    investor: string;
  };
  hours: {
    weekdaysTR: string;
    weekdaysEN: string;
  };
  mapEmbedUrl: string;
  mapLinkUrl: string;
}

export const contact: ContactInfo = {
  company: 'Sanica Isı',
  legalName: 'Sanica Isı Sanayi A.Ş.',
  address: {
    street: 'Kavaklı Mah. İstanbul Cad. No:10',
    postal: '34520',
    district: 'Beylikdüzü',
    city: 'İstanbul',
    country: 'Türkiye',
  },
  addressShort: 'Beylikdüzü, İstanbul',
  addressOneLine: 'Kavaklı Mah. İstanbul Cad. No:10 · 34520 Beylikdüzü/İstanbul',
  phones: {
    main: { display: '+90 212 855 80 80', href: 'tel:+902128558080' },
    service: { display: '0850 460 66 88', href: 'tel:+908504606688' },
    fax: { display: '+90 212 855 80 90', href: 'tel:+902128558090' },
  },
  emails: {
    info: 'info@sanicaisi.com.tr',
    investor: 'yatirimci@sanicaisi.com.tr',
  },
  hours: {
    weekdaysTR: 'Pazartesi – Cuma · 08:30 – 18:30',
    weekdaysEN: 'Monday – Friday · 08:30 – 18:30',
  },
  mapEmbedUrl:
    'https://maps.google.com/maps?q=%C4%B0stanbul%20Cad.%20No%3A10%20Kavakl%C4%B1%2C%20Beylikduzu&t=m&z=14&output=embed&iwloc=near',
  mapLinkUrl:
    'https://maps.google.com/maps?q=%C4%B0stanbul+Cad.+No%3A10+Kavakl%C4%B1%2C+Beylikduzu',
};
