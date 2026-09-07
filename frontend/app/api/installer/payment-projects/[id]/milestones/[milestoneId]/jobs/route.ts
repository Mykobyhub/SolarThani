import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { stripTags } from '@/lib/sanitize';
import { getOwnedMilestone, assignJob, createSubcontractor, isJobCategory } from '@/lib/subcontractor/service';

export const dynamic = 'force-dynamic';

// POST: assigns a job category on a milestone to a sub-contractor. Two paths in one endpoint
// (design spec §3a): pass `subcontractorId` to assign an existing roster member, or pass
// `name`/`phone`/`specialtyTags` to create-and-assign a brand new one in a single step (LINE
// invite deliberately deferred — see roster tab). Fails if this (milestone, category) already has
// a job row — reassignment is a separate endpoint.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; milestoneId: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { id, milestoneId } = await params;
  const milestone = await getOwnedMilestone(session.id, id, milestoneId);
  if (!milestone) return NextResponse.json({ success: false, message: 'ไม่พบงวดนี้' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const category = body.category;
  if (!isJobCategory(category)) return NextResponse.json({ success: false, message: 'ประเภทงานไม่ถูกต้อง' }, { status: 400 });

  const existing = await db.prepare('SELECT id FROM job_assignments WHERE milestone_id = ? AND category = ?').get(milestone.id, category);
  if (existing) return NextResponse.json({ success: false, message: 'งวดนี้มีการมอบหมายงานประเภทนี้อยู่แล้ว — ใช้ปุ่ม "เปลี่ยนช่าง" แทน' }, { status: 400 });

  let subcontractorId: number;
  if (body.subcontractorId) {
    const sub = (await db.prepare('SELECT id FROM subcontractors WHERE id = ? AND installer_id = ?').get(body.subcontractorId, session.id)) as
      | { id: number }
      | undefined;
    if (!sub) return NextResponse.json({ success: false, message: 'ไม่พบช่างรายนี้' }, { status: 404 });
    subcontractorId = sub.id;
  } else {
    const name = stripTags(body.name || '').substring(0, 200);
    if (!name) return NextResponse.json({ success: false, message: 'กรุณาเลือกช่าง หรือระบุชื่อช่างใหม่' }, { status: 400 });
    const phone = body.phone ? stripTags(body.phone).substring(0, 50) : null;
    const tags = Array.isArray(body.specialtyTags) ? body.specialtyTags.map((t: unknown) => stripTags(t).substring(0, 40)) : [];
    const sub = await createSubcontractor({ installerId: session.id, name, phone, tags });
    subcontractorId = sub.id;
  }

  const job = await assignJob({ milestoneId: milestone.id, category, subcontractorId });
  return NextResponse.json({ success: true, message: 'มอบหมายงานสำเร็จ', job });
}
