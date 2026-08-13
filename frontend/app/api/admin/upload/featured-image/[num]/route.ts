import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import path from 'path';
import { UPLOADS_ROOT } from '@/lib/upload';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ num: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { num } = await params;
  if (!['1', '2', '3'].includes(num))
    return NextResponse.json({ success: false, message: 'Card number must be 1, 2, or 3' }, { status: 400 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('image') as File | null;
  if (!file || file.size === 0) return NextResponse.json({ success: false, message: 'กรุณาเลือกรูปภาพ' }, { status: 400 });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    return NextResponse.json({ success: false, message: 'รองรับ jpg, png, webp' }, { status: 400 });
  if (file.size > 3 * 1024 * 1024)
    return NextResponse.json({ success: false, message: 'ไฟล์ขนาดใหญ่เกิน 3MB' }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase() || '.jpg';
  const featuredDir = path.join(UPLOADS_ROOT, 'featured');
  if (!fs.existsSync(featuredDir)) fs.mkdirSync(featuredDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(featuredDir, `featured-${num}${ext}`), buffer);
  const imageUrl = `/uploads/featured/featured-${num}${ext}`;
  const key = `featured${num}_image`;

  await db.prepare(
    "INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at"
  ).run(key, imageUrl);

  return NextResponse.json({ success: true, url: imageUrl });
}
