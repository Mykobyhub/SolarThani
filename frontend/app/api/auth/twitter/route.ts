import { NextResponse } from 'next/server';
import { getOAuthCreds, oauthStates, generateState, pkceVerifier, pkceChallenge } from '@/lib/oauth';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET() {
  const creds = await getOAuthCreds('twitter');
  if (!creds?.active || !creds?.client_id)
    return NextResponse.redirect(new URL(`/login?oauth_error=${encodeURIComponent('X login ยังไม่ได้เปิดใช้งาน')}`, APP_URL));

  const state = generateState();
  const codeVerifier = pkceVerifier();
  oauthStates.set(state, { provider: 'twitter', codeVerifier, ts: Date.now() });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: creds.client_id,
    redirect_uri: `${APP_URL}/api/auth/twitter/callback`,
    scope: 'tweet.read users.read',
    state,
    code_challenge: pkceChallenge(codeVerifier),
    code_challenge_method: 'S256',
  });

  return NextResponse.redirect(`https://twitter.com/i/oauth2/authorize?${params}`);
}
