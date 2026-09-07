import { NextRequest, NextResponse } from 'next/server';
import { getLineConfig, verifyLineSignature, replyLineMessage, fetchLineContent } from '@/lib/line/send';
import { consumeLinkCode, extractCodeFromText } from '@/lib/line/linking';
import {
  getSubcontractorByLineUserId,
  findActiveJobForSubcontractor,
  startJobFromLine,
  submitJobFromLine,
  logJobUpdate,
} from '@/lib/subcontractor/service';
import { saveBuffer } from '@/lib/upload';

export const dynamic = 'force-dynamic';

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  message?: { id?: string; type: string; text?: string };
}

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Very small keyword grammar for sub-contractor status updates over LINE (no dashboard/UI on
// their side to pick a job explicitly, so this stays deliberately simple): "เริ่ม*"/"start*"
// signals they've started the job; "เสร็จ*"/"ส่งงาน*"/"done*" signals they're submitting it for
// review. Anything else is just logged as a plain text note against their current job — never
// blocks/replaces the installer's own approve/reject decision.
function detectIntent(text: string): 'start' | 'submit' | 'note' {
  const t = text.trim().toLowerCase();
  if (/^(เริ่ม|start)/.test(t)) return 'start';
  if (/(เสร็จ|ส่งงาน|done)/.test(t)) return 'submit';
  return 'note';
}

/**
 * Handles one message event from a sub-contractor who has already linked LINE (party='subcontractor').
 * Text updates their most recently touched open job (assigned/in_progress/submitted); photos are
 * downloaded via the LINE Content API and saved under uploads/subcontractor-photos/. Silently
 * no-ops (still replies 200 upstream) if the sender isn't a linked sub-contractor or has no open job —
 * this handler only ever touches job_assignments/job_assignment_updates, never payment_* tables.
 */
async function handleSubcontractorMessage(event: LineEvent): Promise<string | null> {
  const lineUserId = event.source?.userId;
  if (!lineUserId) return null;
  const sub = await getSubcontractorByLineUserId(lineUserId);
  if (!sub) return null;

  const job = await findActiveJobForSubcontractor(sub.id);
  if (!job) return 'ตอนนี้คุณไม่มีงานที่กำลังดำเนินการอยู่ ติดต่อผู้ติดตั้งของคุณหากคิดว่าไม่ถูกต้อง';

  if (event.message?.type === 'text' && event.message.text) {
    const text = event.message.text;
    const intent = detectIntent(text);
    await logJobUpdate({ jobAssignmentId: job.id, subcontractorId: sub.id, kind: 'text', body: text });

    if (intent === 'start' && job.status === 'assigned') {
      await startJobFromLine(job.id);
      return '✅ บันทึกแล้วว่าคุณเริ่มงานนี้แล้ว';
    }
    if (intent === 'submit' && job.status === 'in_progress') {
      await submitJobFromLine(job.id, text);
      return '📩 ส่งงานให้ผู้ติดตั้งตรวจแล้ว รอผลการตรวจสอบ';
    }
    return '📝 บันทึกข้อความของคุณแล้ว';
  }

  if (event.message?.type === 'image' && event.message.id) {
    const content = await fetchLineContent(event.message.id);
    if (!content) return null;
    const ext = EXT_BY_CONTENT_TYPE[content.contentType] || '.jpg';
    const url = saveBuffer(content.buffer, 'subcontractor-photos', `job-${job.id}-${Date.now()}`, ext);
    await logJobUpdate({ jobAssignmentId: job.id, subcontractorId: sub.id, kind: 'photo', body: url });
    return '📷 รับรูปแล้ว ผู้ติดตั้งจะเห็นรูปนี้ในหน้ารายละเอียดงาน';
  }

  return null;
}

// LINE Messaging API webhook — receives every event sent to the shared SolarPanel OA.
// Handles: (1) a text message containing a pending 6-digit link code (customer/installer/
// sub-contractor "add friend then type this code" flow), and (2) once linked, a sub-contractor's
// status-update text or photo message. Everything else is acknowledged (200) and ignored.
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
      if (event.type !== 'message' || !event.source?.userId) return;

      if (event.message?.type === 'text' && event.message.text) {
        const code = extractCodeFromText(event.message.text);
        if (code) {
          const matched = await consumeLinkCode(code, event.source.userId);
          if (event.replyToken) {
            await replyLineMessage(
              event.replyToken,
              matched ? '✅ เชื่อมต่อ LINE สำเร็จแล้ว! คุณจะได้รับแจ้งเตือนความคืบหน้าโครงการทาง LINE จากนี้ไป' : '❌ รหัสยืนยันไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอรหัสใหม่จากหน้าเว็บไซต์'
            );
          }
          return;
        }
      }

      const reply = await handleSubcontractorMessage(event);
      if (reply && event.replyToken) await replyLineMessage(event.replyToken, reply);
    })
  );

  return NextResponse.json({ success: true });
}
