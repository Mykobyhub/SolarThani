import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import path from 'path';
import { UPLOADS_ROOT } from '@/lib/upload';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('image') as File | null;
  if (!file || file.size === 0) return NextResponse.json({ success: false, message: 'กรุณาเลือกรูปภาพ' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ success: false, message: 'รองรับ jpg, png, webp' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ success: false, message: 'ไฟล์ขนาดใหญ่เกิน 5MB' }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase() || '.jpg';
  const siteDir = path.join(UPLOADS_ROOT, 'site');
  if (!fs.existsSync(siteDir)) fs.mkdirSync(siteDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(siteDir, `hero-bg${ext}`), buffer);
  const imageUrl = `/uploads/site/hero-bg${ext}`;

  await db.prepare(
    "INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at"
  ).run('hero_bg_image', imageUrl);

  return NextResponse.json({ success: true, url: imageUrl });
}
