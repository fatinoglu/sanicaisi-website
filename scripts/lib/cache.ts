/**
 * Lokal migration cache — WP API yanıtlarını .migration-cache/ altında tutar
 * Tekrar tekrar fetch çağrılmasın diye
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CACHE_DIR = '.migration-cache';

if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

export function cachePath(filename: string): string {
  return join(CACHE_DIR, filename);
}

export function readCache<T = unknown>(filename: string): T | null {
  const p = cachePath(filename);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8')) as T;
}

export function writeCache(filename: string, data: unknown): void {
  writeFileSync(cachePath(filename), JSON.stringify(data, null, 2), 'utf-8');
}

/** Cache varsa oku, yoksa fetch'i çağır ve cache'le */
export async function memoize<T>(
  filename: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = readCache<T>(filename);
  if (cached !== null) {
    console.log(`  📦 [cache] ${filename}`);
    return cached;
  }
  console.log(`  🌐 [fetch] ${filename}`);
  const data = await fetcher();
  writeCache(filename, data);
  return data;
}
