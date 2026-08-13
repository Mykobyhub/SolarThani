import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import path from 'path';
import { UPLOADS_ROOT } from '@/lib/upload';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('image') as File | null;
  if (!file || file.size === 0) return NextResponse.json({ success: false, message: 'กรุณาเลือกรูปภาพ' }, { status: 400 });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    return NextResponse.json({ success: false, message: 'รองรับ jpg, png, webp' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ success: false, message: 'ไฟล์ขนาดใหญ่เกิน 5MB' }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase() || '.jpg';
  const blogDir = path.join(UPLOADS_ROOT, 'blog');
  if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `blog-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(blogDir, filename), buffer);

  return NextResponse.json({ success: true, url: `/uploads/blog/${filename}` });
}
