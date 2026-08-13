'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Installer, Lead } from '@/types';

const THAI_PROVINCES = [
  'กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น',
  'จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่',
  'ตรัง','ตราด','ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช',
  'นครสวรรค์','นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี',
  'ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา','พะเยา','พังงา',
  'พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต','มหาสารคาม',
  'มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี',
  'ลพบุรี','ลำปาง','ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล',
  'สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี',
  'สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย','หนองบัวลำภู',
  'อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี',
];

interface Stats {
  totalLeads: number;
  newLeads: number;
  contacted: number;
  closed: number;
  profileViews: number;
  portfolioCount: number;
}

const LEAD_STATUS_MAP: Record<string, { label: string; color: string }> = {
  new:       { label: 'ใหม่',          color: '#3b82f6' },
  contacted: { label: 'ติดต่อแล้ว',   color: '#f59e0b' },
  closed:    { label: 'ปิดงานแล้ว',   color: '#10b981' },
};

export default function DashboardClient({
  installer,
  leads,
  stats,
  sessionId: _sessionId,
  siteLogo,
}: {
  installer: Installer;
  leads: Lead[];
  stats: Stats;
  sessionId: number;
  siteLogo: string | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'profile' | 'portfolio' | 'settings'>('overview');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: installer.name || '',
    phone: installer.phone || '',
    contact_email: installer.contact_email || '',
    line_id: installer.line_id || '',
    about: installer.about || '',
    youtube_url: installer.youtube_url || '',
    facebook_url: installer.facebook_url || '',
    tiktok_url: installer.tiktok_url || '',
    website_url: installer.website_url || '',
    service_provinces: (() => {
      try { return JSON.parse(installer.service_provinces || '[]') as string[]; }
      catch { return installer.location ? [installer.location] : []; }
    })(),
  });
  const [locationInput, setLocationInput] = useState('');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [mustChangePw, setMustChangePw] = useState(!!installer.must_change_password);
  const [gateForm, setGateForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [gateSaving, setGateSaving] = useState(false);
  const [gateError, setGateError] = useState('');
  const [portfolioPhotos, setPortfolioPhotos] = useState<{ id: number; photo_url: string; caption: string | null; created_at: string }[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    setPortfolioLoading(true);
    const res = await fetch('/api/installer/portfolio');
    const d = await res.json();
    if (d.success) setPortfolioPhotos(d.photos);
    setPortfolioLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'portfolio') fetchPortfolio();
  }, [activeTab, fetchPortfolio]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardImageInputRef = useRef<HTMLInputElement>(null);
  const bannerImageInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  function showAlert(type: 'success' | 'error', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  async function updateLeadStatus(leadId: number, status: string) {
    const res = await fetch(`/api/leads/${leadId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
  }

  async function saveProfile(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/installer/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...profileForm,
        location: profileForm.service_provinces.join(', '),
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.success) { showAlert('success', 'บันทึกโปรไฟล์สำเร็จ'); router.refresh(); }
    else showAlert('error', d.error || 'เกิดข้อผิดพลาด');
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    const res = await fetch('/api/installer/logo', { method: 'POST', body: fd });
    const d = await res.json();
    if (d.success) { showAlert('success', 'อัปโหลดโลโก้สำเร็จ'); router.refresh(); }
    else showAlert('error', d.error || 'อัปโหลดไม่สำเร็จ');
  }

  async function uploadCardImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('card_image', file);
    const res = await fetch('/api/installer/card-image', { method: 'POST', body: fd });
    const d = await res.json();
    if (d.success) { showAlert('success', 'อัปโหลดรูปการ์ดสำเร็จ'); router.refresh(); }
    else showAlert('error', d.error || 'อัปโหลดไม่สำเร็จ');
  }

  async function uploadBannerImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('banner_image', file);
    const res = await fetch('/api/installer/banner-image', { method: 'POST', body: fd });
    const d = await res.json();
    if (d.success) { showAlert('success', 'อัปโหลด Banner สำเร็จ'); router.refresh(); }
    else showAlert('error', d.error || 'อัปโหลดไม่สำเร็จ');
  }

  async function uploadPortfolio(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    let successCount = 0;
    let lastError = '';
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('photo', file);
      try {
        const res = await fetch('/api/installer/portfolio', { method: 'POST', body: fd });
        const d = await res.json();
        if (d.success) successCount++;
        else lastError = d.message || 'อัปโหลดไม่สำเร็จ';
      } catch {
        lastError = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
      }
    }
    e.target.value = '';
    if (successCount > 0) {
      showAlert('success', `อัปโหลดสำเร็จ ${successCount} รูป`);
      await fetchPortfolio();
      router.refresh();
    } else {
      showAlert('error', lastError);
    }
  }

  async function deletePortfolioPhoto(id: number) {
    const res = await fetch(`/api/installer/portfolio/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.success) { await fetchPortfolio(); router.refresh(); }
    else showAlert('error', d.message || 'ลบไม่สำเร็จ');
  }

  async function changePassword(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { showAlert('error', 'รหัสผ่านใหม่ไม่ตรงกัน'); return; }
    if (pwForm.newPassword.length < 8) { showAlert('error', 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return; }
    const res = await fetch('/api/installer/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    });
    const d = await res.json();
    if (d.success) { showAlert('success', 'เปลี่ยนรหัสผ่านสำเร็จ'); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
    else showAlert('error', d.error || 'เกิดข้อผิดพลาด');
  }

  async function submitGateChange(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setGateError('');
    if (gateForm.newPassword !== gateForm.confirmPassword) { setGateError('รหัสผ่านใหม่ไม่ตรงกัน'); return; }
    if (gateForm.newPassword.length < 8) { setGateError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return; }
    setGateSaving(true);
    const res = await fetch('/api/installer/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: gateForm.currentPassword, newPassword: gateForm.newPassword }),
    });
    const d = await res.json();
    setGateSaving(false);
    if (d.success) {
      setMustChangePw(false);
      router.refresh();
    } else {
      setGateError(d.message || d.error || 'เกิดข้อผิดพลาด');
    }
  }

  if (mustChangePw) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg-alt)' }}>
        <div className="card p-8 w-full max-w-sm">
          <h1 className="font-bold text-lg mb-1">🔒 ตั้งรหัสผ่านใหม่</h1>
          <p className="text-sm text-[var(--color-muted)] mb-5">บัญชีนี้ถูกส่งมอบให้คุณ กรุณาตั้งรหัสผ่านใหม่ก่อนเข้าใช้งาน Dashboard</p>
          {gateError && <div className="alert alert-error mb-4"><span>⚠️</span> {gateError}</div>}
          <form onSubmit={submitGateChange} className="space-y-4">
            <div className="form-group">
              <label className="form-label">รหัสผ่านชั่วคราว (จากอีเมล)</label>
              <input type="password" className="form-input" value={gateForm.currentPassword}
                onChange={(e) => setGateForm((f) => ({ ...f, currentPassword: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</label>
              <input type="password" className="form-input" value={gateForm.newPassword}
                onChange={(e) => setGateForm((f) => ({ ...f, newPassword: e.target.value }))} required minLength={8} />
            </div>
            <div className="form-group">
              <label className="form-label">ยืนยันรหัสผ่านใหม่</label>
              <input type="password" className="form-input" value={gateForm.confirmPassword}
                onChange={(e) => setGateForm((f) => ({ ...f, confirmPassword: e.target.value }))} required minLength={8} />
            </div>
            <button type="submit" disabled={gateSaving} className="btn btn-primary w-full">
              {gateSaving ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const TABS: { key: 'overview' | 'leads' | 'profile' | 'portfolio' | 'settings'; icon: React.ReactNode; label: string }[] = [
    {
      key: 'overview', label: 'ภาพรวม',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>,
    },
    {
      key: 'leads', label: 'ลูกค้า',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>,
    },
    {
      key: 'profile', label: 'โปรไฟล์',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>,
    },
    {
      key: 'portfolio', label: 'ผลงาน',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>,
    },
    {
      key: 'settings', label: 'ตั้งค่า',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>,
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="text-white py-6" style={{ background: 'linear-gradient(135deg, var(--color-bg-dark) 0%, var(--color-primary) 100%)' }}>
        <div className="container mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            {(installer.logo_url || siteLogo) ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 ring-2 ring-white/30">
                <img src={installer.logo_url || siteLogo!} alt={installer.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-white/15 flex-shrink-0 ring-2 ring-white/30 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white/60">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>แดชบอร์ด</p>
              <h1 className="text-xl font-bold leading-tight" style={{ color: '#ffffff' }}>{installer.name}</h1>
            </div>
          </div>
          <Link href={`/installers/${installer.id}`} className="btn btn-sm bg-white/15 border-white/30 text-white hover:bg-white/25 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg> ดูโปรไฟล์
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Alert */}
        {alert && (
          <div className={`alert mb-4 ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{alert.type === 'success' ? '✅' : '⚠️'}</span> {alert.msg}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar tabs */}
          <aside className="lg:w-52 flex-shrink-0">
            <nav className="card p-2 flex lg:flex-col gap-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
                    activeTab === t.key ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-blue-50 text-[var(--color-text)]'
                  }`}
                >
                  <span>{t.icon}</span> {t.label}
                  {t.key === 'leads' && stats.newLeads > 0 && (
                    <span className="ml-auto badge" style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                      {stats.newLeads}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">

            {/* ── Overview ── */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {([
                    {
                      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>,
                      label: 'ลูกค้าใหม่', val: stats.newLeads, color: '#3b82f6',
                    },
                    {
                      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>,
                      label: 'ลูกค้าทั้งหมด', val: stats.totalLeads, color: '#8b5cf6',
                    },
                    {
                      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
                      label: 'ปิดงานแล้ว', val: stats.closed, color: '#10b981',
                    },
                    {
                      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>,
                      label: 'ดูโปรไฟล์', val: stats.profileViews, color: '#f59e0b',
                    },
                    {
                      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>,
                      label: 'รูปผลงาน', val: stats.portfolioCount, color: '#ec4899',
                    },
                    {
                      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>,
                      label: 'Rating', val: installer.rating, color: '#f59e0b',
                    },
                  ] as { icon: React.ReactNode; label: string; val: number | string | null; color: string }[]).map((s) => (
                    <div key={s.label} className="card p-4 text-center">
                      <div className="flex justify-center mb-2" style={{ color: s.color }}>{s.icon}</div>
                      <div className="text-2xl font-bold" style={{ color: s.color }}>{s.val ?? 0}</div>
                      <div className="text-xs text-[var(--color-muted)]">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Status indicator */}
                <div className="card p-4 flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${installer.status === 'active' ? 'bg-green-500' : installer.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <div>
                    <div className="text-sm font-medium">
                      สถานะบัญชี: {installer.status === 'active' ? 'เปิดใช้งาน ✅' : installer.status === 'pending' ? 'รอการอนุมัติ ⏳' : 'ถูกระงับ ❌'}
                    </div>
                    {installer.status === 'pending' && (
                      <div className="text-xs text-[var(--color-muted)]">บัญชีกำลังรอการตรวจสอบจาก Admin</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Leads ── */}
            {activeTab === 'leads' && (
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border)] font-bold">ลูกค้าที่เข้ามา ({leads.length})</div>
                {leads.length === 0 ? (
                  <div className="p-8 text-center text-[var(--color-muted)] text-sm">ยังไม่มีลูกค้า</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                          <th className="text-left px-4 py-3">ชื่อ</th>
                          <th className="text-left px-4 py-3">จังหวัด</th>
                          <th className="text-left px-4 py-3">วันที่</th>
                          <th className="text-left px-4 py-3">สถานะ</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map((lead) => {
                          const st = LEAD_STATUS_MAP[lead.status] ?? { label: lead.status, color: '#666' };
                          return (
                            <tr key={lead.id} className="border-t border-[var(--color-border)] hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium">{lead.name}</div>
                                <div className="text-xs text-[var(--color-muted)]">{lead.email}</div>
                              </td>
                              <td className="px-4 py-3 text-[var(--color-muted)]">{lead.province}</td>
                              <td className="px-4 py-3 text-[var(--color-muted)] text-xs whitespace-nowrap">
                                {new Date(lead.created_at).toLocaleDateString('th-TH')}
                              </td>
                              <td className="px-4 py-3">
                                <span className="badge" style={{ background: `${st.color}20`, color: st.color }}>{st.label}</span>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  className="text-xs border border-[var(--color-border)] rounded px-2 py-1"
                                  value={lead.status}
                                  onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                                >
                                  <option value="new">ใหม่</option>
                                  <option value="contacted">ติดต่อแล้ว</option>
                                  <option value="closed">ปิดงาน</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Profile ── */}
            {activeTab === 'profile' && (
              <div className="card p-6">
                {/* Logo */}
                {/* 1. Company Logo */}
                <div className="mb-5">
                  <div className="text-sm font-semibold mb-2">1. โลโก้บริษัท</div>
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {installer.logo_url ? (
                        <Image src={installer.logo_url} alt="logo" fill className="object-contain" sizes="64px" unoptimized />
                      ) : <span className="text-3xl">🏢</span>}
                    </div>
                    <div>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
                      <button onClick={() => fileInputRef.current?.click()} className="btn btn-outline btn-sm">
                        📷 อัปโหลดโลโก้
                      </button>
                      <p className="text-xs text-[var(--color-muted)] mt-1">แสดงที่ header หน้ารายละเอียด · JPG/PNG สูงสุด 2MB</p>
                    </div>
                  </div>
                </div>

                {/* 2. Card Image */}
                <div className="mb-5">
                  <div className="text-sm font-semibold mb-2">2. รูปการ์ด (หน้ารายการผู้ติดตั้ง)</div>
                  <div className="flex items-start gap-4">
                    <div className="relative w-24 h-16 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {installer.card_image ? (
                        <Image src={installer.card_image} alt="card" fill className="object-cover" sizes="96px" unoptimized />
                      ) : <span className="text-2xl opacity-40">🖼️</span>}
                    </div>
                    <div>
                      <input ref={cardImageInputRef} type="file" accept="image/*" className="hidden" onChange={uploadCardImage} />
                      <button onClick={() => cardImageInputRef.current?.click()} className="btn btn-outline btn-sm">
                        🖼️ อัปโหลดรูปการ์ด
                      </button>
                      <p className="text-xs text-[var(--color-muted)] mt-1">แสดงในการ์ดหน้ารายการ · แนะนำ 16:9 · สูงสุด 3MB</p>
                    </div>
                  </div>
                </div>

                {/* 3. Banner Image */}
                <div className="mb-6">
                  <div className="text-sm font-semibold mb-2">3. รูป Banner หน้ารายละเอียด</div>
                  <div className="flex items-start gap-4">
                    <div className="relative w-32 h-16 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {installer.banner_image ? (
                        <Image src={installer.banner_image} alt="banner" fill className="object-cover" sizes="128px" unoptimized />
                      ) : <span className="text-2xl opacity-40">🏞️</span>}
                    </div>
                    <div>
                      <input ref={bannerImageInputRef} type="file" accept="image/*" className="hidden" onChange={uploadBannerImage} />
                      <button onClick={() => bannerImageInputRef.current?.click()} className="btn btn-outline btn-sm">
                        🏞️ อัปโหลด Banner
                      </button>
                      <p className="text-xs text-[var(--color-muted)] mt-1">พื้นหลัง Hero บนหน้ารายละเอียด · แนะนำ 1920×400 · สูงสุด 5MB</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={saveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">ชื่อบริษัท</label>
                      <input type="text" className="form-input" value={profileForm.name} onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">เบอร์โทร</label>
                      <input type="tel" className="form-input" value={profileForm.phone} onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">อีเมลติดต่อ</label>
                      <div className="relative">
                        <input
                          type="email"
                          className="form-input pr-10"
                          placeholder="contact@example.com"
                          value={profileForm.contact_email}
                          onChange={(e) => setProfileForm(f => ({ ...f, contact_email: e.target.value }))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-muted)] mt-1">จะแสดงเป็นช่องทางติดต่อบนหน้าโปรไฟล์</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Line ID</label>
                      <div className="relative">
                        <input
                          type="text"
                          className="form-input pr-10"
                          placeholder="@yourline"
                          value={profileForm.line_id}
                          onChange={(e) => setProfileForm(f => ({ ...f, line_id: e.target.value }))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-muted)] mt-1">จะแสดงเป็นปุ่ม "ติดต่อผ่าน Line" บนหน้าโปรไฟล์</p>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">พื้นที่บริการ</label>
                    {profileForm.service_provinces.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {profileForm.service_provinces.map((p) => (
                          <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            📍 {p}
                            <button
                              type="button"
                              onClick={() => setProfileForm(f => ({ ...f, service_provinces: f.service_provinces.filter(x => x !== p) }))}
                              className="ml-0.5 text-blue-500 hover:text-red-500 leading-none"
                            >×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="relative">
                      <input
                        type="text"
                        className="form-input w-full"
                        placeholder="ค้นหาจังหวัด หรือพิมพ์ชื่ออำเภอ/ตำบล แล้วกด Enter"
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const v = locationInput.trim();
                            if (v && !profileForm.service_provinces.includes(v)) {
                              setProfileForm(f => ({ ...f, service_provinces: [...f.service_provinces, v] }));
                            }
                            setLocationInput('');
                          } else if (e.key === 'Escape') {
                            setLocationInput('');
                          }
                        }}
                      />
                      {locationInput.trim().length > 0 && (() => {
                        const q = locationInput.trim().toLowerCase();
                        const matches = THAI_PROVINCES.filter(p =>
                          p.toLowerCase().includes(q) && !profileForm.service_provinces.includes(p)
                        );
                        if (matches.length === 0) return null;
                        return (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow-lg max-h-52 overflow-y-auto">
                            {matches.map((p) => (
                              <button
                                key={p}
                                type="button"
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setProfileForm(f => ({ ...f, service_provinces: [...f.service_provinces, p] }));
                                  setLocationInput('');
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-blue-500 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                                {p}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-[var(--color-muted)] mt-1">เลือกจังหวัดจากรายการ หรือพิมพ์ชื่ออำเภอ/ตำบลแล้วกด Enter เพื่อเพิ่ม</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">เกี่ยวกับบริษัท</label>
                    <textarea className="form-input" rows={4} value={profileForm.about} onChange={(e) => setProfileForm(f => ({ ...f, about: e.target.value }))} style={{ resize: 'vertical' }} />
                  </div>
                  {/* Social URLs */}
                  <div className="divider" />
                  <div className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>
                    Social Media & เว็บไซต์
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {([
                      {
                        key: 'youtube_url', label: 'YouTube URL', color: '#ff0000',
                        icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
                      },
                      {
                        key: 'facebook_url', label: 'Facebook URL', color: '#1877f2',
                        icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
                      },
                      {
                        key: 'tiktok_url', label: 'TikTok URL', color: '#000000',
                        icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
                      },
                      {
                        key: 'website_url', label: 'Website URL', color: '#6366f1',
                        icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>,
                      },
                    ] as { key: string; label: string; color: string; icon: React.ReactNode }[]).map((f) => (
                      <div key={f.key} className="form-group">
                        <label className="form-label flex items-center gap-1.5">
                          <span style={{ color: f.color }}>{f.icon}</span>{f.label}
                        </label>
                        <input
                          type="url"
                          className="form-input"
                          placeholder="https://..."
                          value={(profileForm as unknown as Record<string, string>)[f.key]}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  <button type="submit" disabled={saving} className="btn btn-primary">
                    {saving ? (
                      <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 animate-spin inline-block mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>กำลังบันทึก...</>
                    ) : (
                      <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline-block mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>บันทึก</>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ── Portfolio ── */}
            {activeTab === 'portfolio' && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">รูปผลงาน ({portfolioPhotos.length}/20)</h2>
                  <div>
                    <input ref={portfolioInputRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadPortfolio} />
                    <button
                      onClick={() => portfolioInputRef.current?.click()}
                      disabled={portfolioLoading}
                      className="btn btn-primary btn-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline-block mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                      อัปโหลดรูป
                    </button>
                  </div>
                </div>

                {portfolioLoading ? (
                  <div className="py-10 text-center text-[var(--color-muted)] text-sm">กำลังโหลด...</div>
                ) : portfolioPhotos.length === 0 ? (
                  <div className="py-10 text-center text-[var(--color-muted)] text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto mb-2 opacity-30"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                    ยังไม่มีรูปผลงาน กดปุ่มอัปโหลดเพื่อเพิ่มรูป
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {portfolioPhotos.map((photo) => (
                      <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                        <img src={photo.photo_url} alt={photo.caption || 'ผลงาน'} className="w-full h-full object-cover" />
                        <button
                          onClick={() => deletePortfolioPhoto(photo.id)}
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                          title="ลบรูป"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-[var(--color-muted)] mt-4">
                  รูปผลงานจะแสดงใน <Link href={`/installers/${installer.id}`} className="underline hover:text-[var(--color-primary)]">หน้าโปรไฟล์ของคุณ</Link> · อัปโหลดได้สูงสุด 20 รูป · JPG/PNG ไม่เกิน 5MB
                </p>
              </div>
            )}

            {/* ── Settings ── */}
            {activeTab === 'settings' && (
              <div className="card p-6">
                {/* Login email — read only */}
                <div className="mb-6">
                  <h2 className="font-bold text-base mb-4">ข้อมูลบัญชี</h2>
                  <div className="form-group max-w-sm">
                    <label className="form-label">อีเมลสำหรับเข้าสู่ระบบ</label>
                    <div className="relative">
                      <input
                        type="email"
                        className="form-input pr-10 bg-gray-50 text-[var(--color-muted)] cursor-not-allowed"
                        value={installer.email}
                        readOnly
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-muted)] mt-1">ใช้อีเมลนี้เพื่อเข้าสู่ระบบ ไม่สามารถแก้ไขได้</p>
                  </div>
                </div>
                <div className="divider" />
                <h2 className="font-bold text-base mb-5">เปลี่ยนรหัสผ่าน</h2>
                <form onSubmit={changePassword} className="space-y-4 max-w-sm">
                  {[
                    { key: 'currentPassword', label: 'รหัสผ่านปัจจุบัน' },
                    { key: 'newPassword',     label: 'รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)' },
                    { key: 'confirmPassword', label: 'ยืนยันรหัสผ่านใหม่' },
                  ].map((f) => (
                    <div key={f.key} className="form-group">
                      <label className="form-label">{f.label}</label>
                      <input
                        type="password"
                        className="form-input"
                        value={(pwForm as Record<string, string>)[f.key]}
                        onChange={(e) => setPwForm((p) => ({ ...p, [f.key]: e.target.value }))}
                        required
                        minLength={f.key !== 'currentPassword' ? 8 : undefined}
                      />
                    </div>
                  ))}
                  <button type="submit" className="btn btn-primary">เปลี่ยนรหัสผ่าน</button>
                </form>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
