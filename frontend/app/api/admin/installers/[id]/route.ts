import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { stripTags, isValidEmail } from '@/lib/sanitize';
import type { Installer } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  const installer = await db.prepare('SELECT * FROM installers WHERE id = ?').get(id);
  if (!installer) return NextResponse.json({ success: false, message: 'ไม่พบผู้ติดตั้ง' }, { status: 404 });

  return NextResponse.json({ success: true, data: installer });
}

function str(v: unknown, fallback: string | null): string | null {
  return v === undefined ? fallback : (v === null ? null : stripTags(v));
}

function num(v: unknown, fallback: number): number {
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function jsonStr(v: unknown, fallback: string | null): string | null {
  if (v === undefined) return fallback;
  if (v === null || v === '') return null;
  try { JSON.parse(String(v)); return String(v); } catch { return fallback; }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ success: false, message: 'ต้องการสิทธิ์ Admin' }, { status: 403 });

  const { id } = await params;
  const existing = (await db.prepare('SELECT * FROM installers WHERE id = ?').get(id)) as Installer | undefined;
  if (!existing) return NextResponse.json({ success: false, message: 'ไม่พบผู้ติดตั้ง' }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  let email = existing.email;
  if (body.email !== undefined) {
    const candidate = String(body.email).toLowerCase().trim();
    if (!isValidEmail(candidate))
      return NextResponse.json({ success: false, message: 'อีเมลไม่ถูกต้อง' }, { status: 400 });
    if (candidate !== existing.email) {
      const dupe = await db.prepare('SELECT id FROM installers WHERE email = ? AND id != ?').get(candidate, id);
      if (dupe) return NextResponse.json({ success: false, message: 'อีเมลนี้ถูกใช้งานโดยบัญชีอื่นแล้ว' }, { status: 400 });
    }
    email = candidate;
  }

  const v = {
    name: str(body.name, existing.name) ?? existing.name,
    email,
    phone: str(body.phone, existing.phone),
    location: str(body.location, existing.location),
    about: str(body.about, existing.about),
    description: str(body.description, existing.description),
    contact_email: body.contact_email === undefined ? existing.contact_email : (body.contact_email ? String(body.contact_email).toLowerCase().trim() : null),
    logo_url: body.logo_url === undefined ? existing.logo_url : (body.logo_url || null),
    card_image: body.card_image === undefined ? existing.card_image : (body.card_image || null),
    banner_image: body.banner_image === undefined ? existing.banner_image : (body.banner_image || null),
    experience: num(body.experience, existing.experience),
    founded_year: body.founded_year === undefined ? existing.founded_year : (body.founded_year ? num(body.founded_year, 0) : null),
    rating: num(body.rating, existing.rating),
    reviews_count: num(body.reviews_count, existing.reviews_count),
    total_projects: num(body.total_projects, existing.total_projects),
    total_kw: num(body.total_kw, existing.total_kw),
    satisfaction_rate: num(body.satisfaction_rate, existing.satisfaction_rate),
    line_id: str(body.line_id, existing.line_id),
    response_time: str(body.response_time, existing.response_time),
    warranty_panel: str(body.warranty_panel, existing.warranty_panel) || '25 ปี',
    warranty_inverter: str(body.warranty_inverter, existing.warranty_inverter) || '10 ปี',
    warranty_workmanship: str(body.warranty_workmanship, existing.warranty_workmanship) || '2 ปี',
    services: jsonStr(body.services, existing.services),
    certifications: jsonStr(body.certifications, existing.certifications),
    projects: jsonStr(body.projects, existing.projects),
    service_provinces: jsonStr(body.service_provinces, existing.service_provinces),
    is_featured: body.is_featured === undefined ? existing.is_featured : (body.is_featured ? 1 : 0),
    featured_from: body.featured_from === undefined ? existing.featured_from : (body.featured_from || null),
    featured_until: body.featured_until === undefined ? existing.featured_until : (body.featured_until || null),
    youtube_url: body.youtube_url === undefined ? existing.youtube_url : (body.youtube_url ? String(body.youtube_url).trim() : null),
    tiktok_url: body.tiktok_url === undefined ? existing.tiktok_url : (body.tiktok_url ? String(body.tiktok_url).trim() : null),
    facebook_url: body.facebook_url === undefined ? existing.facebook_url : (body.facebook_url ? String(body.facebook_url).trim() : null),
    website_url: body.website_url === undefined ? existing.website_url : (body.website_url ? String(body.website_url).trim() : null),
    insurance_verified: body.insurance_verified === undefined ? Boolean(existing.insurance_verified_at) : Boolean(body.insurance_verified),
    insurance_expires_at: str(body.insurance_expires_at, existing.insurance_expires_at),
    insurance_provider: str(body.insurance_provider, existing.insurance_provider),
    insurance_policy_number: str(body.insurance_policy_number, existing.insurance_policy_number),
  };
  // Admin re-checks the "verified" checkbox every save — only stamp a fresh insurance_verified_at
  // the moment it flips from unchecked to checked, same idea as the standalone verified_at toggle.
  const insuranceVerifiedAt = v.insurance_verified ? (existing.insurance_verified_at ?? new Date().toISOString()) : null;

  await db.prepare(`
    UPDATE installers SET
      name=?, email=?, phone=?, location=?, about=?, description=?, contact_email=?,
      logo_url=?, card_image=?, banner_image=?,
      experience=?, founded_year=?, rating=?, reviews_count=?, total_projects=?, total_kw=?, satisfaction_rate=?,
      line_id=?, response_time=?,
      warranty_panel=?, warranty_inverter=?, warranty_workmanship=?,
      services=?, certifications=?, projects=?, service_provinces=?,
      is_featured=?, featured_from=?, featured_until=?,
      youtube_url=?, tiktok_url=?, facebook_url=?, website_url=?,
      insurance_verified_at=?, insurance_expires_at=?, insurance_provider=?, insurance_policy_number=?
    WHERE id=?
  `).run(
    v.name, v.email, v.phone, v.location, v.about, v.description, v.contact_email,
    v.logo_url, v.card_image, v.banner_image,
    v.experience, v.founded_year, v.rating, v.reviews_count, v.total_projects, v.total_kw, v.satisfaction_rate,
    v.line_id, v.response_time,
    v.warranty_panel, v.warranty_inverter, v.warranty_workmanship,
    v.services, v.certifications, v.projects, v.service_provinces,
    v.is_featured, v.featured_from, v.featured_until,
    v.youtube_url, v.tiktok_url, v.facebook_url, v.website_url,
    insuranceVerifiedAt, v.insurance_expires_at, v.insurance_provider, v.insurance_policy_number,
    id
  );

  return NextResponse.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' });
}
