import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripTags, isValidEmail } from '@/lib/sanitize';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail, buildLeadAdminNotifyEmail, buildLeadConfirmationEmail, buildInstallerNewLeadEmail } from '@/lib/email';
import { saveFile } from '@/lib/upload';
import { SP_REF_COOKIE_NAME, parseSpRefCookie } from '@/lib/affiliate/ref-cookie';
import path from 'path';

export const dynamic = 'force-dynamic';

function validateContact(data: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const { name, email, phone, province, message } = data;
  const n = stripTags(name);
  if (!n || n.length < 2 || n.length > 100) errors.push('ชื่อต้องมี 2–100 ตัวอักษร');
  if (!email || !isValidEmail(String(email)))  errors.push('รูปแบบอีเมลไม่ถูกต้อง');
  const ph = String(phone || '').replace(/-/g, '');
  if (!ph || !/^0\d{9}$/.test(ph))             errors.push('เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 10 หลัก');
  if (!province || !stripTags(province))        errors.push('กรุณาระบุจังหวัด');
  if (message && stripTags(message).length > 1000) errors.push('ข้อความต้องไม่เกิน 1,000 ตัวอักษร');
  return errors;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const rl = checkRateLimit(`contact:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed)
    return NextResponse.json({ success: false, message: 'ส่งได้สูงสุด 10 ครั้ง/ชั่วโมง กรุณาลองใหม่ภายหลัง' }, { status: 429 });

  const contentType = req.headers.get('content-type') || '';
  let fields: Record<string, unknown> = {};
  let calcFile: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    formData.forEach((v, k) => { fields[k] = v; });
    const file = formData.get('calc_file') as File | null;
    if (file && file.size > 0) {
      if (file.type !== 'application/pdf')
        return NextResponse.json({ success: false, message: 'รองรับเฉพาะไฟล์ PDF' }, { status: 400 });
      if (file.size > 5 * 1024 * 1024)
        return NextResponse.json({ success: false, message: 'ไฟล์ขนาดใหญ่เกิน 5MB' }, { status: 400 });
      const ext = path.extname(file.name).toLowerCase() || '.pdf';
      calcFile = await saveFile(file, 'calc', `calc-${Date.now()}${ext}`.replace(ext, ''));
    }
  } else {
    fields = await req.json().catch(() => ({}));
  }

  const errors = validateContact(fields);
  if (errors.length > 0) return NextResponse.json({ success: false, errors }, { status: 400 });

  const lead = {
    name:         stripTags(fields.name),
    email:        String(fields.email).toLowerCase().trim(),
    phone:        String(fields.phone).replace(/-/g, ''),
    province:     stripTags(fields.province),
    message:      fields.message ? stripTags(fields.message) : null,
    installer_id: fields.installer_id ? Number(fields.installer_id) : null,
    calc_data:    fields.calc_data ? String(fields.calc_data) : null,
    calc_file:    calcFile,
  };

  // Affiliate attribution — only possible once the lead has a target
  // installer (the lead's own installer_id always wins over the cookie's own
  // installerId for site-wide links, per the confirmed spec: "installer ที่
  // lead เลือกมี affiliate_enabled=1"). Snapshot commission terms at this
  // exact moment so a later change to the installer's rate can't affect an
  // already-tagged lead.
  let affiliateId: number | null = null;
  let affiliateCommissionType: string | null = null;
  let affiliateCommissionValue: number | null = null;

  if (lead.installer_id) {
    const refPayload = parseSpRefCookie(req.cookies.get(SP_REF_COOKIE_NAME)?.value);
    if (refPayload) {
      const targetInstaller = (await db.prepare(`
        SELECT id, email, contact_email, affiliate_enabled, affiliate_commission_type, affiliate_commission_value
        FROM installers WHERE id = ?
      `).get(lead.installer_id)) as Record<string, unknown> | undefined;

      if (targetInstaller && Number(targetInstaller.affiliate_enabled) === 1) {
        const affiliate = (await db.prepare(
          `SELECT id, email FROM affiliates WHERE id = ? AND status = 'active'`
        ).get(refPayload.affiliateId)) as { id: number; email: string } | undefined;

        if (affiliate) {
          // Self-referral guard: compare affiliate's registered email against
          // both the installer's login email and its public contact_email.
          const affiliateEmail = affiliate.email.toLowerCase().trim();
          const installerEmail = String(targetInstaller.email || '').toLowerCase().trim();
          const installerContactEmail = String(targetInstaller.contact_email || '').toLowerCase().trim();
          const isSelfReferral =
            affiliateEmail === installerEmail || (!!installerContactEmail && affiliateEmail === installerContactEmail);

          if (!isSelfReferral) {
            affiliateId = affiliate.id;
            affiliateCommissionType = targetInstaller.affiliate_commission_type as string;
            affiliateCommissionValue = targetInstaller.affiliate_commission_value as number;
          }
        }
      }
    }
  }

  await db.prepare(`
    INSERT INTO leads (name, email, phone, province, message, installer_id, calc_data, calc_file, affiliate_id, affiliate_commission_type, affiliate_commission_value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    lead.name, lead.email, lead.phone, lead.province, lead.message, lead.installer_id, lead.calc_data, lead.calc_file,
    affiliateId, affiliateCommissionType, affiliateCommissionValue
  );

  const adminEmail = process.env.ADMIN_EMAIL || '';
  if (adminEmail) {
    const adminHtml = await buildLeadAdminNotifyEmail(lead);
    sendEmail({ to: adminEmail, subject: `[Solar Thani] Lead ใหม่จาก ${lead.name}`, html: adminHtml }).catch(() => {});
  }
  const confirmHtml = await buildLeadConfirmationEmail(lead);
  sendEmail({ to: lead.email, subject: '[Solar Thani] รับคำขอใบเสนอราคาของคุณแล้ว', html: confirmHtml }).catch(() => {});

  if (lead.installer_id) {
    const inst = (await db.prepare(`SELECT id, name, email FROM installers WHERE id = ? AND status = 'active'`)
      .get(lead.installer_id)) as { id: number; name: string; email: string } | undefined;
    if (inst) {
      const instHtml = await buildInstallerNewLeadEmail(inst.name, lead);
      sendEmail({ to: inst.email, subject: `[Solar Thani] มี Lead ใหม่จากจังหวัด${lead.province}!`, html: instHtml }).catch(() => {});
    }
  }

  return NextResponse.json({ success: true, message: 'ส่งข้อมูลเรียบร้อยแล้ว ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง' });
}
