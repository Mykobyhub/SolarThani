import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripTags } from '@/lib/sanitize';
import { getSessionFromRequest } from '@/lib/auth';
import { COMMISSION_PERCENT_MIN, COMMISSION_PERCENT_MAX, COMMISSION_FLAT_MIN, COMMISSION_FLAT_MAX } from '@/lib/affiliate/constants';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const data = (await db.prepare(`
    SELECT id, email, name, description, phone, location, about, logo_url, status, role, created_at,
           experience, contact_email, line_id, response_time, warranty_panel, warranty_inverter, warranty_workmanship,
           services, certifications, profile_views, lat, lng, service_provinces,
           youtube_url, tiktok_url, facebook_url, website_url,
           affiliate_enabled, affiliate_commission_type, affiliate_commission_value
    FROM installers WHERE id = ?
  `).get(session.id)) as Record<string, unknown> | undefined;

  if (!data) return NextResponse.json({ success: false, message: 'ไม่พบข้อมูล' }, { status: 404 });

  for (const f of ['services', 'certifications', 'service_provinces']) {
    try { data[f] = JSON.parse((data[f] as string) || '[]'); } catch { data[f] = []; }
  }

  return NextResponse.json({ success: true, data });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    name, description, phone, contact_email, location, about,
    experience, line_id, response_time,
    warranty_panel, warranty_inverter, warranty_workmanship,
    services, certifications,
    lat, lng, service_provinces,
    youtube_url, tiktok_url, facebook_url, website_url,
    affiliate_enabled, affiliate_commission_type, affiliate_commission_value,
  } = body;

  if (!name || stripTags(name).length < 2)
    return NextResponse.json({ success: false, message: 'กรุณากรอกชื่อบริษัท' }, { status: 400 });

  // Affiliate program opt-in + commission config (Phase 4). Validated server-side too —
  // never trust the client-side check in DashboardClient alone. Range only enforced while
  // the program is actually enabled, so a never-touched default (value=0) doesn't block
  // saving unrelated profile fields.
  const affiliateEnabled = affiliate_enabled ? 1 : 0;
  const affiliateCommissionType = affiliate_commission_type === 'flat' ? 'flat' : 'percent';
  const affiliateCommissionValue = affiliate_commission_value != null && affiliate_commission_value !== ''
    ? parseFloat(affiliate_commission_value) : 0;

  if (affiliateEnabled) {
    const min = affiliateCommissionType === 'percent' ? COMMISSION_PERCENT_MIN : COMMISSION_FLAT_MIN;
    const max = affiliateCommissionType === 'percent' ? COMMISSION_PERCENT_MAX : COMMISSION_FLAT_MAX;
    if (isNaN(affiliateCommissionValue) || affiliateCommissionValue < min || affiliateCommissionValue > max) {
      return NextResponse.json({
        success: false,
        message: `ค่าคอมมิชชัน Affiliate ต้องอยู่ระหว่าง ${min}-${max}${affiliateCommissionType === 'percent' ? '%' : ' บาท'}`,
      }, { status: 400 });
    }
  }

  const svcJson  = Array.isArray(services)          ? JSON.stringify(services.map((s: unknown) => stripTags(String(s))).filter(Boolean))          : null;
  const certJson = Array.isArray(certifications)    ? JSON.stringify(certifications.map((c: unknown) => stripTags(String(c))).filter(Boolean))    : null;
  const spJson   = Array.isArray(service_provinces) ? JSON.stringify(service_provinces.map((p: unknown) => stripTags(String(p))).filter(Boolean)) : null;

  const parsedLat = lat != null && !isNaN(parseFloat(lat)) ? parseFloat(lat) : null;
  const parsedLng = lng != null && !isNaN(parseFloat(lng)) ? parseFloat(lng) : null;

  await db.prepare(`
    UPDATE installers SET
      name=?, description=?, phone=?, contact_email=?, location=?, about=?,
      experience=?, line_id=?, response_time=?,
      warranty_panel=?, warranty_inverter=?, warranty_workmanship=?,
      services=?, certifications=?,
      lat=?, lng=?, service_provinces=?,
      youtube_url=?, tiktok_url=?, facebook_url=?, website_url=?,
      affiliate_enabled=?, affiliate_commission_type=?, affiliate_commission_value=?
    WHERE id=?
  `).run(
    stripTags(name),
    description ? stripTags(description) : null,
    phone || null,
    contact_email ? String(contact_email).trim().toLowerCase() : null,
    location ? stripTags(location) : null,
    about ? stripTags(about) : null,
    experience ? parseInt(experience) : 0,
    line_id ? stripTags(line_id) : null,
    response_time ? stripTags(response_time) : null,
    warranty_panel || '25 ปี',
    warranty_inverter || '10 ปี',
    warranty_workmanship || '2 ปี',
    svcJson, certJson,
    parsedLat, parsedLng, spJson,
    youtube_url  ? String(youtube_url).trim()  : null,
    tiktok_url   ? String(tiktok_url).trim()   : null,
    facebook_url ? String(facebook_url).trim() : null,
    website_url  ? String(website_url).trim()  : null,
    affiliateEnabled, affiliateCommissionType, affiliateCommissionValue,
    session.id
  );

  return NextResponse.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' });
}
