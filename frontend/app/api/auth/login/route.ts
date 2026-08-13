import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { signToken, COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per 15 minutes per IP
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const limit = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
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

    const installer = (await db
      .prepare('SELECT * FROM installers WHERE email = ?')
      .get(email.toLowerCase().trim())) as Record<string, unknown> | undefined;

    if (!installer || !await bcrypt.compare(password, installer.password_hash as string))
      return NextResponse.json({ success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });

    if (installer.status === 'pending')
      return NextResponse.json({ success: false, error: 'บัญชีของคุณรอการอนุมัติจาก Admin' }, { status: 403 });
    if (installer.status === 'suspended')
      return NextResponse.json({ success: false, error: 'บัญชีถูกระงับการใช้งาน กรุณาติดต่อ Admin' }, { status: 403 });

    const payload = {
      id: installer.id as number,
      email: installer.email as string,
      role: installer.role as 'installer' | 'admin',
      name: installer.name as string,
    };
    const token = await signToken(payload);

    const res = NextResponse.json({
      success: true,
      data: { id: payload.id, name: payload.name, email: payload.email, role: payload.role, logo_url: installer.logo_url },
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}
