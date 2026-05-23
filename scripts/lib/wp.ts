/**
 * WordPress REST API client
 * Sanica WP API ile etkileşim için tip-güvenli wrapper
 */
import './env';

const WP_BASE = process.env.WP_BASE_URL ?? 'https://www.sanicaisi.com.tr';
const WP_USER = process.env.WP_USER;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

const authHeader = WP_USER && WP_APP_PASSWORD
  ? { Authorization: 'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64') }
  : {};

export interface WPPage {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt?: { rendered: string };
  date: string;
  modified: string;
  parent: number;
  status: string;
  link: string;
}

export interface WPMedia {
  id: number;
  slug: string;
  source_url: string;
  mime_type: string;
  media_details?: { width?: number; height?: number; filesize?: number };
}

export interface WPPost {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  link: string;
  categories: number[];
}

/** Sayfalı endpoint'i tamamen çeker (per_page=100 + sayfalama) */
export async function fetchAll<T = unknown>(
  endpoint: string,
  params: Record<string, string | number> = {},
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  const perPage = params.per_page ?? 100;

  while (true) {
    const url = new URL(`${WP_BASE}/wp-json/wp/v2${endpoint}`);
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('page', String(page));
    for (const [k, v] of Object.entries(params)) {
      if (k !== 'per_page') url.searchParams.set(k, String(v));
    }

    const res = await fetch(url, { headers: { ...authHeader } });
    if (!res.ok) {
      // 400 = sayfa kalmadı (WP davranışı)
      if (res.status === 400 && page > 1) break;
      throw new Error(`WP ${endpoint} page ${page}: HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as T[];
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);

    if (data.length < perPage) break;
    page += 1;
  }

  return all;
}

/** Tek sayfayı slug ile çeker */
export async function fetchPageBySlug(slug: string): Promise<WPPage | null> {
  const url = new URL(`${WP_BASE}/wp-json/wp/v2/pages`);
  url.searchParams.set('slug', slug);
  const res = await fetch(url, { headers: { ...authHeader } });
  if (!res.ok) return null;
  const data = await res.json() as WPPage[];
  return data[0] ?? null;
}

/** Tek sayfayı ID ile çeker */
export async function fetchPageById(id: number): Promise<WPPage | null> {
  const url = `${WP_BASE}/wp-json/wp/v2/pages/${id}`;
  const res = await fetch(url, { headers: { ...authHeader } });
  if (!res.ok) return null;
  return await res.json() as WPPage;
}

export const wp = {
  pages: () => fetchAll<WPPage>('/pages'),
  posts: () => fetchAll<WPPost>('/posts'),
  media: () => fetchAll<WPMedia>('/media'),
  pageBySlug: fetchPageBySlug,
  pageById: fetchPageById,
  baseUrl: WP_BASE,
};
