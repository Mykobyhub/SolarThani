import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { stripTags } from '@/lib/sanitize';
import { getRoster, createSubcontractor } from '@/lib/subcontractor/service';

export const dynamic = 'force-dynamic';

// GET: the logged-in installer's sub-contractor roster ("ทีมช่าง" tab) — name/phone/specialty
// tags/LINE-link status/active job count. Never exposed to any customer-facing endpoint.
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const roster = await getRoster(session.id);
  return NextResponse.json({ success: true, subcontractors: roster });
}

// POST: proactively add a sub-contractor to the roster (design spec §2 — the full form; LINE
// invite is a separate follow-up step via /line-link-code, not part of this call).
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = stripTags(body.name || '').substring(0, 200);
  const phone = body.phone ? stripTags(body.phone).substring(0, 50) : null;
  const tags = Array.isArray(body.specialtyTags) ? body.specialtyTags.map((t: unknown) => stripTags(t).substring(0, 40)) : [];

  if (!name) return NextResponse.json({ success: false, message: 'กรุณาระบุชื่อช่าง' }, { status: 400 });

  const row = await createSubcontractor({ installerId: session.id, name, phone, tags });
  return NextResponse.json({ success: true, message: 'เพิ่มช่างในทีมสำเร็จ', subcontractor: row });
}
