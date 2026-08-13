import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { stripTags, isValidEmail } from '@/lib/sanitize';
import { sendEmail, buildWelcomeEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, location } = await req.json();

    if (!name || !email || !password)
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อ อีเมล และรหัสผ่าน' }, { status: 400 });
    if (!isValidEmail(email))
      return NextResponse.json({ success: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });
    if (password.length < 8)
      return NextResponse.json({ success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 });

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = stripTags(name);

    const existing = await db.prepare('SELECT id FROM installers WHERE email = ?').get(cleanEmail);
    if (existing)
      return NextResponse.json({ success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 400 });

    const modeRow = (await db.prepare("SELECT value FROM site_content WHERE key = 'registration_mode'").get()) as
      | { value: string }
      | undefined;
    const isAuto = (modeRow?.value ?? 'manual') === 'auto';

    const password_hash = await bcrypt.hash(password, 12);
    await db.prepare(
      'INSERT INTO installers (email, password_hash, name, phone, location, status, verified_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      cleanEmail,
      password_hash,
      cleanName,
      phone || null,
      location ? stripTags(location) : null,
      isAuto ? 'active' : 'pending',
      isAuto ? new Date().toISOString() : null
    );

    // Send welcome email (SMTP send itself is non-blocking)
    const welcomeHtml = await buildWelcomeEmail(cleanName);
    sendEmail({ to: cleanEmail, subject: 'ยินดีต้อนรับสู่ Solar Thani Thailand', html: welcomeHtml })
      .catch(() => {});

    const message = isAuto
      ? 'สมัครสำเร็จ! บัญชีพร้อมใช้งานแล้ว กรุณาเข้าสู่ระบบ'
      : 'สมัครสำเร็จ! กรุณารอการอนุมัติจาก Admin (1–2 วันทำการ)';

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}
