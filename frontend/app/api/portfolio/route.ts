import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const installer_id = req.nextUrl.searchParams.get('installer_id');
  if (!installer_id) return NextResponse.json({ success: false, message: 'กรุณาระบุ installer_id' }, { status: 400 });

  const photos = await db.prepare(
    'SELECT id, photo_url, caption, created_at FROM portfolio_photos WHERE installer_id = ? ORDER BY created_at DESC'
  ).all(parseInt(installer_id));

  return NextResponse.json({ success: true, data: photos });
}
