import { NextRequest, NextResponse } from 'next/server';
import { getProjectByToken, cancelProject } from '@/lib/payment/service';
import { notifyProjectCancelled } from '@/lib/payment/notify';

export const dynamic = 'force-dynamic';

// POST: customer requests cancellation. See lib/payment/service.ts cancelProject() for the
// per-milestone rule (void / auto-refund / route-to-dispute depending on milestone state).
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await getProjectByToken(token);
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้' }, { status: 404 });

  if (['completed', 'cancelled'].includes(project.status))
    return NextResponse.json({ success: false, message: 'โครงการนี้สิ้นสุดแล้ว ไม่สามารถยกเลิกได้' }, { status: 400 });

  const result = await cancelProject(project.id, 'customer');
  notifyProjectCancelled(project, 'customer').catch(() => {}); // fire-and-forget, see resolve/route.ts

  return NextResponse.json({
    success: true,
    message:
      result.disputedMilestoneIds.length > 0
        ? 'ส่งคำขอยกเลิกแล้ว งวดที่กำลังดำเนินงานอยู่ถูกส่งให้ Admin พิจารณาตัดสินก่อนจึงจะปิดโครงการได้'
        : 'ยกเลิกโครงการสำเร็จ งวดที่ชำระแล้วถูกคืนเงินโดยอัตโนมัติ',
    ...result,
  });
}
