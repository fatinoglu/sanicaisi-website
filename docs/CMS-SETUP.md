# Sveltia CMS Kurulumu — Sanica Isı

Editörlerin içerik düzenlemek için kullanacağı yönetim paneli.

**URL (deploy sonrası)**: `https://sanicaisi.pages.dev/admin`

## Yapı

```
public/admin/index.html      ← Sveltia CMS SPA (CDN'den yüklenir)
public/admin/config.yml      ← Koleksiyon şemaları (8 collection)
functions/oauth/index.ts     ← GitHub OAuth start
functions/oauth/callback.ts  ← GitHub OAuth callback → postMessage'la Sveltia'ya
public/uploads/              ← Editör görsel yüklemeleri (git'e commit)
```

## Editör Akışı

1. Editör tarayıcıdan `/admin` açar
2. Sveltia "Login with GitHub" buton gösterir
3. Buton tıklanınca → `/oauth` → GitHub authorize → kullanıcı onaylar
4. GitHub → `/oauth/callback?code=...` → bizim function `code`'u token'a çevirir
5. Token postMessage ile Sveltia'ya yollanır, kullanıcı login olur
6. Editör formdan içerik yazar → "Publish" → commit + push (kullanıcı adına)
7. Cloudflare Pages otomatik build → 1-2 dakika içinde canlı

## Bir kerelik kurulum (siz yapacaksınız)

### 1. GitHub OAuth App oluştur

GitHub Settings → **Developer settings** → **OAuth Apps** → **New OAuth App**:

| Alan | Değer |
|---|---|
| Application name | `Sanica CMS` |
| Homepage URL | `https://sanicaisi.pages.dev` (DNS sonrası `https://sanicaisi.com.tr`) |
| Authorization callback URL | `https://sanicaisi.pages.dev/oauth/callback` |

"Register application" → açılan sayfada:
- **Client ID** → kopyalayın
- **Generate a new client secret** → kopyalayın (sadece bir kez gösterilir)

### 2. Cloudflare Pages env vars

Cloudflare Dashboard → **Workers & Pages** → `sanicaisi-website` (proje) → **Settings** → **Environment variables**:

| Variable | Type | Value |
|---|---|---|
| `GITHUB_CLIENT_ID` | Plaintext | (GitHub'tan kopyaladığınız Client ID) |
| `GITHUB_CLIENT_SECRET` | **Encrypted** | (GitHub'tan kopyaladığınız Client Secret) |

**Önemli:** `GITHUB_CLIENT_SECRET`'ı mutlaka "Encrypted" olarak kaydedin (gizli).

Her ikisini de **Production** environment'a ekleyin. Branch preview için de eklemek isterseniz **Preview** sekmesinde de tanımlayın.

### 3. Editörleri davet

Editör olacak GitHub kullanıcıları için iki seçenek:

**(a) Repo'ya collaborator olarak ekle** (en basit)
- `github.com/fatinoglu/sanicaisi-website` → Settings → Collaborators → Add people
- Rol: **Write** (push yetkisi şart)
- Editör daveti kabul eder

**(b) GitHub Organization üyesi yap**
- Repo Organization'a aitse, ilgili team'e ekleyin (Write erişimi)

Editörler GitHub hesaplarıyla `/admin`'e giriş yapabilir.

### 4. Test

1. Yeni token ile commit yapan herhangi bir push tetiklenecek
2. Cloudflare Pages otomatik build → preview
3. Editör `/admin` ile login → form ile yeni KAP ekle
4. "Publish" → 1-2 dk sonra canlıda

## Koleksiyonlar

Yapılandırılmış (her biri için form):

- **KAP Açıklamaları** (`src/content/kap/`) — 230+ kayıt
- **Finansal Raporlar** (`src/content/financial-reports/`) — 13 kayıt
- **Faaliyet Raporları** (`src/content/annual-reports/`) — 11 kayıt
- **Yatırımcı Dokümanları** (`src/content/investor-documents/`) — 64 kayıt
- **Kurumsal Sayfalar** (`src/content/corporate/`) — 2 kayıt
- **Basında Biz** (`src/content/press/`) — 0 (eklenecek)
- **Ürün Kategorileri** (`src/content/product-categories/`) — 4
- **Ürünler** (`src/content/products/`) — 4 örnek

Yeni içerik eklemek: `/admin` → ilgili koleksiyon → "New ..." butonu.

## Görsel ve PDF yükleme

### Görsel (`public/uploads/`)
Sveltia'nın yerleşik medya yöneticisi. Editör doğrudan upload eder, repo'ya commit edilir, build sonrası `/uploads/{filename}` olarak erişilir.

### PDF (R2)
Şimdilik manuel:
1. Cloudflare Dashboard → **R2** → `sanicaisi` bucket → **Upload**
2. Dosya yüklendikten sonra **Object URL**'i kopyala (`https://pub-...r2.dev/...`)
3. Sveltia formunda **PDF URL** alanına yapıştır

İleride (Faz 7): R2 native upload widget eklenecek (Cloudflare Pages Function ile).

## Yerel test (opsiyonel)

Sveltia CMS GitHub OAuth gerektirdiği için tam testi sadece deploy sonrası yapılabilir. Yerelde sadece config.yml geçerliliğini kontrol edebilirsiniz:

```bash
npm run dev
# http://localhost:4321/admin açın
# Login akışı çalışmaz ama config yüklenirse şema doğrudur
```

## Sorun giderme

**`/admin` 404 veriyor**
- `public/admin/index.html` mevcut mu kontrol edin
- Build edildi mi? `npm run build` → `dist/admin/index.html` olmalı

**Login butonu hata veriyor**
- Tarayıcı console'unda hata mesajına bakın
- GitHub OAuth App'in callback URL'i tam olarak siteyle eşleşiyor mu?
- Cloudflare Pages env vars `GITHUB_CLIENT_ID` ve `GITHUB_CLIENT_SECRET` set mi?

**"Invalid state" hatası**
- CSRF koruması — popup'ı yenileyin, yeniden deneyin
- Cookie'lerin set edildiğini doğrulayın (Secure flag → HTTPS gerekir)

**Editör committed edemiyor**
- GitHub repo'da Write izni var mı?
- OAuth App'in `repo` scope'u istediğini doğrulayın (config.yml'de `scope` varsayılan)
