import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { stripTags } from '@/lib/sanitize';
import { updateSubcontractor } from '@/lib/subcontractor/service';

export const dynamic = 'force-dynamic';

// PUT: edit an existing roster sub-contractor's name/phone/specialty tags.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = stripTags(body.name || '').substring(0, 200);
  const phone = body.phone ? stripTags(body.phone).substring(0, 50) : null;
  const tags = Array.isArray(body.specialtyTags) ? body.specialtyTags.map((t: unknown) => stripTags(t).substring(0, 40)) : [];

  if (!name) return NextResponse.json({ success: false, message: 'กรุณาระบุชื่อช่าง' }, { status: 400 });

  const row = await updateSubcontractor({ id: Number(id), installerId: session.id, name, phone, tags });
  if (!row) return NextResponse.json({ success: false, message: 'ไม่พบช่างรายนี้' }, { status: 404 });

  return NextResponse.json({ success: true, message: 'บันทึกสำเร็จ', subcontractor: row });
}
