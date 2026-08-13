'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ImageUrlOrFileField } from '../../BlogFormFields';
import type { Installer } from '@/types';

// Most real installer rows store this as plain text (bulk-imported), not a JSON array like the
// Dashboard/original demo rows use — fall back to the raw text as-is so the editor never silently
// blanks (and a save never silently wipes) real content just because it isn't valid JSON.
function safeJoin(raw: string | null, sep = '\n'): string {
  if (!raw) return '';
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return (arr as string[]).join(sep);
  } catch { /* not JSON — show the raw text unchanged */ }
  return raw;
}

function projectsToText(raw: string | null): string {
  if (!raw) return '';
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return (arr as { name: string; savings: string }[]).map((p) => `${p.name} | ${p.savings || ''}`).join('\n');
  } catch { /* not JSON — show the raw text unchanged */ }
  return raw;
}

export default function EditInstallerClient({ installer }: { installer: Installer }) {
  const router = useRouter();
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: installer.name || '',
    email: installer.email || '',
    phone: installer.phone || '',
    contact_email: installer.contact_email || '',
    line_id: installer.line_id || '',
    service_provinces: safeJoin(installer.service_provinces, ', ') || installer.location || '',
    description: installer.description || '',
    about: installer.about || '',
    logo_url: installer.logo_url || '',
    card_image: installer.card_image || '',
    banner_image: installer.banner_image || '',
    experience: String(installer.experience ?? 0),
    founded_year: installer.founded_year ? String(installer.founded_year) : '',
    rating: String(installer.rating ?? 0),
    reviews_count: String(installer.reviews_count ?? 0),
    total_projects: String(installer.total_projects ?? 0),
    total_kw: String(installer.total_kw ?? 0),
    satisfaction_rate: String(installer.satisfaction_rate ?? 0),
    response_time: installer.response_time || '',
    warranty_panel: installer.warranty_panel || '25 ปี',
    warranty_inverter: installer.warranty_inverter || '10 ปี',
    warranty_workmanship: installer.warranty_workmanship || '2 ปี',
    services: safeJoin(installer.services),
    certifications: safeJoin(installer.certifications),
    projects: projectsToText(installer.projects),
    youtube_url: installer.youtube_url || '',
    tiktok_url: installer.tiktok_url || '',
    facebook_url: installer.facebook_url || '',
    website_url: installer.website_url || '',
    is_featured: !!installer.is_featured,
    featured_from: installer.featured_from ? String(installer.featured_from).slice(0, 10) : '',
    featured_until: installer.featured_until ? String(installer.featured_until).slice(0, 10) : '',
  });

  function showAlert(type: 'success' | 'error', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      showAlert('error', 'กรุณากรอกชื่อบริษัทและอีเมลให้ครบ');
      return;
    }
    setSaving(true);

    const services = JSON.stringify(form.services.split('\n').map((s) => s.trim()).filter(Boolean));
    const certifications = JSON.stringify(form.certifications.split('\n').map((s) => s.trim()).filter(Boolean));
    const projects = JSON.stringify(
      form.projects.split('\n').map((line) => {
        const [name, savings] = line.split('|').map((s) => s.trim());
        return { name: name || '', savings: savings || '' };
      }).filter((p) => p.name)
    );
    const service_provinces = JSON.stringify(form.service_provinces.split(',').map((s) => s.trim()).filter(Boolean));
    // Single field drives both the card label and the search index — keep them identical to avoid drift.
    const location = form.service_provinces;

    const res = await fetch(`/api/admin/installers/${installer.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        services,
        certifications,
        projects,
        service_provinces,
        location,
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.success) {
      router.push('/admin?tab=installers');
      router.refresh();
    } else {
      showAlert('error', d.message || 'บันทึกไม่สำเร็จ');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <nav className="text-sm text-[var(--color-muted)] mb-4">
          <Link href="/admin?tab=installers" className="hover:text-[var(--color-primary)]">Admin</Link>
          <span className="mx-1">›</span>
          <Link href="/admin?tab=installers" className="hover:text-[var(--color-primary)]">ผู้ติดตั้ง</Link>
          <span className="mx-1">›</span>
          <span>แก้ไข</span>
        </nav>

        {alert && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {alert.msg}
          </div>
        )}

        <div className="card-static w-full p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-lg">✏️ แก้ไขข้อมูลผู้ติดตั้ง</h1>
            <Link href="/admin?tab=installers" className="btn btn-ghost btn-sm">✕ ปิด</Link>
          </div>

          {/* ข้อมูลทั่วไป */}
          <section>
            <h2 className="font-semibold text-sm mb-3 text-[var(--color-muted)]">ข้อมูลทั่วไป</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">ชื่อบริษัท *</label>
                <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">อีเมล Login *</label>
                <input type="email" className="form-input" value={form.email} onChange={(e) => set('email', e.target.value)} />
                <p className="form-hint">ใช้ "ส่งมอบบัญชี" แทนหากต้องการโอนสิทธิ์พร้อมส่งรหัสผ่านใหม่</p>
              </div>
              <div className="form-group">
                <label className="form-label">เบอร์โทร</label>
                <input className="form-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">อีเมลติดต่อ (แสดงสาธารณะ)</label>
                <input type="email" className="form-input" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Line ID</label>
                <input className="form-input" value={form.line_id} onChange={(e) => set('line_id', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">เวลาตอบกลับ</label>
                <input className="form-input" value={form.response_time} onChange={(e) => set('response_time', e.target.value)} placeholder="ภายใน 2 ชั่วโมง" />
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">พื้นที่ให้บริการ (คั่นด้วยจุลภาค)</label>
                <input className="form-input" value={form.service_provinces} onChange={(e) => set('service_provinces', e.target.value)} placeholder="กรุงเทพฯ, นนทบุรี, ปทุมธานี" />
                <p className="form-hint">ใช้ทั้งแสดงในการ์ดและค้นหาบนหน้ารายชื่อผู้ติดตั้ง</p>
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">คำอธิบายสั้น</label>
                <input className="form-input" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="ชื่อ | พื้นที่" />
              </div>
              <div className="form-group md:col-span-2">
                <label className="form-label">เกี่ยวกับบริษัท</label>
                <textarea className="form-input" rows={3} value={form.about} onChange={(e) => set('about', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
          </section>

          {/* รูปภาพ */}
          <section>
            <h2 className="font-semibold text-sm mb-3 text-[var(--color-muted)]">รูปภาพ</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ImageUrlOrFileField label="โลโก้บริษัท" subdir="installers" value={form.logo_url} onChange={(url) => set('logo_url', url)} />
              <ImageUrlOrFileField label="รูปการ์ด (หน้ารายการ)" subdir="installers" value={form.card_image} onChange={(url) => set('card_image', url)} />
              <ImageUrlOrFileField label="รูป Banner (หน้ารายละเอียด)" subdir="installers" value={form.banner_image} onChange={(url) => set('banner_image', url)} />
            </div>
          </section>

          {/* สถิติบริษัท */}
          <section>
            <h2 className="font-semibold text-sm mb-3 text-[var(--color-muted)]">สถิติบริษัท</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="form-group">
                <label className="form-label">ปีประสบการณ์</label>
                <input type="number" className="form-input" value={form.experience} onChange={(e) => set('experience', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">ปีก่อตั้ง</label>
                <input type="number" className="form-input" value={form.founded_year} onChange={(e) => set('founded_year', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Rating (0–5)</label>
                <input type="number" step="0.1" min="0" max="5" className="form-input" value={form.rating} onChange={(e) => set('rating', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">จำนวนรีวิว</label>
                <input type="number" className="form-input" value={form.reviews_count} onChange={(e) => set('reviews_count', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">โครงการที่ผ่านมา</label>
                <input type="number" className="form-input" value={form.total_projects} onChange={(e) => set('total_projects', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">kW ติดตั้งสะสม</label>
                <input type="number" className="form-input" value={form.total_kw} onChange={(e) => set('total_kw', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">% ลูกค้าพึงพอใจ</label>
                <input type="number" className="form-input" value={form.satisfaction_rate} onChange={(e) => set('satisfaction_rate', e.target.value)} />
              </div>
            </div>
          </section>

          {/* การรับประกัน */}
          <section>
            <h2 className="font-semibold text-sm mb-3 text-[var(--color-muted)]">การรับประกัน</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">แผงโซลาร์</label>
                <input className="form-input" value={form.warranty_panel} onChange={(e) => set('warranty_panel', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">อินเวอร์เตอร์</label>
                <input className="form-input" value={form.warranty_inverter} onChange={(e) => set('warranty_inverter', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">งานติดตั้ง</label>
                <input className="form-input" value={form.warranty_workmanship} onChange={(e) => set('warranty_workmanship', e.target.value)} />
              </div>
            </div>
          </section>

          {/* บริการ / ใบรับรอง / โครงการ */}
          <section>
            <h2 className="font-semibold text-sm mb-3 text-[var(--color-muted)]">บริการ / ใบรับรอง / โครงการอ้างอิง</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">บริการ (บรรทัดละ 1 รายการ)</label>
                <textarea className="form-input" rows={5} value={form.services} onChange={(e) => set('services', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="form-label">ใบรับรอง (บรรทัดละ 1 รายการ)</label>
                <textarea className="form-input" rows={5} value={form.certifications} onChange={(e) => set('certifications', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="form-label">โครงการ (รูปแบบ: ชื่อ | ผลประหยัด)</label>
                <textarea className="form-input" rows={5} value={form.projects} onChange={(e) => set('projects', e.target.value)} placeholder={'บ้านคุณสมชาย | ประหยัด 3,000/เดือน'} style={{ resize: 'vertical' }} />
              </div>
            </div>
          </section>

          {/* Social & เว็บไซต์ */}
          <section>
            <h2 className="font-semibold text-sm mb-3 text-[var(--color-muted)]">Social Media & เว็บไซต์</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">YouTube URL</label>
                <input type="url" className="form-input" value={form.youtube_url} onChange={(e) => set('youtube_url', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Facebook URL</label>
                <input type="url" className="form-input" value={form.facebook_url} onChange={(e) => set('facebook_url', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">TikTok URL</label>
                <input type="url" className="form-input" value={form.tiktok_url} onChange={(e) => set('tiktok_url', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Website URL</label>
                <input type="url" className="form-input" value={form.website_url} onChange={(e) => set('website_url', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Featured */}
          <section>
            <h2 className="font-semibold text-sm mb-3 text-[var(--color-muted)]">Featured</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} />
                ⭐ แสดงเป็น Featured
              </label>
              <div className="form-group">
                <label className="form-label">Featured จากวันที่</label>
                <input type="date" className="form-input" value={form.featured_from} onChange={(e) => set('featured_from', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Featured ถึงวันที่</label>
                <input type="date" className="form-input" value={form.featured_until} onChange={(e) => set('featured_until', e.target.value)} />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
            <Link href="/admin?tab=installers" className="btn btn-ghost btn-sm">ยกเลิก</Link>
            <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleSave}>
              {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกข้อมูล'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
