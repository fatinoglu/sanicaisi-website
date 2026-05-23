/**
 * Cloudflare R2 client — S3 API uyumlu
 * Sanica medya (PDF, görsel) bucket'ı: sanicaisi
 */
import './env';
import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET ?? 'sanicaisi';
const R2_PUBLIC_BASE = process.env.R2_PUBLIC_BASE ?? `https://pub-${R2_ACCOUNT_ID}.r2.dev`;

let _client: S3Client | null = null;

export function r2(): S3Client {
  if (!_client) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error(
        '[R2] Eksik credentials. .env.local içine R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY ekleyin.',
      );
    }
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

export const R2 = {
  bucket: R2_BUCKET,
  publicBase: R2_PUBLIC_BASE,
};

/** Bir nesnenin URL'ini üretir (public base + key) */
export function publicUrl(key: string): string {
  return `${R2_PUBLIC_BASE}/${key}`;
}

/** Bir key var mı kontrol eder */
export async function exists(key: string): Promise<boolean> {
  try {
    await r2().send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Buffer'ı R2'ye yükler */
export async function upload(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  cacheControl = 'public, max-age=31536000, immutable',
): Promise<string> {
  await r2().send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl,
  }));
  return publicUrl(key);
}

/** Bucket'taki tüm key'leri listeler (debug / inventory) */
export async function listAll(prefix = ''): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await r2().send(new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: prefix,
      ContinuationToken: token,
    }));
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    token = res.NextContinuationToken;
  } while (token);
  return keys;
}

/** WP medya URL'inden R2 key üretir
 *  https://www.sanicaisi.com.tr/wp-content/uploads/2026/05/file.pdf
 *  → 2026/05/file.pdf
 */
export function keyFromWpUrl(url: string): string {
  const idx = url.indexOf('/wp-content/uploads/');
  if (idx < 0) {
    // Fallback: son segment
    return url.split('/').pop() ?? url;
  }
  return url.slice(idx + '/wp-content/uploads/'.length);
}
