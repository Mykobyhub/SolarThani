import nodemailer from 'nodemailer';
import { db } from './db';

async function getSmtpConfig(): Promise<{ user: string; pass: string; host: string; port: number; secure: boolean }> {
  const rows = (await db
    .prepare(`SELECT key, value FROM site_content WHERE key IN ('smtp_user','smtp_pass','smtp_host','smtp_port')`)
    .all()) as { key: string; value: string }[];
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const host = cfg.smtp_host || process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(cfg.smtp_port || process.env.SMTP_PORT || '465', 10);
  return {
    user: cfg.smtp_user || process.env.SMTP_USER || '',
    pass: cfg.smtp_pass || process.env.SMTP_PASS || '',
    host,
    port,
    secure: port === 465,
  };
}

async function getSiteLogoUrl(): Promise<string> {
  const row = (await db
    .prepare(`SELECT value FROM site_content WHERE key='logo_url'`)
    .get()) as { value: string } | undefined;
  return row?.value || '';
}

async function createTransport() {
  const { user, pass, host, port, secure } = await getSmtpConfig();
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function emailLayout(title: string, body: string): Promise<string> {
  const logoUrl = await getSiteLogoUrl();
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="Solar Thani" style="height:48px;margin-bottom:12px;" />`
    : `<div style="font-size:22px;font-weight:700;color:#00b8a0;">Solar Thani Thailand</div>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f0f9f8;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr><td style="background:#00b8a0;padding:24px;text-align:center;color:#fff;">
          ${logoHtml}
        </td></tr>
        <tr><td style="padding:32px;">
          ${body}
        </td></tr>
        <tr><td style="background:#f0f9f8;padding:16px;text-align:center;font-size:13px;color:#6b7c7a;">
          © ${new Date().getFullYear()} Solar Thani Thailand · support@solarthani.com
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface SendOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendOptions): Promise<void> {
  const cfg = await getSmtpConfig();
  if (!cfg.user || !cfg.pass) return;
  const transport = await createTransport();
  await transport.sendMail({
    from: `"Solar Thani Thailand" <${cfg.user}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

export async function buildWelcomeEmail(name: string): Promise<string> {
  return emailLayout(
    'ยินดีต้อนรับสู่ Solar Thani Thailand',
    `<h2 style="color:#00b8a0;">ยินดีต้อนรับ, ${name}!</h2>
     <p>บัญชีของคุณถูกสร้างเรียบร้อยแล้ว กรุณารอการอนุมัติจากผู้ดูแลระบบ</p>
     <p>เมื่ออนุมัติแล้ว คุณจะสามารถเข้าใช้งาน Dashboard ได้ทันที</p>`
  );
}

export async function buildApprovalEmail(name: string): Promise<string> {
  return emailLayout(
    'บัญชีของคุณได้รับการอนุมัติแล้ว',
    `<h2 style="color:#00b8a0;">ยินดีด้วย, ${name}!</h2>
     <p>บัญชีผู้ติดตั้งของคุณได้รับการอนุมัติแล้ว</p>
     <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login"
        style="display:inline-block;background:#00b8a0;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
       เข้าสู่ระบบ
     </a>`
  );
}

export async function buildResetPasswordEmail(name: string, resetUrl: string): Promise<string> {
  return emailLayout(
    'รีเซ็ตรหัสผ่าน',
    `<h2 style="color:#00b8a0;">รีเซ็ตรหัสผ่าน</h2>
     <p>สวัสดี ${name}, คุณได้ขอรีเซ็ตรหัสผ่าน</p>
     <a href="${resetUrl}"
        style="display:inline-block;background:#00b8a0;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
       รีเซ็ตรหัสผ่าน
     </a>
     <p style="color:#6b7c7a;font-size:13px;margin-top:16px;">ลิงก์นี้มีอายุ 1 ชั่วโมง</p>`
  );
}

export async function buildReviewVerifyEmail(reviewerName: string, installerName: string, verifyUrl: string): Promise<string> {
  return emailLayout(
    'ยืนยันรีวิวของคุณ',
    `<h2 style="color:#00b8a0;">ยืนยันรีวิวของคุณ</h2>
     <p>สวัสดี ${reviewerName}, กรุณายืนยันรีวิวสำหรับ ${installerName}</p>
     <a href="${verifyUrl}"
        style="display:inline-block;background:#00b8a0;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
       ยืนยันรีวิว
     </a>`
  );
}

export async function buildLeadNotifyEmail(installerName: string, lead: { name: string; phone: string; province: string; message?: string }): Promise<string> {
  return emailLayout(
    'มีลูกค้าใหม่ติดต่อคุณ',
    `<h2 style="color:#00b8a0;">มีลูกค้าใหม่!</h2>
     <p>สวัสดี ${installerName}, มีลูกค้าใหม่ติดต่อผ่าน Solar Thani Thailand</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;">
       <tr><td style="padding:8px;border-bottom:1px solid #e0efed;color:#6b7c7a;">ชื่อ</td>
           <td style="padding:8px;border-bottom:1px solid #e0efed;">${lead.name}</td></tr>
       <tr><td style="padding:8px;border-bottom:1px solid #e0efed;color:#6b7c7a;">เบอร์โทร</td>
           <td style="padding:8px;border-bottom:1px solid #e0efed;">${lead.phone}</td></tr>
       <tr><td style="padding:8px;border-bottom:1px solid #e0efed;color:#6b7c7a;">จังหวัด</td>
           <td style="padding:8px;border-bottom:1px solid #e0efed;">${lead.province}</td></tr>
       ${lead.message ? `<tr><td style="padding:8px;color:#6b7c7a;">ข้อความ</td>
           <td style="padding:8px;">${lead.message}</td></tr>` : ''}
     </table>`
  );
}

export async function buildLeadAdminNotifyEmail(lead: { name: string; email: string; phone: string; province: string; message?: string | null; installer_id?: number | null; calc_data?: string | null }): Promise<string> {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return emailLayout(
    `Lead ใหม่จาก ${lead.name}`,
    `<h2 style="color:#00b8a0;">มี Lead ใหม่เข้ามา!</h2>
     <table cellpadding="8" style="width:100%;border-collapse:collapse;background:#f8fffe;border-radius:8px;margin:12px 0">
       <tr><td style="font-weight:600;color:#6b7c7a;width:120px">ชื่อ</td><td>${lead.name}</td></tr>
       <tr style="background:#fff"><td style="font-weight:600;color:#6b7c7a">อีเมล</td><td>${lead.email}</td></tr>
       <tr><td style="font-weight:600;color:#6b7c7a">โทร</td><td>${lead.phone}</td></tr>
       <tr style="background:#fff"><td style="font-weight:600;color:#6b7c7a">จังหวัด</td><td>${lead.province}</td></tr>
       <tr><td style="font-weight:600;color:#6b7c7a">ข้อความ</td><td>${lead.message || '-'}</td></tr>
       ${lead.installer_id ? `<tr style="background:#fff"><td style="font-weight:600;color:#6b7c7a">Installer ID</td><td>${lead.installer_id}</td></tr>` : ''}
     </table>
     <p><a href="${appUrl}/admin" style="display:inline-block;padding:10px 20px;background:#00b8a0;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">จัดการ Lead ใน Admin →</a></p>`
  );
}

export async function buildLeadConfirmationEmail(lead: { name: string; province: string; calc_data?: string | null }): Promise<string> {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return emailLayout(
    'รับคำขอของคุณแล้ว',
    `<h2 style="color:#00b8a0;">รับคำขอใบเสนอราคาแล้ว!</h2>
     <p>สวัสดีคุณ ${lead.name},</p>
     <p>เราได้รับคำขอใบเสนอราคาของคุณเรียบร้อยแล้ว ทีมงานจะติดต่อกลับภายใน <strong>24 ชั่วโมง</strong></p>
     <p>จังหวัด: <strong>${lead.province}</strong></p>
     <p><a href="${appUrl}/installers" style="display:inline-block;padding:10px 20px;background:#00b8a0;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">ดูรายชื่อผู้ติดตั้ง →</a></p>
     <p>ขอบคุณที่ไว้วางใจ <strong>Solar Thani Thailand</strong></p>`
  );
}

export async function buildInstallerNewLeadEmail(installerName: string, lead: { name: string; email: string; phone: string; province: string; message?: string | null }): Promise<string> {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return emailLayout(
    `Lead ใหม่จากจังหวัด${lead.province}!`,
    `<h2 style="color:#00b8a0;">มี Lead ใหม่!</h2>
     <p>สวัสดีคุณ ${installerName}, มีลูกค้าส่งคำขอใบเสนอราคามาหาคุณ!</p>
     <table cellpadding="8" style="width:100%;border-collapse:collapse;background:#f8fffe;border-radius:8px;margin:16px 0">
       <tr><td style="font-weight:600;color:#6b7c7a;width:120px">ชื่อลูกค้า</td><td>${lead.name}</td></tr>
       <tr style="background:#fff"><td style="font-weight:600;color:#6b7c7a">เบอร์โทร</td><td>${lead.phone}</td></tr>
       <tr><td style="font-weight:600;color:#6b7c7a">อีเมล</td><td>${lead.email}</td></tr>
       <tr style="background:#fff"><td style="font-weight:600;color:#6b7c7a">จังหวัด</td><td>${lead.province}</td></tr>
       ${lead.message ? `<tr><td style="font-weight:600;color:#6b7c7a">ข้อความ</td><td>${lead.message}</td></tr>` : ''}
     </table>
     <p><a href="${appUrl}/dashboard" style="display:inline-block;padding:10px 20px;background:#00b8a0;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">ดู Lead ใน Dashboard →</a></p>`
  );
}

export async function buildInstallerReviewNotifyEmail(installerName: string, installerId: number, review: { reviewer_name: string; rating: number; body: string }): Promise<string> {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  return emailLayout(
    `มีรีวิวใหม่ (${review.rating}/5)`,
    `<h2 style="color:#00b8a0;">มีรีวิวใหม่!</h2>
     <p>สวัสดีคุณ ${installerName},</p>
     <div style="background:#f8fffe;border-left:4px solid #00b8a0;border-radius:0 8px 8px 0;padding:16px;margin:16px 0">
       <div style="color:#f5a623;font-size:1.3rem;margin-bottom:8px">${stars} <span style="color:#0f2428;font-size:0.9rem;font-weight:600">(${review.rating}/5)</span></div>
       <div style="font-weight:600;margin-bottom:6px">${review.reviewer_name}</div>
       <div style="color:#0f2428;font-style:italic">"${review.body.substring(0, 200)}${review.body.length > 200 ? '…' : ''}"</div>
     </div>
     <p><a href="${appUrl}/installers/${installerId}" style="display:inline-block;padding:10px 20px;background:#00b8a0;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">ดูรีวิวบนโปรไฟล์ →</a></p>`
  );
}

export async function buildClaimAccountEmail(name: string, email: string, tempPassword: string, loginUrl: string): Promise<string> {
  return emailLayout(
    'บัญชีผู้ติดตั้งของคุณพร้อมใช้งานแล้ว',
    `<h2 style="color:#00b8a0;">สวัสดี ${name}</h2>
     <p>ทีมงาน Solar Thani Thailand ได้โอนสิทธิ์การเข้าใช้งานบัญชีผู้ติดตั้งนี้ให้คุณแล้ว กรุณาใช้ข้อมูลด้านล่างเพื่อเข้าสู่ระบบ</p>
     <table cellpadding="8" style="width:100%;border-collapse:collapse;background:#f8fffe;border-radius:8px;margin:16px 0">
       <tr><td style="font-weight:600;color:#6b7c7a;width:140px">อีเมลเข้าสู่ระบบ</td><td>${email}</td></tr>
       <tr style="background:#fff"><td style="font-weight:600;color:#6b7c7a">รหัสผ่านชั่วคราว</td><td style="font-family:monospace;font-size:1.05em;letter-spacing:0.5px">${tempPassword}</td></tr>
     </table>
     <a href="${loginUrl}"
        style="display:inline-block;background:#00b8a0;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px;">
       เข้าสู่ระบบ
     </a>
     <p style="color:#e11d48;font-size:13px;margin-top:16px;">⚠️ เพื่อความปลอดภัย ระบบจะให้คุณตั้งรหัสผ่านใหม่ทันทีหลังเข้าสู่ระบบครั้งแรก</p>`
  );
}

export async function buildContactSupportEmail(msg: { name: string; email: string; phone?: string | null; subject?: string | null; message: string }): Promise<string> {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return emailLayout(
    msg.subject || `ข้อความจาก ${msg.name}`,
    `<h2 style="color:#00b8a0;">ข้อความจากหน้าติดต่อเรา</h2>
     <table cellpadding="8" style="width:100%;border-collapse:collapse;background:#f8fffe;border-radius:8px;margin:12px 0">
       <tr><td style="font-weight:600;color:#6b7c7a;width:120px">ชื่อ</td><td>${msg.name}</td></tr>
       <tr style="background:#fff"><td style="font-weight:600;color:#6b7c7a">อีเมล</td><td>${msg.email}</td></tr>
       ${msg.phone ? `<tr><td style="font-weight:600;color:#6b7c7a">โทร</td><td>${msg.phone}</td></tr>` : ''}
       ${msg.subject ? `<tr style="background:#fff"><td style="font-weight:600;color:#6b7c7a">หัวข้อ</td><td>${msg.subject}</td></tr>` : ''}
       <tr><td style="font-weight:600;color:#6b7c7a">ข้อความ</td><td style="white-space:pre-wrap">${msg.message}</td></tr>
     </table>
     <p><a href="${appUrl}/admin" style="display:inline-block;padding:10px 20px;background:#00b8a0;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">ดูใน Admin Panel →</a></p>`
  );
}
