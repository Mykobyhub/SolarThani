import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import path from 'path';
import { saveFile, UPLOADS_ROOT } from '@/lib/upload';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('logo') as File | null;
  if (!file || file.size === 0) return NextResponse.json({ success: false, message: 'กรุณาเลือกรูปภาพ' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ success: false, message: 'รองรับ jpg, png, webp, svg' }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ success: false, message: 'ไฟล์ขนาดใหญ่เกิน 2MB' }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase() || '.png';
  const siteDir = path.join(UPLOADS_ROOT, 'site');
  if (!fs.existsSync(siteDir)) fs.mkdirSync(siteDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(siteDir, `logo${ext}`), buffer);
  const logoUrl = `/uploads/site/logo${ext}`;

  await db.prepare(
    "INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at"
  ).run('logo_url', logoUrl);

  return NextResponse.json({ success: true, logo_url: logoUrl });
}
