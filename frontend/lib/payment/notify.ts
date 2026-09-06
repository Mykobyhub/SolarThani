// Notification dispatch for the Milestone Payment workflow — fans each event out to
// email (always available) and/or LINE (only if the recipient linked + selected it),
// per that party's own `*_notify_channel` preference. Every send is best-effort: a
// failure here must never block the underlying payment/state-machine action, so every
// call site awaits this but the functions themselves swallow/log errors internally
// (sendEmail/pushLineMessage already fail silently when unconfigured).

import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import * as mail from '@/lib/email';
import { pushLineMessage } from '@/lib/line/send';
import type { PaymentProjectRow, PaymentMilestoneRow } from './service';

const appUrl = () => process.env.NEXTAUTH_URL || 'http://localhost:3000';

interface InstallerContact {
  id: number;
  name: string;
  email: string;
  line_user_id: string | null;
}

async function getInstallerContact(installerId: number): Promise<InstallerContact | undefined> {
  return (await db.prepare('SELECT id, name, email, line_user_id FROM installers WHERE id = ?').get(installerId)) as
    | InstallerContact
    | undefined;
}

async function sendToParty(opts: {
  channel: string;
  email?: { to: string; subject: string; html: string };
  lineUserId?: string | null;
  lineText?: string;
}) {
  const jobs: Promise<void>[] = [];
  if ((opts.channel === 'email' || opts.channel === 'both') && opts.email) {
    jobs.push(sendEmail(opts.email).catch((err) => console.error('[notify] email failed', err)));
  }
  if ((opts.channel === 'line' || opts.channel === 'both') && opts.lineUserId && opts.lineText) {
    jobs.push(pushLineMessage(opts.lineUserId, opts.lineText));
  }
  await Promise.allSettled(jobs);
}

export async function notifyPlanProposed(project: PaymentProjectRow): Promise<void> {
  const link = `${appUrl()}/project/${project.customer_token}`;
  const html = await mail.buildMilestonePlanProposedEmail(project.customer_name, project.title, project.total_amount, link);
  await sendToParty({
    channel: project.customer_notify_channel,
    email: { to: project.customer_email, subject: 'มีแผนการชำระเงินงวดใหม่รอคุณยืนยัน', html },
    lineUserId: project.customer_line_user_id,
    lineText: `📢 ผู้ติดตั้งเสนอแผนชำระเงินสำหรับ "${project.title}" มูลค่า ฿${Math.round(project.total_amount).toLocaleString('th-TH')}\nดูรายละเอียด: ${link}`,
  });
}

export async function notifyPaymentReceived(project: PaymentProjectRow, milestone: PaymentMilestoneRow): Promise<void> {
  const installer = await getInstallerContact(project.installer_id);
  if (!installer) return;
  const html = await mail.buildMilestonePaymentReceivedEmail(installer.name, project.title, milestone.seq, milestone.amount);
  await sendToParty({
    channel: project.installer_notify_channel,
    email: { to: installer.email, subject: `ลูกค้าชำระงวดที่ ${milestone.seq} แล้ว`, html },
    lineUserId: installer.line_user_id,
    lineText: `💰 ลูกค้าชำระงวดที่ ${milestone.seq} ของ "${project.title}" แล้ว (฿${Math.round(milestone.amount).toLocaleString('th-TH')}) เริ่มงานได้เลย`,
  });
}

export async function notifyMilestoneDone(project: PaymentProjectRow, milestone: PaymentMilestoneRow): Promise<void> {
  const link = `${appUrl()}/project/${project.customer_token}/confirm/${milestone.id}`;
  const html = await mail.buildMilestoneDoneEmail(project.customer_name, project.title, milestone.seq, link);
  await sendToParty({
    channel: project.customer_notify_channel,
    email: { to: project.customer_email, subject: `งวดที่ ${milestone.seq} เสร็จแล้ว รอการยืนยันจากคุณ`, html },
    lineUserId: project.customer_line_user_id,
    lineText: `🔧 งวดที่ ${milestone.seq} ของ "${project.title}" เสร็จแล้ว กรุณายืนยันหรือแจ้งโต้แย้ง: ${link}`,
  });
}

export async function notifyCustomerDecision(
  project: PaymentProjectRow,
  milestone: PaymentMilestoneRow,
  decision: 'released' | 'disputed'
): Promise<void> {
  const installer = await getInstallerContact(project.installer_id);
  if (!installer) return;
  const html = await mail.buildMilestoneDecisionEmail(installer.name, project.title, milestone.seq, decision);
  await sendToParty({
    channel: project.installer_notify_channel,
    email: {
      to: installer.email,
      subject: decision === 'released' ? `ลูกค้ายืนยันงวดที่ ${milestone.seq} — ปล่อยเงินแล้ว` : `ลูกค้าโต้แย้งงวดที่ ${milestone.seq}`,
      html,
    },
    lineUserId: installer.line_user_id,
    lineText:
      decision === 'released'
        ? `✅ ลูกค้ายืนยันงวดที่ ${milestone.seq} ของ "${project.title}" แล้ว ปล่อยเงินให้คุณแล้ว`
        : `⚠️ ลูกค้าโต้แย้งงวดที่ ${milestone.seq} ของ "${project.title}" — เงินถูกพักไว้รอ Admin ตัดสิน`,
  });
}

export async function notifyDisputeResolved(
  project: PaymentProjectRow,
  milestone: PaymentMilestoneRow,
  action: 'release' | 'refund'
): Promise<void> {
  const installer = await getInstallerContact(project.installer_id);
  const installerHtml = installer ? await mail.buildDisputeResolvedEmail(installer.name, project.title, milestone.seq, action) : '';
  const customerHtml = await mail.buildDisputeResolvedEmail(project.customer_name, project.title, milestone.seq, action);

  await Promise.allSettled([
    installer
      ? sendToParty({
          channel: project.installer_notify_channel,
          email: { to: installer.email, subject: `ผลการตัดสินข้อโต้แย้ง งวดที่ ${milestone.seq}`, html: installerHtml },
          lineUserId: installer.line_user_id,
          lineText: `⚖️ Admin ตัดสินข้อโต้แย้งงวดที่ ${milestone.seq} ของ "${project.title}": ${action === 'release' ? 'ปล่อยเงินให้ผู้ติดตั้ง' : 'คืนเงินให้ลูกค้า'}`,
        })
      : Promise.resolve(),
    sendToParty({
      channel: project.customer_notify_channel,
      email: { to: project.customer_email, subject: `ผลการตัดสินข้อโต้แย้ง งวดที่ ${milestone.seq}`, html: customerHtml },
      lineUserId: project.customer_line_user_id,
      lineText: `⚖️ Admin ตัดสินข้อโต้แย้งงวดที่ ${milestone.seq} ของ "${project.title}": ${action === 'release' ? 'ปล่อยเงินให้ผู้ติดตั้ง' : 'คืนเงินให้ลูกค้า'}`,
    }),
  ]);
}

export async function notifyProjectCancelled(project: PaymentProjectRow, requestedBy: 'customer' | 'installer' | 'admin'): Promise<void> {
  const requestedByLabel = requestedBy === 'customer' ? 'ลูกค้า' : requestedBy === 'installer' ? 'ผู้ติดตั้ง' : 'ผู้ดูแลระบบ';
  const installer = await getInstallerContact(project.installer_id);
  const customerHtml = await mail.buildProjectCancelledEmail(project.customer_name, project.title, requestedByLabel);
  const installerHtml = installer ? await mail.buildProjectCancelledEmail(installer.name, project.title, requestedByLabel) : '';

  await Promise.allSettled([
    sendToParty({
      channel: project.customer_notify_channel,
      email: { to: project.customer_email, subject: `โครงการ ${project.title} ถูกยกเลิก`, html: customerHtml },
      lineUserId: project.customer_line_user_id,
      lineText: `🚫 โครงการ "${project.title}" ถูกยกเลิกแล้ว (คำขอโดย${requestedByLabel})`,
    }),
    installer
      ? sendToParty({
          channel: project.installer_notify_channel,
          email: { to: installer.email, subject: `โครงการ ${project.title} ถูกยกเลิก`, html: installerHtml },
          lineUserId: installer.line_user_id,
          lineText: `🚫 โครงการ "${project.title}" ถูกยกเลิกแล้ว (คำขอโดย${requestedByLabel})`,
        })
      : Promise.resolve(),
  ]);
}
