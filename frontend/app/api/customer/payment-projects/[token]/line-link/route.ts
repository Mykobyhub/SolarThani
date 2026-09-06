import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProjectByToken } from '@/lib/payment/service';

export const dynamic = 'force-dynamic';

// DELETE: unlinks LINE from this project's customer side.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await getProjectByToken(token);
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้' }, { status: 404 });

  await db
    .prepare("UPDATE payment_projects SET customer_line_user_id = NULL, customer_notify_channel = 'email', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(project.id);

  return NextResponse.json({ success: true, message: 'ยกเลิกการเชื่อมต่อ LINE แล้ว' });
}
