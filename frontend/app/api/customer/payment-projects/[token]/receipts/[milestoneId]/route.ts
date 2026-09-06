import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProjectByToken, type PaymentMilestoneRow } from '@/lib/payment/service';

export const dynamic = 'force-dynamic';

// GET: receipt data for one released milestone — reached from the hub's "🧾 ดูใบเสร็จ" links and
// shown right after a successful payment once the milestone is released.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string; milestoneId: string }> }) {
  const { token, milestoneId } = await params;
  const project = await getProjectByToken(token);
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้' }, { status: 404 });

  const milestone = (await db
    .prepare('SELECT * FROM payment_milestones WHERE id = ? AND project_id = ?')
    .get(milestoneId, project.id)) as PaymentMilestoneRow | undefined;
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดนี้' }, { status: 404 });

  const milestoneCount = (await db.prepare('SELECT COUNT(*)::int AS cnt FROM payment_milestones WHERE project_id = ?').get(project.id)) as { cnt: number };

  const holdTx = (await db
    .prepare("SELECT * FROM payment_transactions WHERE milestone_id = ? AND type = 'hold' ORDER BY created_at DESC LIMIT 1")
    .get(milestone.id)) as { created_at: string; provider: string; provider_reference_id: string | null } | undefined;

  if (!holdTx)
    return NextResponse.json({ success: false, message: 'ยังไม่มีการชำระเงินสำหรับงวดนี้' }, { status: 404 });

  return NextResponse.json({
    success: true,
    receipt: {
      receiptNo: `SP-${project.id}-${milestone.id}`,
      paidAt: holdTx.created_at,
      projectTitle: project.title,
      projectAddress: project.address,
      installerName: project.installer_name,
      seq: milestone.seq,
      milestoneCount: milestoneCount.cnt,
      description: milestone.description,
      amount: milestone.amount,
      provider: holdTx.provider,
      reference: holdTx.provider_reference_id,
      status: milestone.status,
    },
  });
}
