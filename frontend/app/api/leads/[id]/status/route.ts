import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status, system_kw } = body;

  if (!['new', 'contacted', 'closed'].includes(status))
    return NextResponse.json({ success: false, message: 'สถานะไม่ถูกต้อง' }, { status: 400 });

  const lead = (await db.prepare('SELECT * FROM leads WHERE id = ? AND installer_id = ?').get(id, session.id)) as {
    id: number; province: string; status: string;
  } | undefined;
  if (!lead) return NextResponse.json({ success: false, message: 'ไม่พบ lead นี้' }, { status: 404 });

  const kw = system_kw ? parseFloat(system_kw) : null;
  await db.prepare('UPDATE leads SET status = ?, system_kw = COALESCE(?, system_kw) WHERE id = ?')
    .run(status, kw || null, id);

  if (status === 'closed' && lead.status !== 'closed') {
    const installer = (await db.prepare('SELECT projects, total_projects FROM installers WHERE id = ?')
      .get(session.id)) as { projects: string; total_projects: number };
    const projects = JSON.parse(installer.projects || '[]') as { name: string; savings: string }[];
    const savings  = kw
      ? `ประหยัด ~${(Math.round(kw * 5800 / 500) * 500).toLocaleString()} บาท/ปี`
      : 'ไม่ระบุขนาดระบบ';
    projects.push({ name: `โครงการติดตั้งที่${lead.province}`, savings });
    await db.prepare('UPDATE installers SET projects=?, total_projects=total_projects+1, total_kw=total_kw+? WHERE id=?')
      .run(JSON.stringify(projects), kw || 0, session.id);
  }

  return NextResponse.json({ success: true, message: 'อัปเดตสถานะสำเร็จ' });
}
