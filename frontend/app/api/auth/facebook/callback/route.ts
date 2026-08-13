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

  if (error || !code || !oauthStates.has(state)) return oauthError('Facebook login ถูกยกเลิก');
  oauthStates.delete(state);

  try {
    const creds = (await getOAuthCreds('facebook'))!;
    const tokenData = await oauthFetch('GET',
      `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        code,
        redirect_uri: `${APP_URL}/api/auth/facebook/callback`,
      })}`
    ) as { access_token?: string };
    if (!tokenData.access_token) return oauthError('Facebook login ล้มเหลว');

    const profile = await oauthFetch('GET',
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(tokenData.access_token)}`
    ) as { id: string; name: string; email?: string };

    const user = await findOrCreateOAuthUser('facebook', profile.id, { email: profile.email ?? null, name: profile.name });
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
    console.error('Facebook OAuth error:', e);
    return oauthError('Facebook login เกิดข้อผิดพลาด');
  }
}
