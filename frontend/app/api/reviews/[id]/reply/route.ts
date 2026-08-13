import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripTags } from '@/lib/sanitize';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { reply } = body;
  const cleanReply = stripTags(reply || '');

  if (cleanReply.length < 5)
    return NextResponse.json({ success: false, message: 'กรุณากรอกข้อความตอบกลับ (อย่างน้อย 5 ตัวอักษร)' }, { status: 400 });
  if (cleanReply.length > 500)
    return NextResponse.json({ success: false, message: 'ข้อความตอบกลับต้องไม่เกิน 500 ตัวอักษร' }, { status: 400 });

  const review = await db.prepare(
    `SELECT id FROM reviews WHERE id = ? AND installer_id = ? AND status = 'active'`
  ).get(id, session.id);
  if (!review) return NextResponse.json({ success: false, message: 'ไม่พบรีวิวนี้' }, { status: 404 });

  await db.prepare(`UPDATE reviews SET reply = ?, reply_at = ? WHERE id = ?`)
    .run(cleanReply, new Date().toISOString(), id);

  return NextResponse.json({ success: true, message: 'ตอบกลับสำเร็จ' });
}
