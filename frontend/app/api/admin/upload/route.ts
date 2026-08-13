import { NextRequest, NextResponse } from 'next/server';
import { saveFile } from '@/lib/upload';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, error: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const subdir = (form.get('subdir') as string) || 'site';

  if (!file || !file.size)
    return NextResponse.json({ success: false, error: 'ไม่พบไฟล์' }, { status: 400 });

  if (!file.type.startsWith('image/'))
    return NextResponse.json({ success: false, error: 'รองรับเฉพาะไฟล์รูปภาพ' }, { status: 400 });

  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ success: false, error: 'ไฟล์ใหญ่เกิน 5MB' }, { status: 400 });

  const basename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const url = await saveFile(file, subdir, basename);

  return NextResponse.json({ success: true, url });
}
