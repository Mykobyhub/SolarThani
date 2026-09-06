import { NextRequest, NextResponse } from 'next/server';
import { getLineConfig, verifyLineSignature, replyLineMessage } from '@/lib/line/send';
import { consumeLinkCode, extractCodeFromText } from '@/lib/line/linking';

export const dynamic = 'force-dynamic';

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  message?: { type: string; text?: string };
}

// LINE Messaging API webhook — receives every event sent to the shared SolarPanel OA.
// Only handled event: a text message that contains a pending 6-digit link code (the
// "add friend then type this code" flow from /project/[token]/line and the installer
// dashboard's LINE-connect card). Everything else is acknowledged (200) and ignored.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-line-signature');

  const cfg = await getLineConfig();
  if (!cfg.channelSecret) {
    // No real LINE credential configured yet — nothing to verify against, nothing to do.
    return NextResponse.json({ success: true, note: 'LINE not configured' });
  }

  if (!verifyLineSignature(rawBody, signature, cfg.channelSecret)) {
    return NextResponse.json({ success: false, message: 'invalid signature' }, { status: 401 });
  }

  let body: { events?: LineEvent[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, message: 'invalid body' }, { status: 400 });
  }

  const events = Array.isArray(body.events) ? body.events : [];

  await Promise.allSettled(
    events.map(async (event) => {
      if (event.type !== 'message' || event.message?.type !== 'text' || !event.source?.userId) return;
      const text = event.message.text || '';
      const code = extractCodeFromText(text);
      if (!code) return;

      const matched = await consumeLinkCode(code, event.source.userId);
      if (event.replyToken) {
        await replyLineMessage(
          event.replyToken,
          matched ? '✅ เชื่อมต่อ LINE สำเร็จแล้ว! คุณจะได้รับแจ้งเตือนความคืบหน้าโครงการทาง LINE จากนี้ไป' : '❌ รหัสยืนยันไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอรหัสใหม่จากหน้าเว็บไซต์'
        );
      }
    })
  );

  return NextResponse.json({ success: true });
}
