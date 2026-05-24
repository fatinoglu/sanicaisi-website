/**
 * WP Mutlak URL'lerini Relative Path'e Cevir
 *
 * src/ altinda kodda kalmis tum:
 *   https://www.sanicaisi.com.tr/wp-content/uploads/...
 *   http://www.sanicaisi.com.tr/wp-content/uploads/...
 *   //www.sanicaisi.com.tr/wp-content/uploads/...
 *   (www. opsiyonel)
 *
 * referanslarini /wp-content/uploads/... formatina cevirir.
 *
 * Neden: WP sitesi kapatildiginda mutlak URL'ler patlar. Relative path
 * Cloudflare Pages'e dusunce public/_redirects icindeki
 *   /wp-content/uploads/*  ->  R2
 * kurali yakalar ve gorseller / PDF'ler R2'den servis edilir.
 *
 * Kullanim:
 *   npx tsx scripts/migration/11-rewrite-wp-urls.ts --dry-run
 *   npx tsx scripts/migration/11-rewrite-wp-urls.ts
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');

const ROOTS = ['src'];
const EXTS = new Set(['.astro', '.md', '.mdx', '.ts', '.tsx', '.js', '.mjs', '.json', '.html']);

// Sirayla uygulanir: full URL (http/https) once, sonra protocol-relative.
// Tum varyantlar /wp-content/uploads/ ile baslayan relative path'e cevrilir.
const PATTERNS: Array<[RegExp, string]> = [
  [/https?:\/\/(?:www\.)?sanicaisi\.com\.tr\/wp-content\/uploads\//g, '/wp-content/uploads/'],
  [/\/\/(?:www\.)?sanicaisi\.com\.tr\/wp-content\/uploads\//g, '/wp-content/uploads/'],
];

let totalReplacements = 0;
let totalFiles = 0;
const changedFiles: Array<{ path: string; count: number }> = [];

function walk(dir: string): void {
  for (const f of readdirSync(dir)) {
    const fp = join(dir, f);
    let st;
    try { st = statSync(fp); } catch { continue; }
    if (st.isDirectory()) {
      walk(fp);
    } else if (EXTS.has(extname(f))) {
      processFile(fp);
    }
  }
}

function processFile(fp: string): void {
  const original = readFileSync(fp, 'utf8');
  let content = original;
  let count = 0;
  for (const [re, replacement] of PATTERNS) {
    content = content.replace(re, () => { count += 1; return replacement; });
  }
  if (count === 0) return;

  changedFiles.push({ path: fp, count });
  totalFiles += 1;
  totalReplacements += count;
  if (!DRY_RUN) writeFileSync(fp, content, 'utf8');
}

console.log(`WP mutlak URL -> relative path${DRY_RUN ? ' (DRY-RUN)' : ''}\n`);

for (const root of ROOTS) walk(root);

console.log('Degisen dosyalar:');
for (const c of changedFiles.sort((a, b) => b.count - a.count)) {
  console.log(`  ${c.count.toString().padStart(3)}  ${c.path}`);
}
console.log('');
console.log(`Toplam: ${totalReplacements} replacement, ${totalFiles} dosya`);
if (DRY_RUN) console.log('(DRY-RUN: dosyalar yazilmadi)');
