import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripTags, isValidEmail } from '@/lib/sanitize';
import { checkRateLimit } from '@/lib/rate-limit';
import { recalcInstallerRating } from '@/lib/reviews';
import { sendEmail, buildReviewVerifyEmail, buildInstallerReviewNotifyEmail } from '@/lib/email';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const sp           = req.nextUrl.searchParams;
  const installer_id = sp.get('installer_id');
  const page         = parseInt(sp.get('page') || '1');
  const limit        = Math.min(parseInt(sp.get('limit') || '10'), 50);
  const stars        = sp.get('stars');

  if (!installer_id) return NextResponse.json({ success: false, message: 'กรุณาระบุ installer_id' }, { status: 400 });

  const id  = parseInt(installer_id);
  const off = (Math.max(page, 1) - 1) * limit;

  const whereStar  = stars ? ' AND rating = ?' : '';
  const starParams = stars ? [parseInt(stars)] : [];

  const total = ((await db.prepare(
    `SELECT COUNT(*) AS cnt FROM reviews WHERE installer_id = ? AND status = 'active'${whereStar}`
  ).get(id, ...starParams)) as { cnt: number }).cnt;

  const rows = await db.prepare(`
    SELECT id, installer_id, reviewer_name, rating, title, body,
           install_date, reply, reply_at, verified_at, created_at
    FROM reviews WHERE installer_id = ? AND status = 'active'${whereStar}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(id, ...starParams, limit, off);

  const breakdown = await db.prepare(`
    SELECT rating, COUNT(*) AS cnt
    FROM reviews WHERE installer_id = ? AND status = 'active'
    GROUP BY rating ORDER BY rating DESC
  `).all(id);

  return NextResponse.json({ success: true, total, page, limit, data: rows, breakdown });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const rl = checkRateLimit(`review:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed)
    return NextResponse.json({ success: false, message: `ส่งรีวิวได้สูงสุด 5 ครั้ง/ชั่วโมง (รออีก ${rl.retryAfter}วิ)` }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const { installer_id, reviewer_name, reviewer_email, rating, body: reviewBody, install_date } = body;

  if (!installer_id || !reviewer_name || !reviewer_email || !rating || !reviewBody)
    return NextResponse.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
  if (!isValidEmail(reviewer_email))
    return NextResponse.json({ success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });

  const ratingInt = parseInt(rating);
  if (ratingInt < 1 || ratingInt > 5)
    return NextResponse.json({ success: false, message: 'คะแนนต้องอยู่ระหว่าง 1–5' }, { status: 400 });

  const cleanBody = stripTags(reviewBody);
  if (cleanBody.length < 20 || cleanBody.length > 1000)
    return NextResponse.json({ success: false, message: 'รายละเอียดต้องมี 20–1,000 ตัวอักษร' }, { status: 400 });

  const installer = (await db.prepare(`SELECT id, name, email FROM installers WHERE id = ? AND status = 'active'`)
    .get(parseInt(installer_id))) as { id: number; name: string; email: string } | undefined;
  if (!installer)
    return NextResponse.json({ success: false, message: 'ไม่พบผู้ติดตั้ง' }, { status: 404 });

  const smtpUser = ((await db.prepare(`SELECT value FROM site_content WHERE key='smtp_user'`).get()) as { value: string } | undefined)?.value;
  const autoVerify = !smtpUser;
  const verifyToken = autoVerify ? null : crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();

  const result = (await db.prepare(`
    INSERT INTO reviews
      (installer_id, reviewer_name, reviewer_email, rating, title, body, install_date, verify_token, status, verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
  `).get(
    parseInt(installer_id),
    stripTags(reviewer_name),
    reviewer_email.toLowerCase().trim(),
    ratingInt,
    cleanBody.substring(0, 50),
    cleanBody,
    install_date ? stripTags(install_date) : null,
    verifyToken,
    autoVerify ? 'active' : 'pending',
    autoVerify ? now : null
  )) as { id: number };

  if (autoVerify) {
    await recalcInstallerRating(parseInt(installer_id));
    const notifyHtml = await buildInstallerReviewNotifyEmail(installer.name, installer.id, { reviewer_name: stripTags(reviewer_name), rating: ratingInt, body: cleanBody });
    sendEmail({
      to: installer.email,
      subject: `[Solar Thani] มีรีวิวใหม่ (${ratingInt}/5)`,
      html: notifyHtml,
    }).catch(() => {});
    return NextResponse.json({ success: true, verified: true, message: 'รีวิวของคุณถูกเผยแพร่แล้ว ขอบคุณสำหรับความคิดเห็น!' }, { status: 201 });
  }

  const verifyUrl = `${APP_URL}/api/reviews/${result.id}/verify?token=${verifyToken}`;
  const verifyHtml = await buildReviewVerifyEmail(stripTags(reviewer_name), installer.name, verifyUrl);
  sendEmail({
    to: reviewer_email.toLowerCase().trim(),
    subject: '[Solar Thani] ยืนยันรีวิวของคุณ',
    html: verifyHtml,
  }).catch(() => {});

  return NextResponse.json({ success: true, verified: false, message: 'ส่งรีวิวสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันก่อนเผยแพร่' }, { status: 201 });
}
