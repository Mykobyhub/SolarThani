import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { stripTags } from '@/lib/sanitize';
import { getOwnedMilestone, getJobAssignment, reassignJob, createSubcontractor } from '@/lib/subcontractor/service';

export const dynamic = 'force-dynamic';

// POST: reassigns an already-assigned job row to a different sub-contractor (design spec §3b) —
// existing roster member (`subcontractorId`) or a brand-new one created on the fly (`name`/`phone`/
// `specialtyTags`). Only valid while the row is 'assigned'/'in_progress' — enforced by
// reassignJob()'s WHERE clause, not just hidden in the UI; 'submitted'/'approved' rows must reject
// or stay put first.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string; jobId: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { id, milestoneId, jobId } = await params;
  const milestone = await getOwnedMilestone(session.id, id, milestoneId);
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดนี้' }, { status: 404 });

  const job = await getJobAssignment(Number(jobId));
  if (!job || job.milestone_id !== milestone.id) return NextResponse.json({ success: false, message: 'ไม่พบงานนี้' }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  let newSubcontractorId: number;
  if (body.subcontractorId) {
    const sub = (await db.prepare('SELECT id FROM subcontractors WHERE id = ? AND installer_id = ?').get(body.subcontractorId, session.id)) as
      | { id: number }
      | undefined;
    if (!sub) return NextResponse.json({ success: false, message: 'ไม่พบช่างรายนี้' }, { status: 404 });
    newSubcontractorId = sub.id;
  } else {
    const name = stripTags(body.name || '').substring(0, 200);
    if (!name) return NextResponse.json({ success: false, message: 'กรุณาเลือกช่าง หรือระบุชื่อช่างใหม่' }, { status: 400 });
    const phone = body.phone ? stripTags(body.phone).substring(0, 50) : null;
    const tags = Array.isArray(body.specialtyTags) ? body.specialtyTags.map((t: unknown) => stripTags(t).substring(0, 40)) : [];
    const sub = await createSubcontractor({ installerId: session.id, name, phone, tags });
    newSubcontractorId = sub.id;
  }

  if (newSubcontractorId === job.subcontractor_id)
    return NextResponse.json({ success: false, message: 'ช่างคนนี้ถูกมอบหมายงานนี้อยู่แล้ว' }, { status: 400 });

  const updated = await reassignJob({ jobAssignmentId: job.id, newSubcontractorId });
  if (!updated) return NextResponse.json({ success: false, message: 'เปลี่ยนช่างได้เฉพาะงานที่ยังไม่ส่งตรวจหรืออนุมัติแล้วเท่านั้น' }, { status: 400 });

  return NextResponse.json({ success: true, message: 'เปลี่ยนช่างสำเร็จ', job: updated });
}
