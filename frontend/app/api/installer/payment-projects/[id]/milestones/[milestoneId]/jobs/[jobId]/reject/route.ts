import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { stripTags } from '@/lib/sanitize';
import { getOwnedMilestone, getJobAssignment, rejectJob, logJobUpdate } from '@/lib/subcontractor/service';
import { pushLineMessage } from '@/lib/line/send';

export const dynamic = 'force-dynamic';

// POST: installer rejects a submitted job back to 'in_progress' with a reason. Per confirmed
// spec the reason is relayed to the sub-contractor via LINE push (best-effort — silently
// no-ops if they haven't linked LINE yet, same contract as every other LINE push in this app).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string; jobId: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { id, milestoneId, jobId } = await params;
  const milestone = await getOwnedMilestone(session.id, id, milestoneId);
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดนี้' }, { status: 404 });

  const job = await getJobAssignment(Number(jobId));
  if (!job || job.milestone_id !== milestone.id) return NextResponse.json({ success: false, message: 'ไม่พบงานนี้' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const reason = stripTags(body.reason || '').substring(0, 1000);
  if (!reason) return NextResponse.json({ success: false, message: 'กรุณาระบุเหตุผลที่ตีกลับ' }, { status: 400 });

  const updated = await rejectJob(job.id, reason);
  if (!updated) return NextResponse.json({ success: false, message: 'ตีกลับได้เฉพาะงานที่ส่งตรวจแล้วเท่านั้น' }, { status: 400 });

  await logJobUpdate({ jobAssignmentId: job.id, subcontractorId: job.subcontractor_id, kind: 'system', body: `ผู้ติดตั้งตีกลับงาน: ${reason}` });

  const sub = (await db.prepare('SELECT line_user_id FROM subcontractors WHERE id = ?').get(job.subcontractor_id)) as { line_user_id: string | null } | undefined;
  pushLineMessage(sub?.line_user_id, `↩ งานของคุณถูกตีกลับให้แก้ไข\nเหตุผล: ${reason}`).catch(() => {}); // fire-and-forget, same convention as lib/payment/notify.ts

  return NextResponse.json({ success: true, message: 'ตีกลับงานสำเร็จ', job: updated });
}
