import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const providers = (await db
    .prepare('SELECT provider, active FROM oauth_providers WHERE active = 1')
    .all()) as { provider: string; active: number }[];

  return NextResponse.json({
    success: true,
    providers: providers.map((p) => p.provider),
  });
}
