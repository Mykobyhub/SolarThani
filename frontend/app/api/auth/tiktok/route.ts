import { NextResponse } from 'next/server';
import { getOAuthCreds, oauthStates, generateState } from '@/lib/oauth';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET() {
  const creds = await getOAuthCreds('tiktok');
  if (!creds?.active || !creds?.client_id)
    return NextResponse.redirect(new URL(`/login?oauth_error=${encodeURIComponent('TikTok login ยังไม่ได้เปิดใช้งาน')}`, APP_URL));

  const state = generateState();
  oauthStates.set(state, { provider: 'tiktok', ts: Date.now() });

  const params = new URLSearchParams({
    client_key: creds.client_id,
    response_type: 'code',
    scope: 'user.info.basic',
    redirect_uri: `${APP_URL}/api/auth/tiktok/callback`,
    state,
  });

  return NextResponse.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params}`);
}
