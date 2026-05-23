/**
 * GitHub OAuth Callback — Cloudflare Pages Function
 *
 * GitHub authorize'dan dönüş. ?code parametresini access_token'a çevirip
 * Sveltia/Decap CMS'nin beklediği postMessage formatında geri yolluyoruz.
 */

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

interface GitHubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

function postMessageHtml(status: 'success' | 'error', payload: object): string {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>OAuth ${status}</title></head>
<body style="font-family:system-ui;text-align:center;padding:3rem;background:#0A0A0A;color:#F7F4EE">
  <h2>${status === 'success' ? 'Giriş başarılı' : 'Giriş hatası'}</h2>
  <p>Bu pencere otomatik kapanacak…</p>
  <script>
    (function() {
      function postMessage() {
        // Sveltia/Decap CMS dinleyicisi
        window.opener && window.opener.postMessage(${JSON.stringify(message)}, '*');
      }
      // İlk seferde gönder
      window.addEventListener('message', function(e) {
        if (e.data === 'authorizing:github') postMessage();
      });
      // Backup: 100ms sonra
      setTimeout(postMessage, 100);
      setTimeout(function() { window.close(); }, 1500);
    })();
  </script>
</body></html>`;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  // CSRF doğrulama
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const cookieState = cookieHeader.match(/oauth_state=([^;]+)/)?.[1];
  if (!cookieState || cookieState !== state) {
    return new Response('Invalid state (CSRF check failed)', { status: 400 });
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response('OAuth not configured', { status: 500 });
  }

  // Code → access_token
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await tokenRes.json() as GitHubTokenResponse;

    if (data.error || !data.access_token) {
      const html = postMessageHtml('error', {
        error: data.error ?? 'token_exchange_failed',
        message: data.error_description ?? 'Token alınamadı',
      });
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Başarılı — token'ı popup üzerinden Sveltia'ya gönder
    const html = postMessageHtml('success', {
      token: data.access_token,
      provider: 'github',
    });

    // State cookie'sini temizle
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': 'oauth_state=; Path=/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      },
    });
  } catch (err) {
    const html = postMessageHtml('error', {
      error: 'fetch_failed',
      message: String(err),
    });
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
};
