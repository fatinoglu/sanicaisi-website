/**
 * GitHub OAuth Start — Cloudflare Pages Function
 *
 * Sveltia CMS /admin → "GitHub'a giriş yap" tıklayınca buraya gelir,
 * biz GitHub authorize sayfasına yönlendiririz.
 *
 * Env vars (Cloudflare Pages Dashboard → Settings → Environment):
 *   GITHUB_CLIENT_ID       (Public)
 *   GITHUB_CLIENT_SECRET   (Secret, /oauth/callback'te kullanılır)
 *
 * GitHub OAuth App:
 *   Authorization callback URL: https://{your-domain}/oauth/callback
 */

interface Env {
  GITHUB_CLIENT_ID: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.GITHUB_CLIENT_ID) {
    return new Response('OAuth not configured (missing GITHUB_CLIENT_ID)', { status: 500 });
  }

  // Sveltia/Decap formatında scope (repo erişimi için "repo" gerekir)
  const scope = url.searchParams.get('scope') ?? 'repo';

  // CSRF koruması için random state üret
  const state = crypto.randomUUID();

  // Callback URL: aynı host, /oauth/callback
  const redirectUri = `${url.origin}/oauth/callback`;

  // GitHub authorize URL
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);

  // State'i httpOnly cookie'ye yaz (CSRF için)
  const headers = new Headers({ Location: authUrl.toString() });
  headers.append(
    'Set-Cookie',
    `oauth_state=${state}; Path=/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );

  return new Response(null, { status: 302, headers });
};
