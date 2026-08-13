import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stripTags } from '@/lib/sanitize';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });

  const data = (await db.prepare(`
    SELECT id, email, name, description, phone, location, about, logo_url, status, role, created_at,
           experience, contact_email, line_id, response_time, warranty_panel, warranty_inverter, warranty_workmanship,
           services, certifications, profile_views, lat, lng, service_provinces,
           youtube_url, tiktok_url, facebook_url, website_url
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
  } = body;

  if (!name || stripTags(name).length < 2)
    return NextResponse.json({ success: false, message: 'กรุณากรอกชื่อบริษัท' }, { status: 400 });

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
      youtube_url=?, tiktok_url=?, facebook_url=?, website_url=?
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
    session.id
  );

  return NextResponse.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' });
}
