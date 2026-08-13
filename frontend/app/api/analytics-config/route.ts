import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ga4 = (await db.prepare(`SELECT value FROM site_content WHERE key='ga4_id'`).get()) as { value: string } | undefined;
  const cl  = (await db.prepare(`SELECT value FROM site_content WHERE key='clarity_id'`).get()) as { value: string } | undefined;
  return NextResponse.json({
    success:    true,
    ga4_id:     ga4?.value || '',
    clarity_id: cl?.value  || '',
  });
}
