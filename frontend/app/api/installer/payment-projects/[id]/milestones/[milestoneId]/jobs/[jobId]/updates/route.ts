import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getOwnedMilestone, getJobAssignment, getJobUpdates } from '@/lib/subcontractor/service';

export const dynamic = 'force-dynamic';

// GET: chronological log (job_assignment_updates) for one job row — LINE text/photo events plus
// system notes (rejections, reassignments). Fetched on demand since `.job-log` is collapsed by
// default (design spec §3).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string; jobId: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { id, milestoneId, jobId } = await params;
  const milestone = await getOwnedMilestone(session.id, id, milestoneId);
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดนี้' }, { status: 404 });

  const job = await getJobAssignment(Number(jobId));
  if (!job || job.milestone_id !== milestone.id) return NextResponse.json({ success: false, message: 'ไม่พบงานนี้' }, { status: 404 });

  const updates = await getJobUpdates(job.id);
  return NextResponse.json({ success: true, updates });
}
