import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getSessionFromRequest, generateTempPassword } from '@/lib/auth';
import { sendEmail, buildClaimAccountEmail } from '@/lib/email';
import { isValidEmail } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, error: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').toLowerCase().trim();

  if (!isValidEmail(email))
    return NextResponse.json({ success: false, error: 'อีเมลไม่ถูกต้อง' }, { status: 400 });

  const installer = (await db.prepare('SELECT id, name FROM installers WHERE id = ?').get(id)) as { id: number; name: string } | undefined;
  if (!installer) return NextResponse.json({ success: false, error: 'ไม่พบผู้ติดตั้ง' }, { status: 404 });

  const dupe = await db.prepare('SELECT id FROM installers WHERE email = ? AND id != ?').get(email, id);
  if (dupe) return NextResponse.json({ success: false, error: 'อีเมลนี้ถูกใช้งานโดยบัญชีอื่นแล้ว' }, { status: 400 });

  const tempPassword = generateTempPassword();
  const password_hash = await bcrypt.hash(tempPassword, 12);

  await db.prepare(`
    UPDATE installers
    SET email = ?, password_hash = ?, must_change_password = 1, claimed_at = ?
    WHERE id = ?
  `).run(email, password_hash, new Date().toISOString(), id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const claimHtml = await buildClaimAccountEmail(installer.name, email, tempPassword, `${appUrl}/login`);
  sendEmail({
    to: email,
    subject: '[Solar Thani] บัญชีผู้ติดตั้งของคุณพร้อมใช้งาน',
    html: claimHtml,
  }).catch(() => {});

  return NextResponse.json({ success: true, message: `ส่งข้อมูลเข้าสู่ระบบไปที่ ${email} แล้ว` });
}
