import { NextResponse } from 'next/server';
import { getOAuthCreds, oauthStates, generateState } from '@/lib/oauth';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET() {
  const creds = await getOAuthCreds('google');
  if (!creds?.active || !creds?.client_id)
    return NextResponse.redirect(new URL(`/login?oauth_error=${encodeURIComponent('Google login ยังไม่ได้เปิดใช้งาน')}`, APP_URL));

  const state = generateState();
  oauthStates.set(state, { provider: 'google', ts: Date.now() });

  const params = new URLSearchParams({
    client_id: creds.client_id,
    redirect_uri: `${APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
