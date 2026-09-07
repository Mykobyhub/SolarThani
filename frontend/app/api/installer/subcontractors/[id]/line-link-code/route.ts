import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { createLinkCode } from '@/lib/line/linking';
import { getLineConfig, buildAddFriendUrl } from '@/lib/line/send';
import { getSubcontractor } from '@/lib/subcontractor/service';

export const dynamic = 'force-dynamic';

// POST: issues a fresh LINE link code for one roster sub-contractor. Unlike the
// customer/installer flow (where the person clicks the add-friend link themselves in-app), the
// sub-contractor never opens any SolarPanel UI — the installer relays this out-of-band (their own
// LINE/SMS/call). So this also returns a ready-composed invite message (design spec §2) alongside
// the bare code, for a "📋 คัดลอกข้อความเชิญ" button.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const { id } = await params;
  const sub = await getSubcontractor(Number(id), session.id);
  if (!sub) return NextResponse.json({ success: false, message: 'ไม่พบช่างรายนี้' }, { status: 404 });

  const lineCfg = await getLineConfig();
  if (!lineCfg.enabled || !lineCfg.oaBasicId)
    return NextResponse.json({ success: false, message: 'ระบบแจ้งเตือนทาง LINE ยังไม่เปิดใช้งาน' }, { status: 400 });

  const installer = (await db.prepare('SELECT name FROM installers WHERE id = ?').get(session.id)) as { name: string } | undefined;
  const { code, expiresAt } = await createLinkCode({ party: 'subcontractor', subcontractorId: sub.id });
  const addFriendUrl = buildAddFriendUrl(lineCfg.oaBasicId);

  const inviteMessage =
    `📢 ${installer?.name || 'ผู้ติดตั้ง'} มอบหมายงานให้คุณผ่านระบบ SolarPanel\n` +
    `1) เพิ่มเพื่อน LINE OA: ${addFriendUrl}\n` +
    `2) พิมพ์ข้อความนี้ในแชท: ยืนยัน SP-${code}\n` +
    `(รหัสหมดอายุใน 10 นาที)`;

  return NextResponse.json({ success: true, code, expiresAt, oaBasicId: lineCfg.oaBasicId, addFriendUrl, inviteMessage });
}
