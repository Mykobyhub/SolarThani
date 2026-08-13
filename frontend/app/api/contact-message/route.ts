import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripTags, isValidEmail } from '@/lib/sanitize';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail, buildContactSupportEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const rl = checkRateLimit(`contact-msg:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed)
    return NextResponse.json({ success: false, message: 'ส่งได้สูงสุด 10 ครั้ง/ชั่วโมง' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const { name, email, phone, subject, message } = body;

  if (!name || !email || !message)
    return NextResponse.json({ success: false, message: 'กรุณากรอกชื่อ อีเมล และข้อความ' }, { status: 400 });
  if (!isValidEmail(email))
    return NextResponse.json({ success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });

  const msg = {
    name:    stripTags(name),
    email:   email.toLowerCase().trim(),
    phone:   phone   ? String(phone).trim() : null,
    subject: subject ? stripTags(subject)   : null,
    message: stripTags(message),
  };

  await db.prepare('INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)')
    .run(msg.name, msg.email, msg.phone, msg.subject, msg.message);

  const supportEmail = ((await db.prepare(`SELECT value FROM site_content WHERE key='support_email'`).get()) as { value: string } | undefined)?.value
    || process.env.ADMIN_EMAIL || '';
  if (supportEmail) {
    const html = await buildContactSupportEmail(msg);
    sendEmail({ to: supportEmail, subject: `[ติดต่อเรา] ${msg.subject || 'ข้อความจาก ' + msg.name}`, html }).catch(() => {});
  }

  return NextResponse.json({ success: true, message: 'ส่งข้อความสำเร็จแล้ว ทีมงานจะติดต่อกลับโดยเร็ว' });
}
