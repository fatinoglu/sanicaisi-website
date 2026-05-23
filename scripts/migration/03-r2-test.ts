/**
 * R2 bağlantı testi — credentials çalışıyor mu, bucket erişilebilir mi
 */
import { r2, R2, listAll, upload, exists, publicUrl } from '../lib/r2';

async function main() {
  console.log('🔌 R2 bağlantı testi...\n');
  console.log(`  Bucket  : ${R2.bucket}`);
  console.log(`  Public  : ${R2.publicBase}\n`);

  // Test 1: list (boş bucket beklenir)
  try {
    const keys = await listAll();
    console.log(`✅ Bucket erişimi OK. Mevcut nesne sayısı: ${keys.length}`);
    if (keys.length > 0 && keys.length < 20) {
      for (const k of keys.slice(0, 10)) console.log(`     - ${k}`);
    }
  } catch (err) {
    console.error('❌ Bucket erişimi BAŞARISIZ:', (err as Error).message);
    process.exit(1);
  }

  // Test 2: küçük bir test dosyası yükle
  const testKey = '_test/migration-ping.txt';
  const testBody = Buffer.from(`Sanica migration ping — ${new Date().toISOString()}\n`, 'utf-8');

  try {
    const url = await upload(testKey, testBody, 'text/plain; charset=utf-8');
    console.log(`\n✅ Test yükleme OK.`);
    console.log(`     Key    : ${testKey}`);
    console.log(`     URL    : ${url}`);
    console.log(`     Size   : ${testBody.length} bytes`);
  } catch (err) {
    console.error('❌ Yükleme BAŞARISIZ:', (err as Error).message);
    process.exit(1);
  }

  // Test 3: exists kontrolü
  const has = await exists(testKey);
  console.log(`\n✅ Exists check: ${has ? 'YES' : 'NO'}`);

  console.log('\n🎉 R2 hazır. Faz 4b başlayabilir.');
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
