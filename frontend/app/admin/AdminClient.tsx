'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import MilestonePaymentTab from './MilestonePaymentTab';
import LineSettingsTab from './LineSettingsTab';
import AffiliateTab from './AffiliateTab';

type Tab = 'overview' | 'installers' | 'reviews' | 'leads' | 'blogs' | 'messages' | 'content' | 'terms' | 'settings' | 'oauth' | 'milestones' | 'line' | 'affiliate';

const TAB_KEYS: Tab[] = ['overview', 'installers', 'reviews', 'leads', 'blogs', 'messages', 'content', 'terms', 'settings', 'oauth', 'milestones', 'line', 'affiliate'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminClient({ data }: { data: Record<string, any> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'overview');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [instSearch, setInstSearch] = useState('');
  const [instStatus, setInstStatus] = useState('');
  const [instRating, setInstRating] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatus, setLeadStatus] = useState('');
  const [leadInstaller, setLeadInstaller] = useState('');
  const [claimModal, setClaimModal] = useState<{ open: boolean; id: number | null; name: string; currentEmail: string }>({ open: false, id: null, name: '', currentEmail: '' });
  const [claimEmail, setClaimEmail] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);

  function showAlert(type: 'success' | 'error', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  function openClaimModal(inst: Record<string, unknown>) {
    setClaimModal({ open: true, id: inst.id as number, name: inst.name as string, currentEmail: inst.email as string });
    setClaimEmail('');
  }

  function closeClaimModal() {
    setClaimModal({ open: false, id: null, name: '', currentEmail: '' });
  }

  async function submitClaim() {
    if (!claimModal.id) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claimEmail)) {
      showAlert('error', 'กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }
    setClaimLoading(true);
    const res = await fetch(`/api/admin/installers/${claimModal.id}/claim`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: claimEmail }),
    });
    const d = await res.json();
    setClaimLoading(false);
    if (d.success) {
      showAlert('success', d.message || 'ส่งข้อมูลเข้าสู่ระบบแล้ว');
      closeClaimModal();
      router.refresh();
    } else {
      showAlert('error', d.error || 'เกิดข้อผิดพลาด');
    }
  }

  async function api(url: string, method = 'GET', body?: object) {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await res.json();
    if (d.success) router.refresh();
    else showAlert('error', d.error || 'เกิดข้อผิดพลาด');
    return d;
  }

  const TABS: { key: Tab; icon: string; label: string; badge?: number }[] = [
    { key: 'overview',    icon: '📊', label: 'ภาพรวม' },
    { key: 'installers',  icon: '🏢', label: 'ผู้ติดตั้ง', badge: data.stats.pendingInstallers },
    { key: 'reviews',     icon: '⭐', label: 'รีวิว',     badge: data.stats.pendingReviews },
    { key: 'leads',       icon: '📬', label: 'Lead',      badge: data.stats.newLeads },
    { key: 'blogs',       icon: '📰', label: 'บทความ' },
    { key: 'messages',    icon: '✉️', label: 'ข้อความ',  badge: data.stats.newMessages },
    { key: 'content',     icon: '🎨', label: 'Content' },
    { key: 'terms',       icon: '📋', label: 'Terms & Policy' },
    { key: 'settings',    icon: '⚙️', label: 'ตั้งค่า' },
    { key: 'oauth',       icon: '🔗', label: 'Social Login' },
    { key: 'milestones',  icon: '💳', label: 'ผ่อนชำระ', badge: data.stats.openDisputes },
    { key: 'line',        icon: '📱', label: 'LINE OA' },
    { key: 'affiliate',   icon: '🤝', label: 'Affiliate' },
  ];

  const filteredInstallers = (data.installers as Record<string, unknown>[]).filter((inst) => {
    const q = instSearch.toLowerCase();
    if (q && ![inst.name, inst.email, inst.location].some((v) => (v as string || '').toLowerCase().includes(q))) return false;
    if (instStatus && inst.status !== instStatus) return false;
    if (instRating) {
      const r = Number(inst.rating) || 0;
      if (instRating === '4') return r >= 4;
      if (instRating === '3') return r >= 3 && r < 4;
      if (instRating === '2') return r >= 2 && r < 3;
      if (instRating === '1') return r < 2;
    }
    return true;
  });

  const leads = data.leads as Record<string, unknown>[];
  const leadInstallerNames = [...new Set(leads.map((l) => l.installer_name as string).filter(Boolean))];
  const filteredLeads = leads.filter((l) => {
    const q = leadSearch.toLowerCase();
    if (q && ![(l.name as string || ''), (l.email as string || ''), (l.province as string || '')].some((v) => v.toLowerCase().includes(q))) return false;
    if (leadStatus && l.status !== leadStatus) return false;
    if (leadInstaller && l.installer_name !== leadInstaller) return false;
    return true;
  });

  return (
    <>
      {/* Header */}
      <div className="text-white py-5" style={{ background: 'linear-gradient(135deg, var(--color-bg-dark) 0%, var(--color-primary) 100%)' }}>
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">⚙️ Admin Panel</h1>
            <p className="text-white/70 text-sm">Solar Thani</p>
          </div>
          <Link href="/" className="btn btn-sm bg-white/15 border-white/30 text-white hover:bg-white/25">← หน้าแรก</Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-5">
        {alert && (
          <div className={`alert mb-4 ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{alert.type === 'success' ? '✅' : '⚠️'}</span> {alert.msg}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Sidebar */}
          <aside className="lg:w-52 flex-shrink-0">
            <nav className="card p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setActiveTab(t.key); router.replace(`/admin?tab=${t.key}`, { scroll: false }); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap w-full text-left ${
                    activeTab === t.key ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-blue-50 text-[var(--color-text)]'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span className="flex-1">{t.label}</span>
                  {(t.badge ?? 0) > 0 && (
                    <span className="badge" style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>{t.badge}</span>
                  )}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">

            {/* ── Overview ── */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: '🏢', label: 'ผู้ติดตั้ง (Active)',  val: data.stats.activeInstallers,  color: '#3b82f6' },
                  { icon: '⏳', label: 'รอ Approve',           val: data.stats.pendingInstallers, color: '#f59e0b' },
                  { icon: '📬', label: 'Lead ทั้งหมด',         val: data.stats.totalLeads,        color: '#8b5cf6' },
                  { icon: '📬', label: 'Lead ใหม่',            val: data.stats.newLeads,          color: '#ef4444' },
                  { icon: '⭐', label: 'รีวิวรอ Approve',      val: data.stats.pendingReviews,    color: '#f59e0b' },
                  { icon: '✅', label: 'รีวิว Active',         val: data.stats.activeReviews,     color: '#10b981' },
                  { icon: '📰', label: 'บทความที่ตีพิมพ์',    val: data.stats.publishedBlogs,    color: '#0262EC' },
                  { icon: '✉️', label: 'ข้อความใหม่',         val: data.stats.newMessages,       color: '#ec4899' },
                ].map((s) => (
                  <div key={s.label} className="card p-4 text-center">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-2xl font-bold" style={{ color: s.color }}>{s.val ?? 0}</div>
                    <div className="text-xs text-[var(--color-muted)]">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Installers ── */}
            {activeTab === 'installers' && (
              <div className="card overflow-hidden">
                {/* Header + Filters */}
                <div className="p-4 border-b border-[var(--color-border)]">
                  <div className="font-bold mb-3">
                    ผู้ติดตั้ง {filteredInstallers.length !== data.installers.length ? `${filteredInstallers.length} / ${data.installers.length}` : `(${data.installers.length})`}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <input
                      type="text"
                      className="form-input py-1.5 text-sm"
                      style={{ minWidth: 200, flex: '1 1 200px' }}
                      placeholder="🔍 ค้นหาชื่อ / อีเมล / พื้นที่..."
                      value={instSearch}
                      onChange={(e) => setInstSearch(e.target.value)}
                    />
                    {/* Status filter */}
                    <select
                      className="form-input py-1.5 text-sm"
                      style={{ width: 'auto', minWidth: 130 }}
                      value={instStatus}
                      onChange={(e) => setInstStatus(e.target.value)}
                    >
                      <option value="">สถานะทั้งหมด</option>
                      <option value="active">Active</option>
                      <option value="pending">รออนุมัติ</option>
                      <option value="suspended">ระงับ</option>
                      <option value="rejected">ปฏิเสธ</option>
                    </select>
                    {/* Rating filter */}
                    <select
                      className="form-input py-1.5 text-sm"
                      style={{ width: 'auto', minWidth: 130 }}
                      value={instRating}
                      onChange={(e) => setInstRating(e.target.value)}
                    >
                      <option value="">Rating ทั้งหมด</option>
                      <option value="4">4 ดาวขึ้นไป</option>
                      <option value="3">3–4 ดาว</option>
                      <option value="2">2–3 ดาว</option>
                      <option value="1">ต่ำกว่า 2 ดาว</option>
                    </select>
                    {(instSearch || instStatus || instRating) && (
                      <button
                        className="btn btn-ghost btn-sm border border-[var(--color-border)] shrink-0"
                        onClick={() => { setInstSearch(''); setInstStatus(''); setInstRating(''); }}
                      >
                        ล้าง
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                        <th className="text-left px-4 py-3">ชื่อ / อีเมล</th>
                        <th className="text-left px-4 py-3">พื้นที่</th>
                        <th className="text-left px-4 py-3">สถานะ</th>
                        <th className="text-left px-4 py-3">ตรวจสอบแล้ว</th>
                        <th className="text-left px-4 py-3">ส่งมอบบัญชี</th>
                        <th className="text-left px-4 py-3">Rating</th>
                        <th className="px-4 py-3">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInstallers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-[var(--color-muted)] text-sm">ไม่พบรายการที่ตรงกัน</td>
                        </tr>
                      ) : filteredInstallers.map((inst) => (
                        <tr key={inst.id as number} className="border-t border-[var(--color-border)] hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium">{inst.name as string}</div>
                            <div className="text-xs text-[var(--color-muted)]">{inst.email as string}</div>
                          </td>
                          <td className="px-4 py-3 text-[var(--color-muted)] text-xs">{inst.location as string || '—'}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={inst.status as string} />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => api(`/api/admin/installers/${inst.id}/verify`, 'PUT')}
                              className={`tbadge ${inst.verified_at ? 'green' : 'gray'} cursor-pointer`}
                            >
                              {inst.verified_at ? '✓ ตรวจสอบแล้ว' : '○ ตรวจสอบแล้ว'}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="tbadge"
                              style={inst.claimed_at ? { background: '#d1fae5', color: '#065f46' } : { background: '#f3f4f6', color: '#6b7280' }}
                              title={inst.claimed_at ? `ส่งมอบล่าสุด: ${new Date(inst.claimed_at as string).toLocaleString('th-TH')}` : undefined}
                            >
                              {inst.claimed_at ? '✓ ส่งมอบแล้ว' : '○ ยังไม่ส่งมอบ'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">⭐ {inst.rating as number}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-center flex-wrap">
                              {inst.status === 'pending' && (
                                <button onClick={() => api(`/api/admin/installers/${inst.id}/approve`, 'PUT', { action: 'approve' })} className="btn btn-sm" style={{ background: '#10b981', color: '#fff', border: 'none' }}>อนุมัติ</button>
                              )}
                              {inst.status === 'active' && (
                                <button onClick={() => api(`/api/admin/installers/${inst.id}/approve`, 'PUT', { action: 'suspend' })} className="btn btn-sm" style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>ระงับ</button>
                              )}
                              {inst.status === 'suspended' && (
                                <button onClick={() => api(`/api/admin/installers/${inst.id}/approve`, 'PUT', { action: 'reactivate' })} className="btn btn-sm" style={{ background: '#3b82f6', color: '#fff', border: 'none' }}>เปิดอีกครั้ง</button>
                              )}
                              {inst.status === 'pending' && (
                                <button onClick={() => api(`/api/admin/installers/${inst.id}/approve`, 'PUT', { action: 'reject' })} className="btn btn-sm" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>ปฏิเสธ</button>
                              )}
                              <button onClick={() => openClaimModal(inst)} className="btn btn-sm" style={{ background: '#6366f1', color: '#fff', border: 'none' }}>
                                {inst.claimed_at ? 'ส่งมอบอีกครั้ง' : 'ส่งมอบบัญชี'}
                              </button>
                              <Link href={`/admin/installers/${inst.id}`} className="btn btn-sm btn-primary">✏️ แก้ไข</Link>
                              <Link href={`/installers/${inst.id}`} target="_blank" className="btn btn-outline btn-sm">ดู</Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Reviews ── */}
            {activeTab === 'reviews' && (
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border)] font-bold">รีวิวทั้งหมด ({data.reviews.length})</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                        <th className="text-left px-4 py-3">ผู้รีวิว</th>
                        <th className="text-left px-4 py-3">ผู้ติดตั้ง</th>
                        <th className="text-left px-4 py-3">คะแนน</th>
                        <th className="text-left px-4 py-3">สถานะ</th>
                        <th className="px-4 py-3">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.reviews.map((r: Record<string, unknown>) => (
                        <tr key={r.id as number} className="border-t border-[var(--color-border)] hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium">{r.reviewer_name as string}</div>
                            <div className="text-xs text-[var(--color-muted)] line-clamp-1">{r.body as string}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--color-muted)]">{r.installer_name as string}</td>
                          <td className="px-4 py-3">{'★'.repeat(r.rating as number)}</td>
                          <td className="px-4 py-3"><StatusBadge status={r.status as string} /></td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-center">
                              {r.status === 'pending' && (
                                <>
                                  <button onClick={() => api(`/api/admin/reviews/${r.id}`, 'PUT', { status: 'active' })} className="btn btn-sm" style={{ background: '#10b981', color: '#fff', border: 'none' }}>อนุมัติ</button>
                                  <button onClick={() => api(`/api/admin/reviews/${r.id}`, 'PUT', { status: 'rejected' })} className="btn btn-sm" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>ปฏิเสธ</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Leads ── */}
            {activeTab === 'leads' && (
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border)]">
                  <div className="font-bold mb-3">
                    Lead {filteredLeads.length !== leads.length ? `${filteredLeads.length} / ${leads.length}` : `ทั้งหมด (${leads.length})`}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      className="form-input py-1.5 text-sm"
                      style={{ minWidth: 200, flex: '1 1 200px' }}
                      placeholder="🔍 ค้นหาชื่อ / อีเมล / จังหวัด..."
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                    />
                    <select
                      className="form-input py-1.5 text-sm"
                      style={{ width: 'auto', minWidth: 150 }}
                      value={leadInstaller}
                      onChange={(e) => setLeadInstaller(e.target.value)}
                    >
                      <option value="">ผู้ติดตั้งทั้งหมด</option>
                      {leadInstallerNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <select
                      className="form-input py-1.5 text-sm"
                      style={{ width: 'auto', minWidth: 130 }}
                      value={leadStatus}
                      onChange={(e) => setLeadStatus(e.target.value)}
                    >
                      <option value="">สถานะทั้งหมด</option>
                      <option value="new">ใหม่</option>
                      <option value="contacted">ติดต่อแล้ว</option>
                      <option value="closed">ปิดแล้ว</option>
                    </select>
                    {(leadSearch || leadStatus || leadInstaller) && (
                      <button
                        className="btn btn-ghost btn-sm border border-[var(--color-border)] shrink-0"
                        onClick={() => { setLeadSearch(''); setLeadStatus(''); setLeadInstaller(''); }}
                      >
                        ล้าง
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                        <th className="text-left px-4 py-3">ชื่อ</th>
                        <th className="text-left px-4 py-3">จังหวัด</th>
                        <th className="text-left px-4 py-3">ผู้ติดตั้ง</th>
                        <th className="text-left px-4 py-3">สถานะ</th>
                        <th className="text-left px-4 py-3">วันที่</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((l) => (
                        <tr key={l.id as number} className="border-t border-[var(--color-border)] hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium">{l.name as string}</div>
                            <div className="text-xs text-[var(--color-muted)]">{l.email as string}</div>
                          </td>
                          <td className="px-4 py-3 text-[var(--color-muted)]">{l.province as string}</td>
                          <td className="px-4 py-3 text-xs text-[var(--color-muted)]">{(l.installer_name as string) || '—'}</td>
                          <td className="px-4 py-3"><StatusBadge status={l.status as string} /></td>
                          <td className="px-4 py-3 text-xs text-[var(--color-muted)]">
                            {new Date(l.created_at as string).toLocaleDateString('th-TH')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Blogs ── */}
            {activeTab === 'blogs' && (
              <BlogTab
                blogs={data.blogs}
                onAction={(url, method, body) => api(url, method, body).then(() => showAlert('success', 'อัปเดตแล้ว'))}
              />
            )}

            {/* ── Messages ── */}
            {activeTab === 'messages' && (
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border)] font-bold">ข้อความติดต่อ ({data.messages.length})</div>
                <div className="space-y-0">
                  {data.messages.map((m: Record<string, unknown>) => (
                    <div key={m.id as number} className="border-b border-[var(--color-border)] p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{m.name as string}</span>
                            <StatusBadge status={m.status as string} />
                          </div>
                          <div className="text-xs text-[var(--color-muted)] mb-1">{m.email as string} · {m.subject as string}</div>
                          <p className="text-sm text-[var(--color-muted)]">{m.message as string}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {m.status === 'new' && (
                            <button onClick={() => api(`/api/admin/contact-messages/${m.id}/status`, 'PUT', { status: 'read' })} className="btn btn-sm btn-outline">อ่านแล้ว</button>
                          )}
                          {m.status !== 'resolved' && (
                            <button onClick={() => api(`/api/admin/contact-messages/${m.id}/status`, 'PUT', { status: 'resolved' })} className="btn btn-sm" style={{ background: '#10b981', color: '#fff', border: 'none' }}>แก้ไขแล้ว</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Content ── */}
            {activeTab === 'content' && (
              <ContentTab contentMap={data.contentMap} onSave={(key, value) => api(`/api/admin/content/${encodeURIComponent(key)}`, 'PUT', { value }).then(() => showAlert('success', 'บันทึกแล้ว'))} />
            )}

            {/* ── Terms & Policy ── */}
            {activeTab === 'terms' && (
              <TermsTab
                initialJson={data.contentMap['terms_content'] || ''}
                onSave={(json: string) =>
                  api('/api/admin/content/terms_content', 'PUT', { value: json })
                    .then((d: { success: boolean }) => { if (d.success) showAlert('success', 'บันทึก Terms & Policy แล้ว'); })
                }
              />
            )}

            {/* ── Settings ── */}
            {activeTab === 'settings' && (
              <SettingsTab contentMap={data.contentMap} />
            )}

            {/* ── Social Login (OAuth) ── */}
            {activeTab === 'oauth' && (
              <OAuthTab
                providers={data.oauthProviders}
                onSave={(provider, body) =>
                  api(`/api/admin/oauth-providers/${provider}`, 'PUT', body)
                    .then((d: { success: boolean; message?: string }) => {
                      if (d.success) showAlert('success', 'บันทึกการตั้งค่า Social Login แล้ว');
                      return d;
                    })
                }
              />
            )}

            {/* ── Milestone Payment ── */}
            {activeTab === 'milestones' && (
              <MilestonePaymentTab initialOpenDisputes={data.stats.openDisputes} showAlert={showAlert} />
            )}

            {/* ── LINE OA Settings ── */}
            {activeTab === 'line' && (
              <LineSettingsTab showAlert={showAlert} />
            )}

            {/* ── Affiliate / Referral Program ── */}
            {activeTab === 'affiliate' && (
              <AffiliateTab showAlert={showAlert} />
            )}
          </main>
        </div>
      </div>

      {/* Claim account modal */}
      {claimModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={closeClaimModal}>
          <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">🔑 ส่งมอบบัญชีให้เจ้าของ</h3>
            <p className="text-xs text-[var(--color-muted)] mb-4">
              ผู้ติดตั้ง: <span className="font-medium">{claimModal.name}</span><br />
              อีเมลปัจจุบัน: {claimModal.currentEmail}
            </p>
            <div className="form-group">
              <label className="form-label">อีเมลที่จะใช้ Login (แทนอีเมลเดิม)</label>
              <input
                type="email"
                className="form-input"
                placeholder="owner@example.com"
                value={claimEmail}
                onChange={(e) => setClaimEmail(e.target.value)}
                autoFocus
              />
              <p className="form-hint">ระบบจะสร้างรหัสผ่านชั่วคราวและส่งไปที่อีเมลนี้ เจ้าของจะต้องตั้งรหัสผ่านใหม่ตอนเข้าสู่ระบบครั้งแรก</p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-ghost btn-sm border border-[var(--color-border)]" onClick={closeClaimModal} disabled={claimLoading}>ยกเลิก</button>
              <button className="btn btn-primary btn-sm" onClick={submitClaim} disabled={claimLoading}>
                {claimLoading ? '⏳ กำลังส่ง...' : '📧 ส่งข้อมูลเข้าสู่ระบบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    active:    { label: 'Active',    bg: '#d1fae5', color: '#065f46' },
    pending:   { label: 'รออนุมัติ', bg: '#fef3c7', color: '#92400e' },
    suspended: { label: 'ระงับ',    bg: '#fee2e2', color: '#991b1b' },
    rejected:  { label: 'ปฏิเสธ',   bg: '#fee2e2', color: '#991b1b' },
    new:       { label: 'ใหม่',      bg: '#dbeafe', color: '#1e40af' },
    read:      { label: 'อ่านแล้ว', bg: '#f3f4f6', color: '#374151' },
    resolved:  { label: 'แก้ไขแล้ว', bg: '#d1fae5', color: '#065f46' },
    contacted: { label: 'ติดต่อแล้ว', bg: '#fef3c7', color: '#92400e' },
    closed:    { label: 'ปิดแล้ว',  bg: '#d1fae5', color: '#065f46' },
    draft:     { label: 'ร่าง',     bg: '#f3f4f6', color: '#374151' },
  };
  const s = map[status] ?? { label: status, bg: '#f3f4f6', color: '#374151' };
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BlogTab({ blogs, onAction }: {
  blogs: any[];
  onAction: (url: string, method: string, body?: object) => void;
}) {
  const [blogSearch, setBlogSearch] = useState('');
  const [blogCategory, setBlogCategory] = useState('');
  const [blogStatus, setBlogStatus] = useState('');

  const categories = [...new Set(blogs.map((b) => b.category).filter(Boolean))] as string[];

  const filteredBlogs = blogs.filter((b) => {
    const q = blogSearch.toLowerCase();
    if (q && ![(b.title as string || ''), (b.author as string || '')].some((v) => v.toLowerCase().includes(q))) return false;
    if (blogCategory && b.category !== blogCategory) return false;
    if (blogStatus && b.status !== blogStatus) return false;
    return true;
  });

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="font-bold mb-3">
          บทความ {filteredBlogs.length !== blogs.length ? `${filteredBlogs.length} / ${blogs.length}` : `(${blogs.length})`}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            className="form-input py-1.5 text-sm"
            style={{ minWidth: 200, flex: '1 1 200px' }}
            placeholder="🔍 ค้นหาหัวข้อ / ผู้เขียน..."
            value={blogSearch}
            onChange={(e) => setBlogSearch(e.target.value)}
          />
          <select
            className="form-input py-1.5 text-sm"
            style={{ width: 'auto', minWidth: 140 }}
            value={blogCategory}
            onChange={(e) => setBlogCategory(e.target.value)}
          >
            <option value="">หมวดทั้งหมด</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            className="form-input py-1.5 text-sm"
            style={{ width: 'auto', minWidth: 130 }}
            value={blogStatus}
            onChange={(e) => setBlogStatus(e.target.value)}
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="active">เผยแพร่</option>
            <option value="draft">ร่าง</option>
          </select>
          {(blogSearch || blogCategory || blogStatus) && (
            <button
              className="btn btn-ghost btn-sm border border-[var(--color-border)] shrink-0"
              onClick={() => { setBlogSearch(''); setBlogCategory(''); setBlogStatus(''); }}
            >
              ล้าง
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
              <th className="text-left px-4 py-3">หัวข้อ</th>
              <th className="text-left px-4 py-3">หมวด</th>
              <th className="text-left px-4 py-3">สถานะ</th>
              <th className="text-left px-4 py-3">Featured</th>
              <th className="px-4 py-3">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredBlogs.map((b) => (
              <Fragment key={b.id}>
                <tr className="border-t border-[var(--color-border)] hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {b.cover_image ? (
                        <img src={b.cover_image} alt="" className="w-10 h-7 object-cover rounded flex-shrink-0 border border-[var(--color-border)]" />
                      ) : (
                        <div className="w-10 h-7 rounded flex-shrink-0 border border-dashed border-[var(--color-border)] bg-gray-50 flex items-center justify-center text-[10px] text-[var(--color-muted)]">📷</div>
                      )}
                      <div>
                        <div className="font-medium line-clamp-1 max-w-xs">{b.title}</div>
                        <div className="text-xs text-[var(--color-muted)]">✍️ {b.author}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs"><span className="badge badge-primary">{b.category}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onAction(`/api/admin/blogs/${b.id}/featured`, 'PUT')}
                      className={`badge cursor-pointer ${b.featured ? 'badge-warning' : ''}`}
                      style={!b.featured ? { background: '#f3f4f6', color: '#6b7280' } : {}}
                    >
                      {b.featured ? '⭐ Featured' : '☆ ปกติ'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-center flex-wrap">
                      <Link href={`/blog/${b.slug}`} target="_blank" className="btn btn-outline btn-sm">ดู</Link>
                      <button
                        onClick={() => onAction(`/api/admin/blogs/${b.id}`, 'PUT', { status: b.status === 'active' ? 'draft' : 'active' })}
                        className="btn btn-sm btn-ghost border border-[var(--color-border)]"
                      >
                        {b.status === 'active' ? 'ซ่อน' : 'เผยแพร่'}
                      </button>
                      <Link href={`/admin/blogs/${b.id}`} className="btn btn-sm btn-primary">
                        ✏️ แก้ไข
                      </Link>
                    </div>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContentTab({ contentMap, onSave }: { contentMap: Record<string, string>; onSave: (key: string, value: string) => void }) {
  const [vals, setVals] = useState({ ...contentMap });
  const [uploading, setUploading] = useState(false);
  const [contentTab, setContentTab] = useState('general');

  const POS_OPTIONS = [
    { value: '',               label: 'กึ่งกลาง (ค่าเริ่มต้น)' },
    { value: 'right center',   label: 'ขวา' },
    { value: 'left center',    label: 'ซ้าย' },
    { value: 'center top',     label: 'บน' },
    { value: 'center bottom',  label: 'ล่าง' },
    { value: '75% center',     label: 'ขวา-กลาง' },
    { value: '25% center',     label: 'ซ้าย-กลาง' },
  ];
  const SIZE_OPTIONS = [
    { value: '',         label: 'เต็มพื้นที่ / cover (ค่าเริ่มต้น)' },
    { value: '110%',     label: 'ซูมเข้าเล็กน้อย (110%)' },
    { value: 'auto 90%', label: 'ซูมออกเล็กน้อย' },
    { value: 'auto 70%', label: 'ซูมออก' },
    { value: 'contain',  label: 'แสดงเต็มรูป / contain' },
  ];

  type FieldDef = { key: string; label: string; type: string; hint?: string; options?: { value: string; label: string }[] };

  const GROUPS: { key: string; icon: string; label: string; fields: FieldDef[] }[] = [
    {
      key: 'general', icon: '🌐', label: 'ทั่วไป',
      fields: [
        { key: 'hero_headline', label: 'Hero Headline (ชื่อหลัก)',      type: 'text' },
        { key: 'hero_sub',      label: 'Hero Subtitle (ข้อความรอง)',    type: 'text' },
        { key: 'hero_bg_image', label: 'รูป Hero หน้าหลัก (ฝั่งขวา)', type: 'image-upload',
          hint: 'รูปที่แสดงฝั่งขวาของ Hero section บนหน้าหลัก' },
        { key: 'logo_url',      label: 'โลโก้เว็บไซต์ (Navbar)',        type: 'image-upload',
          hint: 'แสดงที่ Navbar บนสุดของเว็บ' },
        { key: 'footer_logo_url', label: 'โลโก้ Footer',               type: 'image-upload',
          hint: 'แสดงที่ Footer ด้านล่าง ถ้าไม่ตั้งค่าจะใช้โลโก้ Navbar แทน' },
        { key: 'site_name',     label: 'Site Name',                     type: 'text' },
        { key: 'support_email', label: 'Support Email',                 type: 'email' },
        { key: 'footer_text',   label: 'Footer Text',                   type: 'textarea' },
      ],
    },
    {
      key: 'installers', icon: '🏢', label: 'ผู้ติดตั้ง',
      fields: [
        { key: 'default_installer_image',       label: 'รูปโลโก้ Default ผู้ติดตั้ง',               type: 'image-upload',
          hint: 'แสดงแทนช่องว่างเมื่อผู้ติดตั้งไม่มีรูปโลโก้' },
        { key: 'default_installer_card_image',  label: 'รูป Default การ์ดผู้ติดตั้ง (หน้ารายการ)', type: 'image-upload',
          hint: 'แสดงในการ์ดหน้า /installers เมื่อผู้ติดตั้งไม่ได้อัปโหลดรูปการ์ด' },
        { key: 'default_installer_banner_image',label: 'รูป Default Banner ผู้ติดตั้ง',             type: 'image-upload',
          hint: 'แสดงเป็นพื้นหลัง Hero บนหน้า /installers/[id] เมื่อไม่ได้อัปโหลด Banner' },
        { key: 'installers_header_image',       label: 'รูป Banner หน้ารายชื่อผู้ติดตั้ง',          type: 'image-upload',
          hint: 'พื้นหลังแถบสีน้ำเงินบนหน้า /installers' },
        { key: 'installers_header_pos',         label: '↳ ตำแหน่งรูป (ผู้ติดตั้ง)',                 type: 'select', options: POS_OPTIONS },
        { key: 'installers_header_size',        label: '↳ ขนาด/ซูม (ผู้ติดตั้ง)',                   type: 'select', options: SIZE_OPTIONS },
      ],
    },
    {
      key: 'calculator', icon: '🧮', label: 'คำนวณราคา',
      fields: [
        { key: 'calculator_banner_image',  label: 'รูป Banner คำนวณราคา (หน้าหลัก)', type: 'image-upload',
          hint: 'พื้นหลัง block คำนวณค่าใช้จ่ายบนหน้าหลัก' },
        { key: 'calculator_header_image',  label: 'รูป Banner หน้าคำนวณราคา',        type: 'image-upload',
          hint: 'พื้นหลังแถบ Header บนหน้า /calculator' },
        { key: 'calculator_header_pos',    label: '↳ ตำแหน่งรูป (คำนวณราคา)',        type: 'select', options: POS_OPTIONS },
        { key: 'calculator_header_size',   label: '↳ ขนาด/ซูม (คำนวณราคา)',          type: 'select', options: SIZE_OPTIONS },
      ],
    },
    {
      key: 'blog', icon: '📰', label: 'บทความ',
      fields: [
        { key: 'default_blog_image',  label: 'รูปภาพ Default บทความ', type: 'image-upload',
          hint: 'แสดงแทนช่องว่างเมื่อบทความไม่มีรูปปก' },
        { key: 'blog_header_image',   label: 'รูป Banner หน้าบทความ', type: 'image-upload',
          hint: 'พื้นหลังแถบ Header บนหน้า /blog' },
        { key: 'blog_header_pos',     label: '↳ ตำแหน่งรูป (บทความ)', type: 'select', options: POS_OPTIONS },
        { key: 'blog_header_size',    label: '↳ ขนาด/ซูม (บทความ)',   type: 'select', options: SIZE_OPTIONS },
      ],
    },
    {
      key: 'pages', icon: '📄', label: 'หน้าอื่นๆ',
      fields: [
        { key: 'about_header_image',   label: 'รูป Banner หน้าเกี่ยวกับเรา',        type: 'image-upload',
          hint: 'พื้นหลังแถบ Header บนหน้า /about' },
        { key: 'about_header_pos',     label: '↳ ตำแหน่งรูป (เกี่ยวกับเรา)',         type: 'select', options: POS_OPTIONS },
        { key: 'about_header_size',    label: '↳ ขนาด/ซูม (เกี่ยวกับเรา)',           type: 'select', options: SIZE_OPTIONS },
        { key: 'about_story_image',    label: 'รูปส่วน "เรื่องราวของเรา"',            type: 'image-upload',
          hint: 'รูปสี่เหลี่ยมด้านขวาในส่วน เรื่องราวของเรา บนหน้า /about' },
        { key: 'contact_header_image', label: 'รูป Banner หน้าติดต่อเรา',            type: 'image-upload',
          hint: 'พื้นหลังแถบ Header บนหน้า /contact' },
        { key: 'contact_header_pos',   label: '↳ ตำแหน่งรูป (ติดต่อเรา)',            type: 'select', options: POS_OPTIONS },
        { key: 'contact_header_size',  label: '↳ ขนาด/ซูม (ติดต่อเรา)',              type: 'select', options: SIZE_OPTIONS },
      ],
    },
  ];

  const activeGroup = GROUPS.find((g) => g.key === contentTab)!;

  async function handleImageUpload(key: string, file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('subdir', 'site');
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const d = await res.json();
      if (d.success) {
        setVals((v) => ({ ...v, [key]: d.url }));
        onSave(key, d.url);
      } else {
        alert(d.error || 'อัพโหลดไม่สำเร็จ');
      }
    } catch {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setUploading(false);
    }
  }

  function renderField(f: FieldDef) {
    return (
      <div key={f.key} className="form-group">
        <label className="form-label">{f.label}</label>
        {f.type === 'image-upload' ? (
          <div className="flex flex-col gap-2">
            {vals[f.key] ? (
              <div className="relative w-fit">
                <img src={vals[f.key]} alt="preview"
                  className="h-28 w-auto object-contain rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]" />
                <button type="button"
                  onClick={() => { setVals((v) => ({ ...v, [f.key]: '' })); onSave(f.key, ''); }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow hover:bg-red-600">
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-32 h-24 rounded-xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center text-[var(--color-muted)] text-xs gap-1 bg-[var(--color-bg-alt)]">
                <span className="text-2xl opacity-40">🖼️</span>
                <span>ยังไม่มีรูป</span>
              </div>
            )}
            <label className={`btn btn-secondary btn-sm w-fit cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
              {uploading ? '⏳ กำลังอัพโหลด...' : '📁 เลือกรูปภาพ'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(f.key, file); e.target.value = ''; }} />
            </label>
            {f.hint && <p className="form-hint">{f.hint}</p>}
          </div>
        ) : f.type === 'select' ? (
          <select className="form-input" value={vals[f.key] || ''}
            onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}>
            {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : f.type === 'textarea' ? (
          <textarea className="form-input" rows={3} value={vals[f.key] || ''}
            onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} style={{ resize: 'vertical' }} />
        ) : (
          <input type={f.type} className="form-input" value={vals[f.key] || ''}
            onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} />
        )}
        {f.type !== 'image-upload' && (
          <div className="flex justify-end mt-2">
            <button className="btn btn-primary btn-sm" onClick={() => onSave(f.key, vals[f.key] || '')}>
              💾 บันทึก
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Sub-tab bar */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-alt)] px-4 pt-4 flex gap-1 flex-wrap">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setContentTab(g.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              contentTab === g.key
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-white'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/60'
            }`}
          >
            {g.icon} {g.label}
          </button>
        ))}
      </div>
      {/* Fields */}
      <div className="p-6 space-y-4">
        <h2 className="font-bold text-base text-[var(--color-text)]">
          {activeGroup.icon} {activeGroup.label}
        </h2>
        {activeGroup.fields.map((f) => renderField(f))}
      </div>
    </div>
  );
}

// ─── Terms & Policy Tab ──────────────────────────────────────────────────────

interface SubSection { sub: string; body: string }
interface TermsSection { id: string; title: string; content: SubSection[] }
interface TermsData { updatedDate: string; contactEmail: string; sections: TermsSection[] }

const TERMS_DEFAULTS: TermsData = {
  updatedDate: '1 กรกฎาคม 2568',
  contactEmail: 'info@solardirectory.co.th',
  sections: [
    { id: 'terms', title: '1. เงื่อนไขการใช้งาน', content: [
      { sub: '1.1 การยอมรับเงื่อนไข', body: 'การใช้งานเว็บไซต์นี้หรือการลงทะเบียนเป็นผู้ให้บริการถือว่าคุณได้อ่าน เข้าใจ และยอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัวทั้งหมด หากคุณไม่ยอมรับเงื่อนไขเหล่านี้ กรุณาหยุดใช้งานเว็บไซต์' },
      { sub: '1.2 วัตถุประสงค์ของเว็บไซต์', body: 'เว็บไซต์นี้เป็นไดเรกทอรีรวบรวมรายชื่อผู้ติดตั้งโซลาร์เซลล์ที่ผ่านการตรวจสอบ เพื่อเชื่อมต่อผู้ที่สนใจติดตั้งโซลาร์เซลล์กับผู้ให้บริการที่น่าเชื่อถือ ข้อมูลบนเว็บไซต์มีไว้เพื่อการอ้างอิงเบื้องต้นเท่านั้น' },
      { sub: '1.3 การลงทะเบียนผู้ให้บริการ', body: 'ผู้ที่ลงทะเบียนเป็นผู้ติดตั้งรับรองว่าข้อมูลที่ให้ไว้ถูกต้องและเป็นความจริง มีใบอนุญาตหรือคุณสมบัติที่เกี่ยวข้องครบถ้วน และยินยอมให้ทางเว็บไซต์แสดงข้อมูลโปรไฟล์ต่อสาธารณะ ทางเว็บไซต์ขอสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีที่ฝ่าฝืนเงื่อนไข' },
      { sub: '1.4 ข้อจำกัดความรับผิดชอบ', body: 'ทางเว็บไซต์ทำหน้าที่เป็นตัวกลางในการให้ข้อมูลเท่านั้น และไม่รับผิดชอบต่อคุณภาพของงาน ราคา หรือการดำเนินการของผู้ให้บริการที่ลงทะเบียนไว้ ผู้ใช้ควรตรวจสอบและพิจารณาผู้ให้บริการด้วยตนเองก่อนตัดสินใจ' },
    ]},
    { id: 'privacy', title: '2. นโยบายความเป็นส่วนตัว', content: [
      { sub: '2.1 ข้อมูลที่เราเก็บรวบรวม', body: 'เราเก็บรวบรวมข้อมูลที่จำเป็นสำหรับการให้บริการ ได้แก่: ข้อมูลการลงทะเบียน (ชื่อบริษัท, อีเมล, เบอร์โทร), ข้อมูลโปรไฟล์ (สถานที่, คำอธิบายบริการ, ราคา), บันทึกการใช้งาน (IP address, ประเภทเบราว์เซอร์) และข้อมูลที่ผู้ใช้กรอกผ่านแบบฟอร์มติดต่อ' },
      { sub: '2.2 วัตถุประสงค์ในการใช้ข้อมูล', body: 'ข้อมูลที่เก็บรวบรวมถูกใช้เพื่อ: แสดงโปรไฟล์ผู้ให้บริการในไดเรกทอรี, ส่งการแจ้งเตือนที่เกี่ยวข้องกับบัญชีและบริการ, ติดต่อเพื่อยืนยันข้อมูลหรือแก้ไขปัญหา, วิเคราะห์และปรับปรุงบริการ และปฏิบัติตามข้อกำหนดทางกฎหมาย' },
      { sub: '2.3 การเปิดเผยข้อมูลแก่บุคคลที่สาม', body: 'เราไม่จำหน่าย แลกเปลี่ยน หรือเปิดเผยข้อมูลส่วนบุคคลของคุณแก่บุคคลภายนอกเพื่อวัตถุประสงค์ทางการค้า ยกเว้นกรณีที่ได้รับความยินยอมจากเจ้าของข้อมูล หรือเมื่อมีคำสั่งจากหน่วยงานที่มีอำนาจตามกฎหมาย' },
      { sub: '2.4 การรักษาความปลอดภัยข้อมูล', body: 'เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสม รวมถึงการเข้ารหัสรหัสผ่านและการจำกัดสิทธิ์การเข้าถึงข้อมูล อย่างไรก็ตาม ไม่มีระบบใดที่ปลอดภัยสมบูรณ์แบบ เราจึงขอให้คุณรักษาข้อมูลบัญชีของตนเองอย่างระมัดระวัง' },
    ]},
    { id: 'pdpa', title: '3. นโยบาย PDPA (พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล)', content: [
      { sub: '3.1 ฐานทางกฎหมายในการประมวลผลข้อมูล', body: 'เราประมวลผลข้อมูลส่วนบุคคลของคุณภายใต้ฐานทางกฎหมายดังต่อไปนี้: (1) ความยินยอม — เมื่อคุณยอมรับเงื่อนไขนี้และลงทะเบียน, (2) การปฏิบัติตามสัญญา — เพื่อให้บริการที่คุณร้องขอ, (3) ประโยชน์โดยชอบด้วยกฎหมาย — เพื่อความปลอดภัยและการปรับปรุงบริการ' },
      { sub: '3.2 สิทธิ์ของเจ้าของข้อมูลส่วนบุคคล', body: 'ภายใต้ PDPA คุณมีสิทธิ์ดังนี้: สิทธิ์รับทราบ, สิทธิ์เข้าถึง, สิทธิ์แก้ไข, สิทธิ์ลบ, สิทธิ์คัดค้าน และสิทธิ์ถ่ายโอนข้อมูล' },
      { sub: '3.3 การให้ความยินยอมและการถอนความยินยอม', body: 'การลงทะเบียนและทำเครื่องหมายยอมรับเงื่อนไขถือเป็นการให้ความยินยอมอย่างชัดแจ้ง คุณสามารถถอนความยินยอมได้ทุกเมื่อโดยการติดต่อเราที่อีเมลด้านล่าง' },
      { sub: '3.4 ระยะเวลาการเก็บรักษาข้อมูล', body: 'เราจะเก็บรักษาข้อมูลส่วนบุคคลตราบเท่าที่จำเป็นสำหรับการให้บริการ เมื่อบัญชีถูกยกเลิก ข้อมูลจะถูกลบหรือทำให้เป็นนิรนามภายใน 90 วัน' },
    ]},
    { id: 'contact-consent', title: '4. การยินยอมให้ติดต่อ', content: [
      { sub: '4.1 การติดต่อเพื่อการบริการ', body: 'เมื่อคุณลงทะเบียนเป็นผู้ให้บริการ คุณยินยอมให้เราส่งอีเมลที่เกี่ยวข้องกับบัญชีของคุณ เช่น การยืนยันการลงทะเบียน การแจ้งสถานะการอนุมัติ การแจ้งเตือน leads และรีวิวใหม่' },
      { sub: '4.2 การติดต่อเพื่อปรับปรุงข้อมูล', body: 'เราอาจติดต่อคุณเพื่อยืนยันหรืออัปเดตข้อมูลโปรไฟล์ แจ้งนโยบายที่เปลี่ยนแปลง คุณสามารถยกเลิกการรับอีเมลประเภทนี้ได้ตลอดเวลา' },
      { sub: '4.3 ข้อมูลที่แสดงต่อสาธารณะ', body: 'ข้อมูลโปรไฟล์ที่คุณให้ไว้ (ชื่อบริษัท, พื้นที่ให้บริการ, เบอร์โทร, LINE URL) จะถูกแสดงต่อสาธารณะในไดเรกทอรี' },
    ]},
    { id: 'cookies', title: '5. การใช้คุกกี้', content: [
      { sub: '', body: 'เว็บไซต์ใช้คุกกี้ที่จำเป็น (Essential Cookies) เพื่อรักษา session การเข้าสู่ระบบ และคุกกี้สำหรับการวิเคราะห์การใช้งาน (Analytics Cookies) คุณสามารถปิดคุกกี้ในเบราว์เซอร์ได้ แต่อาจส่งผลต่อการทำงานบางส่วน' },
    ]},
    { id: 'changes', title: '6. การเปลี่ยนแปลงนโยบาย', content: [
      { sub: '', body: 'เราขอสงวนสิทธิ์ในการปรับปรุงเงื่อนไขและนโยบายนี้เป็นครั้งคราว การเปลี่ยนแปลงที่มีนัยสำคัญจะแจ้งให้ทราบผ่านทางอีเมลหรือประกาศบนเว็บไซต์' },
    ]},
    { id: 'contact-us', title: '7. ติดต่อเรา', content: [
      { sub: '', body: 'หากคุณมีคำถามเกี่ยวกับนโยบายนี้ หรือต้องการใช้สิทธิ์ตาม PDPA เช่น ขอดู แก้ไข หรือลบข้อมูลส่วนบุคคล กรุณาติดต่อเราผ่านช่องทางด้านล่าง เราจะตอบกลับคำขอภายใน 30 วันทำการ' },
    ]},
  ],
};

function TermsTab({ initialJson, onSave }: { initialJson: string; onSave: (json: string) => Promise<void> }) {
  const parseInitial = (): TermsData => {
    if (!initialJson) return TERMS_DEFAULTS;
    try { return JSON.parse(initialJson) as TermsData; } catch { return TERMS_DEFAULTS; }
  };

  const [td, setTd] = useState<TermsData>(parseInitial);
  const [saving, setSaving] = useState(false);

  function setMeta(key: keyof Pick<TermsData, 'updatedDate' | 'contactEmail'>, val: string) {
    setTd((d) => ({ ...d, [key]: val }));
  }
  function setSecTitle(si: number, val: string) {
    setTd((d) => { const s = [...d.sections]; s[si] = { ...s[si], title: val }; return { ...d, sections: s }; });
  }
  function setSub(si: number, ci: number, key: keyof SubSection, val: string) {
    setTd((d) => {
      const s = [...d.sections];
      const c = [...s[si].content];
      c[ci] = { ...c[ci], [key]: val };
      s[si] = { ...s[si], content: c };
      return { ...d, sections: s };
    });
  }
  function addSub(si: number) {
    setTd((d) => {
      const s = [...d.sections];
      s[si] = { ...s[si], content: [...s[si].content, { sub: '', body: '' }] };
      return { ...d, sections: s };
    });
  }
  function removeSub(si: number, ci: number) {
    setTd((d) => {
      const s = [...d.sections];
      s[si] = { ...s[si], content: s[si].content.filter((_, i) => i !== ci) };
      return { ...d, sections: s };
    });
  }

  async function handleSave() {
    setSaving(true);
    await onSave(JSON.stringify(td));
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-base">📋 Terms &amp; Policy Editor</h2>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">แก้ไขเนื้อหาแล้วกด "บันทึกทั้งหมด" เพื่ออัปเดตหน้า /terms</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary btn-sm shrink-0"
        >
          {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกทั้งหมด'}
        </button>
      </div>

      {/* Meta fields */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>ข้อมูลทั่วไป</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group mb-0">
            <label className="form-label">วันที่ปรับปรุงล่าสุด</label>
            <input
              type="text"
              className="form-input"
              value={td.updatedDate}
              onChange={(e) => setMeta('updatedDate', e.target.value)}
              placeholder="เช่น 1 กรกฎาคม 2568"
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Email ติดต่อ (แสดงในหมวด ติดต่อเรา)</label>
            <input
              type="email"
              className="form-input"
              value={td.contactEmail}
              onChange={(e) => setMeta('contactEmail', e.target.value)}
              placeholder="info@example.com"
            />
          </div>
        </div>
      </div>

      {/* Sections */}
      {td.sections.map((sec, si) => (
        <div key={sec.id} className="card overflow-hidden">
          {/* Section header */}
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'var(--color-bg-alt)', borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)] shrink-0">หัวข้อหลัก</span>
            <input
              type="text"
              className="form-input py-1.5 text-sm font-semibold flex-1"
              value={sec.title}
              onChange={(e) => setSecTitle(si, e.target.value)}
            />
          </div>

          {/* Sub-sections */}
          <div className="p-4 space-y-4">
            {sec.content.map((item, ci) => (
              <div key={ci} className="rounded-lg p-3 space-y-2" style={{ background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-muted)] shrink-0 w-20">หัวข้อย่อย</span>
                  <input
                    type="text"
                    className="form-input py-1 text-sm flex-1"
                    placeholder="ชื่อหัวข้อย่อย (เว้นว่างได้)"
                    value={item.sub}
                    onChange={(e) => setSub(si, ci, 'sub', e.target.value)}
                  />
                  <button
                    onClick={() => removeSub(si, ci)}
                    className="btn btn-sm shrink-0"
                    style={{ background: '#fee2e2', color: '#991b1b', border: 'none' }}
                    title="ลบหัวข้อย่อยนี้"
                  >
                    ลบ
                  </button>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs text-[var(--color-muted)] shrink-0 w-20 pt-2">เนื้อหา</span>
                  <textarea
                    className="form-input text-sm flex-1"
                    rows={3}
                    style={{ resize: 'vertical' }}
                    value={item.body}
                    onChange={(e) => setSub(si, ci, 'body', e.target.value)}
                  />
                </div>
              </div>
            ))}

            <button
              onClick={() => addSub(si)}
              className="btn btn-ghost btn-sm border border-dashed border-[var(--color-border)] w-full text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              + เพิ่มหัวข้อย่อย
            </button>
          </div>
        </div>
      ))}

      {/* Bottom save */}
      <div className="flex justify-end pb-2">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกทั้งหมด'}
        </button>
      </div>
    </div>
  );
}

function SettingsTab({ contentMap }: { contentMap: Record<string, string> }) {
  const [smtpUser, setSmtpUser] = useState(contentMap['smtp_user'] || '');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpHost, setSmtpHost] = useState(contentMap['smtp_host'] || 'smtp.hostinger.com');
  const [smtpPort, setSmtpPort] = useState(contentMap['smtp_port'] || '465');
  const [testLoading, setTestLoading] = useState(false);
  const [testMsg, setTestMsg] = useState('');

  async function saveSMTP() {
    const res = await fetch('/api/admin/smtp', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smtp_user: smtpUser, smtp_pass: smtpPass, smtp_host: smtpHost, smtp_port: smtpPort }),
    });
    const d = await res.json();
    setTestMsg(d.success ? '✅ บันทึก SMTP แล้ว' : `❌ ${d.error}`);
  }

  async function testSMTP() {
    setTestLoading(true);
    const res = await fetch('/api/admin/smtp/test', { method: 'POST' });
    const d = await res.json();
    setTestMsg(d.success ? '✅ ส่ง test email สำเร็จ' : `❌ ${d.error}`);
    setTestLoading(false);
  }

  return (
    <div className="card p-6">
      <h2 className="font-bold text-base mb-4">⚙️ ตั้งค่า SMTP Email</h2>
      {testMsg && <div className="alert alert-info mb-4"><span>ℹ️</span> {testMsg}</div>}
      <form onSubmit={(e) => { e.preventDefault(); saveSMTP(); }} className="space-y-4 max-w-sm">
        <div className="form-group">
          <label className="form-label">SMTP User (อีเมล)</label>
          <input type="email" className="form-input" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="you@yourdomain.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input type="password" className="form-input" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="••••••••••••••••" />
          <span className="form-hint">รหัสผ่านอีเมล SMTP ของผู้ให้บริการ (เช่น Hostinger)</span>
        </div>
        <div className="form-group">
          <label className="form-label">SMTP Host</label>
          <input type="text" className="form-input" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.hostinger.com" />
        </div>
        <div className="form-group">
          <label className="form-label">SMTP Port</label>
          <input type="text" className="form-input" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="465" />
          <span className="form-hint">465 = SSL, 587 = STARTTLS</span>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary btn-sm">💾 บันทึก</button>
          <button type="button" onClick={testSMTP} disabled={testLoading} className="btn btn-outline btn-sm">
            {testLoading ? '⏳' : '📧'} ทดสอบส่ง Email
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Social Login (OAuth providers) Tab ──────────────────────────────────────

interface OAuthProviderRow {
  provider: string;
  client_id: string;
  active: number | boolean;
  client_secret_set: boolean;
}

const OAUTH_PROVIDER_META: Record<string, { label: string; icon: string }> = {
  google:   { label: 'Google',      icon: '🔴' },
  facebook: { label: 'Facebook',    icon: '🔵' },
  twitter:  { label: 'Twitter / X', icon: '⚫' },
  tiktok:   { label: 'TikTok',      icon: '⬛' },
};
const OAUTH_PROVIDER_ORDER = ['google', 'facebook', 'twitter', 'tiktok'];

function OAuthTab({ providers, onSave }: {
  providers: OAuthProviderRow[];
  onSave: (provider: string, body: object) => Promise<{ success: boolean; message?: string }>;
}) {
  const initial = OAUTH_PROVIDER_ORDER.map((p) => {
    const row = providers.find((r) => r.provider === p);
    return {
      provider: p,
      clientId: row?.client_id || '',
      clientSecret: '',
      active: !!row?.active,
      secretSet: !!row?.client_secret_set,
    };
  });

  const [rows, setRows] = useState(initial);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  function update(provider: string, patch: Partial<(typeof initial)[number]>) {
    setRows((rs) => rs.map((r) => (r.provider === provider ? { ...r, ...patch } : r)));
  }

  async function handleSave(provider: string) {
    const row = rows.find((r) => r.provider === provider);
    if (!row) return;
    setSavingProvider(provider);
    const body: Record<string, unknown> = { client_id: row.clientId, active: row.active ? 1 : 0 };
    const typedSecret = row.clientSecret.trim();
    if (typedSecret) body.client_secret = typedSecret;
    const d = await onSave(provider, body);
    setSavingProvider(null);
    if (d.success) {
      update(provider, { clientSecret: '', secretSet: typedSecret ? true : row.secretSet });
    }
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const meta = OAUTH_PROVIDER_META[row.provider] || { label: row.provider, icon: '🔗' };
        return (
          <div key={row.provider} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base">{meta.icon} {meta.label}</h2>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={row.active}
                  onChange={(e) => update(row.provider, { active: e.target.checked })}
                />
                เปิดใช้งาน
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="form-group mb-0">
                <label className="form-label">Client ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={row.clientId}
                  onChange={(e) => update(row.provider, { clientId: e.target.value })}
                  placeholder="Client ID"
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">
                  Client Secret{' '}
                  {row.secretSet && <span className="text-xs font-normal text-[var(--color-muted)]">(ตั้งค่าไว้แล้ว)</span>}
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={row.clientSecret}
                  onChange={(e) => update(row.provider, { clientSecret: e.target.value })}
                  placeholder={row.secretSet ? '•••••••••••••• (เว้นว่างไว้เพื่อไม่เปลี่ยน)' : 'ยังไม่ได้ตั้งค่า'}
                  autoComplete="new-password"
                />
                <span className="form-hint">เว้นว่างไว้หากไม่ต้องการเปลี่ยนค่าที่บันทึกไว้แล้ว</span>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleSave(row.provider)}
                disabled={savingProvider === row.provider}
              >
                {savingProvider === row.provider ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
