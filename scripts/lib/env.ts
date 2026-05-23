/**
 * Env loader — .env.local önceliğiyle (Astro konvansiyonu)
 *
 * Sıra: .env.local > .env
 * Migration script'leri bu dosyayı en başta import etmeli
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';

// .env.local varsa onu yükle (Astro/Vite konvansiyonu)
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
}
// .env (varsa, sadece eksik var'ları doldurur)
if (existsSync('.env')) {
  config({ path: '.env' });
}
