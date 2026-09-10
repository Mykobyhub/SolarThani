import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { signToken, AFFILIATE_COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import type { Affiliate } from '@/types';

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per 15 minutes per IP — mirrors installer login.
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const limit = checkRateLimit(`affiliate-login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ใน 15 นาที' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json({ success: false, error: 'กรุณากรอก email และ password' }, { status: 400 });

    const affiliate = (await db
      .prepare('SELECT * FROM affiliates WHERE email = ?')
      .get(email.toLowerCase().trim())) as Affiliate | undefined;

    if (!affiliate || !(await bcrypt.compare(password, affiliate.password_hash)))
      return NextResponse.json({ success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });

    if (affiliate.status === 'pending_verification')
      return NextResponse.json({ success: false, error: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ (ตรวจสอบกล่องขาเข้าของคุณ)' }, { status: 403 });
    if (affiliate.status === 'suspended')
      return NextResponse.json({ success: false, error: 'บัญชีถูกระงับการใช้งาน กรุณาติดต่อ Admin' }, { status: 403 });

    const payload = {
      id: affiliate.id,
      email: affiliate.email,
      role: 'affiliate' as const,
      name: affiliate.name,
    };
    const token = await signToken(payload);

    const res = NextResponse.json({
      success: true,
      data: { id: payload.id, name: payload.name, email: payload.email, referral_code: affiliate.referral_code },
    });

    res.cookies.set(AFFILIATE_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return res;
  } catch (err) {
    console.error('Affiliate login error:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}
