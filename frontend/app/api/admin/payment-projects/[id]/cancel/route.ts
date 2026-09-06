import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { cancelProject, type PaymentProjectRow } from '@/lib/payment/service';
import { notifyProjectCancelled } from '@/lib/payment/notify';

export const dynamic = 'force-dynamic';

// POST: admin cancels a project on either party's behalf (e.g. a phone/support request).
// Shares the same cancelProject() mechanism as the customer-facing cancel endpoint.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  const project = (await db.prepare('SELECT * FROM payment_projects WHERE id = ?').get(id)) as PaymentProjectRow | undefined;
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้' }, { status: 404 });

  if (['completed', 'cancelled'].includes(project.status))
    return NextResponse.json({ success: false, message: 'โครงการนี้สิ้นสุดแล้ว ไม่สามารถยกเลิกได้' }, { status: 400 });

  const result = await cancelProject(project.id, 'admin');
  notifyProjectCancelled(project, 'admin').catch(() => {}); // fire-and-forget, see resolve/route.ts

  return NextResponse.json({
    success: true,
    message:
      result.disputedMilestoneIds.length > 0
        ? 'ส่งคำขอยกเลิกแล้ว งวดที่กำลังดำเนินงานอยู่ถูกส่งเข้าคิวข้อโต้แย้งให้ตัดสินก่อนจึงจะปิดโครงการได้'
        : 'ยกเลิกโครงการสำเร็จ',
    ...result,
  });
}
