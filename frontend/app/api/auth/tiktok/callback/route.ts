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

  if (error || !code || !oauthStates.has(state)) return oauthError('TikTok login ถูกยกเลิก');
  oauthStates.delete(state);

  try {
    const creds = (await getOAuthCreds('tiktok'))!;
    const tokenData = await oauthFetch('POST', 'https://open.tiktokapis.com/v2/oauth/token/', {
      body: {
        client_key: creds.client_id,
        client_secret: creds.client_secret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${APP_URL}/api/auth/tiktok/callback`,
      },
    }) as { access_token?: string };
    if (!tokenData.access_token) return oauthError('TikTok login ล้มเหลว');

    const profileData = await oauthFetch('GET',
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    ) as { data?: { user?: { open_id: string; display_name: string } } };

    const p = profileData.data?.user;
    if (!p?.open_id) return oauthError('TikTok login ล้มเหลว');

    const user = await findOrCreateOAuthUser('tiktok', p.open_id, { email: null, name: p.display_name });
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
    console.error('TikTok OAuth error:', e);
    return oauthError('TikTok login เกิดข้อผิดพลาด');
  }
}
