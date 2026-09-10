import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { sendEmail, buildResetPasswordEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Reuses the shared `password_resets` table (keyed only by email/token, no
// role column) — safe to share across roles since each role's reset-password
// route only ever updates its own table (affiliates vs installers) by email.
export async function POST(req: NextRequest) {
  // Always respond success to prevent email enumeration.
  const response = NextResponse.json({
    success: true,
    message: 'หากอีเมลนี้มีในระบบ คุณจะได้รับลิงก์ภายใน 5 นาที',
  });

  try {
    const { email } = await req.json();
    if (!email) return response;

    const affiliate = (await db
      .prepare('SELECT id, name FROM affiliates WHERE email = ?')
      .get(email.toLowerCase().trim())) as { id: number; name: string } | undefined;
    if (!affiliate) return response;

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.prepare('INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)').run(
      email.toLowerCase().trim(), token, expiresAt
    );

    const resetUrl = `${APP_URL}/affiliate/reset-password?token=${token}`;
    const resetHtml = await buildResetPasswordEmail(affiliate.name, resetUrl);
    sendEmail({
      to: email.toLowerCase().trim(),
      subject: '[Solar Thani] รีเซ็ตรหัสผ่าน Affiliate',
      html: resetHtml,
    }).catch((e) => console.error('Affiliate reset email error:', e));
  } catch (err) {
    console.error('Affiliate forgot password error:', err);
  }

  return response;
}
