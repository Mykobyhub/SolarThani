import { NextRequest, NextResponse } from 'next/server';
import { getOAuthCreds, oauthStates, findOrCreateOAuthUser, oauthFetch } from '@/lib/oauth';
import { signToken, COOKIE_NAME } from '@/lib/auth';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function oauthError(msg: string) {
  return NextResponse.redirect(new URL(`/login?oauth_error=${encodeURIComponent(msg)}`, APP_URL));
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state') ?? '';
  const error = searchParams.get('error');

  const stored = oauthStates.get(state);
  if (error || !code || !stored) return oauthError('X login ถูกยกเลิก');
  oauthStates.delete(state);

  try {
    const creds = (await getOAuthCreds('twitter'))!;
    const basicAuth = Buffer.from(`${creds.client_id}:${creds.client_secret}`).toString('base64');
    const tokenData = await oauthFetch('POST', 'https://api.twitter.com/2/oauth2/token', {
      body: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${APP_URL}/api/auth/twitter/callback`,
        code_verifier: stored.codeVerifier ?? '',
        client_id: creds.client_id,
      },
      headers: { Authorization: `Basic ${basicAuth}` },
    }) as { access_token?: string };
    if (!tokenData.access_token) return oauthError('X login ล้มเหลว');

    const profileData = await oauthFetch('GET',
      'https://api.twitter.com/2/users/me?user.fields=id,name,username',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    ) as { data?: { id: string; name: string; username: string } };

    const p = profileData.data;
    if (!p?.id) return oauthError('X login ล้มเหลว');

    const user = await findOrCreateOAuthUser('twitter', p.id, { email: null, name: p.name || p.username });
    if (!user) return oauthError('บัญชีถูกระงับ');

    const token = await signToken({
      id: user.id as number,
      email: user.email as string,
      role: user.role as 'installer' | 'admin',
      name: user.name as string,
    });

    const res = NextResponse.redirect(new URL('/dashboard', APP_URL));
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch (e) {
    console.error('Twitter OAuth error:', e);
    return oauthError('X login เกิดข้อผิดพลาด');
  }
}
