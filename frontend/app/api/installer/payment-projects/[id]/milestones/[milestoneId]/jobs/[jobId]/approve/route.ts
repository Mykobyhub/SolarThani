import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getOwnedMilestone, getJobAssignment, approveJob } from '@/lib/subcontractor/service';

export const dynamic = 'force-dynamic';

// POST: installer approves a submitted job. Purely an internal checklist item (confirmed spec) —
// does not release any payment and does not touch/gate the milestone-complete endpoint.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string; jobId: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { id, milestoneId, jobId } = await params;
  const milestone = await getOwnedMilestone(session.id, id, milestoneId);
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดนี้' }, { status: 404 });

  const job = await getJobAssignment(Number(jobId));
  if (!job || job.milestone_id !== milestone.id) return NextResponse.json({ success: false, message: 'ไม่พบงานนี้' }, { status: 404 });

  const updated = await approveJob(job.id);
  if (!updated) return NextResponse.json({ success: false, message: 'อนุมัติได้เฉพาะงานที่ส่งตรวจแล้วเท่านั้น' }, { status: 400 });

  return NextResponse.json({ success: true, message: 'อนุมัติงานสำเร็จ', job: updated });
}
