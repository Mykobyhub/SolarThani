import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { createLinkCode } from '@/lib/line/linking';
import { getLineConfig, buildAddFriendUrl } from '@/lib/line/send';

export const dynamic = 'force-dynamic';

// POST: issues a fresh 6-digit LINE link code for the logged-in installer — one LINE link
// covers all of their projects (design spec §B: "one OA keeps the linking flow to a single
// add-friend-once action").
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const lineCfg = await getLineConfig();
  if (!lineCfg.enabled || !lineCfg.oaBasicId)
    return NextResponse.json({ success: false, message: 'ระบบแจ้งเตือนทาง LINE ยังไม่เปิดใช้งาน' }, { status: 400 });

  const { code, expiresAt } = await createLinkCode({ party: 'installer', installerId: session.id });

  return NextResponse.json({ success: true, code, expiresAt, oaBasicId: lineCfg.oaBasicId, addFriendUrl: buildAddFriendUrl(lineCfg.oaBasicId) });
}
