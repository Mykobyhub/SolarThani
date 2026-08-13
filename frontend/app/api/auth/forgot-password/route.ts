import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { sendEmail, buildResetPasswordEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  // Always respond success to prevent email enumeration
  const response = NextResponse.json({
    success: true,
    message: 'หากอีเมลนี้มีในระบบ คุณจะได้รับลิงก์ภายใน 5 นาที',
  });

  try {
    const { email } = await req.json();
    if (!email) return response;

    const installer = (await db
      .prepare('SELECT id, name FROM installers WHERE email = ?')
      .get(email.toLowerCase().trim())) as { id: number; name: string } | undefined;
    if (!installer) return response;

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.prepare('INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)').run(
      email.toLowerCase().trim(), token, expiresAt
    );

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    const resetHtml = await buildResetPasswordEmail(installer.name, resetUrl);
    sendEmail({
      to: email.toLowerCase().trim(),
      subject: '[Solar Thani] รีเซ็ตรหัสผ่าน',
      html: resetHtml,
    }).catch((e) => console.error('Reset email error:', e));
  } catch (err) {
    console.error('Forgot password error:', err);
  }

  return response;
}
