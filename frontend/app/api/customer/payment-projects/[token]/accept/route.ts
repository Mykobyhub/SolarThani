import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProjectByToken } from '@/lib/payment/service';

export const dynamic = 'force-dynamic';

// POST: customer accepts the proposed milestone plan. Only valid from 'proposed' — after this
// the first milestone (already 'pending_payment' since creation) becomes payable.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await getProjectByToken(token);
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้' }, { status: 404 });

  if (project.status !== 'proposed')
    return NextResponse.json({ success: false, message: 'โครงการนี้ถูกยืนยันไปแล้ว หรือไม่อยู่ในสถานะที่ยืนยันได้' }, { status: 400 });

  await db.prepare("UPDATE payment_projects SET status = 'awaiting_first_payment', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(project.id);

  return NextResponse.json({ success: true, message: 'ยืนยันแผนงวดสำเร็จ กรุณาชำระเงินงวดแรกเพื่อเริ่มดำเนินการ' });
}
