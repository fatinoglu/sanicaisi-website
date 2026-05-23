/**
 * Cloudflare Workers + Static Assets — Sanica advanced entry
 *
 * `public/_worker.js` build'de `dist/_worker.js`'e kopyalanır.
 * Cloudflare bu dosyayı Worker entry olarak alır:
 *   - /oauth ve /oauth/callback bu Worker'da handle edilir (Sveltia CMS auth)
 *   - Diğer tüm istekler env.ASSETS.fetch() ile static dist/ klasörüne gider
 *
 * Env vars (Cloudflare Dashboard → Worker → Settings → Variables):
 *   GITHUB_CLIENT_ID       (Plaintext)
 *   GITHUB_CLIENT_SECRET   (Encrypted)
 *
 * Eski functions/oauth/* dosyaları artık kullanılmıyor (silindi).
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // OAuth start: kullanıcıyı GitHub authorize'a yönlendir
    if (url.pathname === '/oauth' || url.pathname === '/oauth/') {
      return handleOAuthStart(url, env);
    }

    // OAuth callback: code → access_token → postMessage Sveltia'ya
    if (url.pathname === '/oauth/callback') {
      return handleOAuthCallback(url, request, env);
    }

    // Diğer tüm istekler → static asset fallback
    return env.ASSETS.fetch(request);
  },
};

async function handleOAuthStart(url, env) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response(
      'OAuth not configured. Cloudflare Worker → Settings → Variables → GITHUB_CLIENT_ID ekleyin.',
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  }

  const scope = url.searchParams.get('scope') ?? 'repo,user';
  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/oauth/callback`;

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);

  const headers = new Headers({ Location: authUrl.toString() });
  headers.append(
    'Set-Cookie',
    `oauth_state=${state}; Path=/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );
  return new Response(null, { status: 302, headers });
}

async function handleOAuthCallback(url, request, env) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) return new Response('Missing code', { status: 400 });

  // CSRF state kontrolü
  const cookie = request.headers.get('Cookie') ?? '';
  const cookieState = (cookie.match(/oauth_state=([^;]+)/) ?? [])[1];
  if (!cookieState || cookieState !== state) {
    return new Response('Invalid state (CSRF check failed)', { status: 400 });
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response('OAuth not configured (missing client id or secret)', { status: 500 });
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'sanicaisi-cms',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await tokenRes.json();

    if (data.error || !data.access_token) {
      return htmlResponse(htmlMessage('error', {
        error: data.error ?? 'token_exchange_failed',
        message: data.error_description ?? 'Token alınamadı',
      }));
    }

    return htmlResponse(
      htmlMessage('success', { token: data.access_token, provider: 'github' }),
      'oauth_state=; Path=/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    );
  } catch (err) {
    return htmlResponse(htmlMessage('error', {
      error: 'fetch_failed',
      message: String(err),
    }));
  }
}

function htmlResponse(html, clearCookie) {
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8' });
  if (clearCookie) headers.append('Set-Cookie', clearCookie);
  return new Response(html, { status: 200, headers });
}

function htmlMessage(status, payload) {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><title>OAuth ${status}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:3rem;background:#0A0A0A;color:#F7F4EE;margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center">
  <h2 style="font-weight:400;letter-spacing:0.02em;margin:0 0 0.5rem">${status === 'success' ? 'Giriş başarılı' : 'Giriş hatası'}</h2>
  <p style="font-family:ui-monospace,Menlo,monospace;font-size:0.875rem;color:rgba(247,244,238,0.55);letter-spacing:0.06em">Bu pencere otomatik kapanacak…</p>
  <script>
    (function() {
      function send() {
        if (window.opener) window.opener.postMessage(${JSON.stringify(message)}, '*');
      }
      window.addEventListener('message', function(e) {
        if (e.data === 'authorizing:github') send();
      });
      setTimeout(send, 100);
      setTimeout(function() { window.close(); }, 1500);
    })();
  </script>
</body></html>`;
}
