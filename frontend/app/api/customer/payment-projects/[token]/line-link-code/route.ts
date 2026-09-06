import { NextRequest, NextResponse } from 'next/server';
import { getProjectByToken } from '@/lib/payment/service';
import { createLinkCode } from '@/lib/line/linking';
import { getLineConfig, buildAddFriendUrl } from '@/lib/line/send';

export const dynamic = 'force-dynamic';

// POST: issues a fresh 6-digit LINE link code for this customer/project — the "add friend then
// type this code in chat" flow (design spec §B).
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await getProjectByToken(token);
  if (!project) return NextResponse.json({ success: false, message: 'ไม่พบโครงการนี้' }, { status: 404 });

  const lineCfg = await getLineConfig();
  if (!lineCfg.enabled || !lineCfg.oaBasicId)
    return NextResponse.json({ success: false, message: 'ระบบแจ้งเตือนทาง LINE ยังไม่เปิดใช้งาน' }, { status: 400 });

  const { code, expiresAt } = await createLinkCode({ party: 'customer', projectId: project.id });

  return NextResponse.json({ success: true, code, expiresAt, oaBasicId: lineCfg.oaBasicId, addFriendUrl: buildAddFriendUrl(lineCfg.oaBasicId) });
}
