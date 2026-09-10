import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { stripTags, isValidEmail } from '@/lib/sanitize';
import { sendEmail, buildAffiliateVerifyEmail } from '@/lib/email';
import { generateUniqueReferralCode } from '@/lib/affiliate/referral-code';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone } = await req.json();

    if (!name || !email || !password)
      return NextResponse.json({ success: false, error: 'กรุณากรอกชื่อ อีเมล และรหัสผ่าน' }, { status: 400 });
    if (!isValidEmail(email))
      return NextResponse.json({ success: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });
    if (password.length < 8)
      return NextResponse.json({ success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 });

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = stripTags(name);

    const existing = await db.prepare('SELECT id FROM affiliates WHERE email = ?').get(cleanEmail);
    if (existing)
      return NextResponse.json({ success: false, error: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 400 });

    const referralCode = await generateUniqueReferralCode();
    const password_hash = await bcrypt.hash(password, 12);

    const affiliate = (await db.prepare(
      `INSERT INTO affiliates (email, password_hash, name, phone, referral_code, status)
       VALUES (?, ?, ?, ?, ?, 'pending_verification') RETURNING id`
    ).get(
      cleanEmail,
      password_hash,
      cleanName,
      phone ? stripTags(phone) : null,
      referralCode
    )) as { id: number } | undefined;

    if (!affiliate)
      return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });

    // Email-verify token — required before the referral code is usable
    // (anti-fraud: no throwaway signups). Mirrors password_resets' shape.
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db.prepare(
      'INSERT INTO affiliate_verifications (affiliate_id, token, expires_at) VALUES (?, ?, ?)'
    ).run(affiliate.id, token, expiresAt);

    const verifyUrl = `${APP_URL}/api/affiliate/auth/verify-email?token=${token}`;
    const verifyHtml = await buildAffiliateVerifyEmail(cleanName, verifyUrl);
    sendEmail({ to: cleanEmail, subject: '[Solar Thani] ยืนยันอีเมลสำหรับโปรแกรม Affiliate', html: verifyHtml })
      .catch((e) => console.error('Affiliate verify email error:', e));

    return NextResponse.json(
      {
        success: true,
        message: 'สมัครสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ',
        data: { referral_code: referralCode },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Affiliate register error:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}
