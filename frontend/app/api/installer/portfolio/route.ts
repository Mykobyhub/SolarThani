import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { stripTags } from '@/lib/sanitize';
import { saveFile } from '@/lib/upload';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const photos = await db.prepare(
    'SELECT id, photo_url, caption, created_at FROM portfolio_photos WHERE installer_id = ? ORDER BY created_at DESC'
  ).all(session.id);

  return NextResponse.json({ success: true, photos });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('photo') as File | null;
  if (!file || file.size === 0) return NextResponse.json({ success: false, message: 'กรุณาเลือกรูปภาพ' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ success: false, message: 'รองรับเฉพาะรูปภาพ' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ success: false, message: 'ไฟล์ขนาดใหญ่เกิน 5MB' }, { status: 400 });

  const count = ((await db.prepare('SELECT COUNT(*) AS cnt FROM portfolio_photos WHERE installer_id = ?').get(session.id)) as { cnt: number }).cnt;
  if (count >= 20) return NextResponse.json({ success: false, message: 'อัปโหลดได้สูงสุด 20 รูป' }, { status: 400 });

  try {
    const photoUrl = await saveFile(file, 'portfolio', `portfolio-${session.id}-${Date.now()}`);
    const caption  = formData?.get('caption') ? stripTags(String(formData.get('caption'))).substring(0, 200) : null;
    const result   = (await db.prepare(
      'INSERT INTO portfolio_photos (installer_id, photo_url, caption) VALUES (?, ?, ?) RETURNING id'
    ).get(session.id, photoUrl, caption)) as { id: number };

    return NextResponse.json({
      success: true,
      photo: { id: result.id, photo_url: photoUrl, caption, created_at: new Date().toISOString() },
    });
  } catch (err) {
    console.error('[portfolio upload]', err);
    return NextResponse.json({ success: false, message: `อัปโหลดไม่สำเร็จ: ${String(err)}` }, { status: 500 });
  }
}
