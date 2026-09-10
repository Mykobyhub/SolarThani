'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Affiliate } from '@/types';
import { PAYOUT_THRESHOLD_THB } from '@/lib/affiliate/constants';

type Tab = 'overview' | 'links' | 'commissions' | 'payout';

interface CommissionStatusSummary {
  count: number;
  total: number;
}

interface MeStats {
  totalClicks: number;
  eligibleBalance: number;
  commissionsByStatus: Record<'pending' | 'eligible' | 'paid' | 'clawed_back', CommissionStatusSummary>;
}

interface CommissionRow {
  id: number;
  installer_name: string;
  commission_type: 'percent' | 'flat';
  base_amount: number;
  commission_amount: number;
  status: 'pending' | 'eligible' | 'paid' | 'clawed_back';
  created_at: string;
}

interface EnabledInstaller {
  id: number;
  name: string;
  logo_url: string | null;
  location: string | null;
}

const STATUS_LABEL: Record<string, { label: string; badgeClass: string }> = {
  pending: { label: 'รอดำเนินการ', badgeClass: 'badge-warning' },
  eligible: { label: 'พร้อมจ่าย', badgeClass: 'badge-primary' },
  paid: { label: 'จ่ายแล้ว', badgeClass: 'badge-success' },
  clawed_back: { label: 'ถูกยกเลิก', badgeClass: 'badge-danger' },
};

const ACCOUNT_STATUS: Record<string, { label: string; dot: string }> = {
  pending_verification: { label: 'รอยืนยันอีเมล ⏳', dot: 'bg-yellow-500' },
  active: { label: 'เปิดใช้งาน ✅', dot: 'bg-green-500' },
  suspended: { label: 'ถูกระงับ ❌', dot: 'bg-red-500' },
};

export default function DashboardClient({ affiliate }: { affiliate: Affiliate }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [stats, setStats] = useState<MeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [commissionsLoading, setCommissionsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [enabledInstallers, setEnabledInstallers] = useState<EnabledInstaller[]>([]);
  const [installersLoading, setInstallersLoading] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);

  // Starts as the env-configured app URL (identical on server and client
  // first render, avoiding a hydration mismatch), then swaps to the real
  // window.location.origin after mount — matters if the app is ever reached
  // via a different host than NEXT_PUBLIC_APP_URL (e.g. a preview domain).
  const [origin, setOrigin] = useState(process.env.NEXT_PUBLIC_APP_URL || 'https://solarthani.com');
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const [payoutForm, setPayoutForm] = useState({
    payout_bank_name: affiliate.payout_bank_name || '',
    payout_account_number: affiliate.payout_account_number || '',
    payout_account_name: affiliate.payout_account_name || '',
  });
  const [payoutSaving, setPayoutSaving] = useState(false);

  function showAlert(type: 'success' | 'error', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  const fetchMe = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/affiliate/me');
      const d = await res.json();
      if (d.success) setStats(d.data.stats);
    } catch {
      /* ignore — stat tiles just stay in loading/empty state */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchCommissions = useCallback(async (status: string) => {
    setCommissionsLoading(true);
    try {
      const qs = status !== 'all' ? `?status=${status}` : '';
      const res = await fetch(`/api/affiliate/commissions${qs}`);
      const d = await res.json();
      if (d.success) setCommissions(d.data);
    } catch {
      setCommissions([]);
    } finally {
      setCommissionsLoading(false);
    }
  }, []);

  const fetchInstallers = useCallback(async () => {
    setInstallersLoading(true);
    try {
      const res = await fetch('/api/affiliate/installers');
      const d = await res.json();
      if (d.success) setEnabledInstallers(d.data);
    } catch {
      setEnabledInstallers([]);
    } finally {
      setInstallersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (activeTab === 'commissions') fetchCommissions(statusFilter);
  }, [activeTab, statusFilter, fetchCommissions]);

  useEffect(() => {
    if (activeTab === 'links') fetchInstallers();
  }, [activeTab, fetchInstallers]);

  async function handleLogout() {
    await fetch('/api/affiliate/auth/logout', { method: 'POST' });
    router.push('/affiliate/login');
    router.refresh();
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      showAlert('error', 'คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง');
    }
  }

  async function savePayoutSettings(e: React.FormEvent) {
    e.preventDefault();
    setPayoutSaving(true);
    try {
      const res = await fetch('/api/affiliate/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payoutForm),
      });
      const d = await res.json();
      if (d.success) showAlert('success', d.message || 'บันทึกสำเร็จ');
      else showAlert('error', d.message || 'บันทึกไม่สำเร็จ');
    } catch {
      showAlert('error', 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setPayoutSaving(false);
    }
  }

  const siteWideLink = `${origin}/?ref=${affiliate.referral_code}`;

  const acctStatus = ACCOUNT_STATUS[affiliate.status] ?? { label: affiliate.status, dot: 'bg-gray-400' };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'ภาพรวม', icon: '📊' },
    { key: 'links', label: 'ลิงก์แนะนำ', icon: '🔗' },
    { key: 'commissions', label: 'คอมมิชชัน', icon: '💰' },
    { key: 'payout', label: 'บัญชีรับเงิน', icon: '🏦' },
  ];

  return (
    <>
      {/* Header */}
      <div className="text-white py-6" style={{ background: 'linear-gradient(135deg, var(--color-bg-dark) 0%, var(--color-primary) 100%)' }}>
        <div className="container mx-auto px-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/15 flex-shrink-0 ring-2 ring-white/30 flex items-center justify-center text-3xl">
              🤝
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>Affiliate Dashboard</p>
              <h1 className="text-xl font-bold leading-tight" style={{ color: '#ffffff' }}>{affiliate.name}</h1>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-sm bg-white/15 border-white/30 text-white hover:bg-white/25 flex-shrink-0">
            ออกจากระบบ
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {alert && (
          <div className={`alert mb-4 ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{alert.type === 'success' ? '✅' : '⚠️'}</span> {alert.msg}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar tabs */}
          <aside className="lg:w-52 flex-shrink-0">
            <nav className="card p-2 flex lg:flex-col gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left whitespace-nowrap ${
                    activeTab === t.key ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-blue-50 text-[var(--color-text)]'
                  }`}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">
            {/* ── Overview ── */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{statsLoading ? '…' : stats?.totalClicks ?? 0}</div>
                    <div className="text-xs text-[var(--color-muted)]">คลิกทั้งหมด</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold" style={{ color: '#d97706' }}>
                      {statsLoading ? '…' : stats?.commissionsByStatus.pending.count ?? 0}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">รอดำเนินการ</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
                      ฿{statsLoading ? '…' : (stats?.eligibleBalance ?? 0).toLocaleString('th-TH')}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">ยอดพร้อมจ่าย</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold" style={{ color: '#059669' }}>
                      ฿{statsLoading ? '…' : (stats?.commissionsByStatus.paid.total ?? 0).toLocaleString('th-TH')}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">จ่ายแล้วสะสม</div>
                  </div>
                </div>

                {/* Status breakdown */}
                {!statsLoading && stats && (
                  <div className="card p-4">
                    <div className="text-sm font-semibold mb-3">สถานะคอมมิชชัน</div>
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-[var(--color-border)]">
                      {(['pending', 'eligible', 'paid', 'clawed_back'] as const).map((s) => {
                        const total = Object.values(stats.commissionsByStatus).reduce((a, b) => a + b.count, 0);
                        const pct = total > 0 ? (stats.commissionsByStatus[s].count / total) * 100 : 0;
                        const color = { pending: '#f59e0b', eligible: '#0262EC', paid: '#059669', clawed_back: '#ef4444' }[s];
                        return pct > 0 ? <div key={s} style={{ width: `${pct}%`, background: color }} /> : null;
                      })}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-[var(--color-muted)]">
                      {(['pending', 'eligible', 'paid', 'clawed_back'] as const).map((s) => (
                        <span key={s} className="flex items-center gap-1.5">
                          <span className={`badge ${STATUS_LABEL[s].badgeClass}`}>{STATUS_LABEL[s].label}</span>
                          {stats.commissionsByStatus[s].count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Threshold alert */}
                {!statsLoading && (
                  <div className="alert alert-info">
                    <span>ℹ️</span>
                    ยอดคอมมิชชันจะเข้าคิวจ่ายเงินเมื่อสะสมถึง <strong>฿{PAYOUT_THRESHOLD_THB.toLocaleString('th-TH')}</strong> ขึ้นไป
                    {' '}(ปัจจุบัน ฿{(stats?.eligibleBalance ?? 0).toLocaleString('th-TH')})
                  </div>
                )}

                {/* Account status */}
                <div className="card p-4 flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${acctStatus.dot}`} />
                  <div>
                    <div className="text-sm font-medium">สถานะบัญชี: {acctStatus.label}</div>
                    {affiliate.status === 'pending_verification' && (
                      <div className="text-xs text-[var(--color-muted)]">กรุณายืนยันอีเมลของคุณก่อนใช้งานรหัสแนะนำ ตรวจสอบกล่องขาเข้าของคุณ</div>
                    )}
                  </div>
                </div>

                {/* Activity feed — empty until Phase 3 (clicks) / Phase 5 (commissions) go live */}
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-[var(--color-border)] font-bold">กิจกรรมล่าสุด</div>
                  <div className="p-8 text-center text-[var(--color-muted)] text-sm">ยังไม่มีข้อมูล</div>
                </div>
              </div>
            )}

            {/* ── Links ── */}
            {activeTab === 'links' && (
              <div className="space-y-5">
                <div className="card p-6">
                  <h2 className="font-bold mb-1">รหัสแนะนำของคุณ</h2>
                  <p className="text-sm text-[var(--color-muted)] mb-4">แชร์ลิงก์นี้ให้ลูกค้าที่สนใจโซลาร์เซลล์ ระบบจะติดตามการคลิกให้อัตโนมัติ</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex-1 min-w-0 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm font-mono truncate">
                      {siteWideLink}
                    </div>
                    <button
                      onClick={() => copyToClipboard(siteWideLink, 'sitewide')}
                      className={`btn btn-sm flex-shrink-0 ${copied === 'sitewide' ? 'btn-success' : 'btn-primary'}`}
                    >
                      {copied === 'sitewide' ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}
                    </button>
                  </div>
                  <div className="mt-3 text-xs text-[var(--color-muted)]">
                    รหัสแนะนำ: <span className="font-mono font-semibold">{affiliate.referral_code}</span>
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="font-bold mb-1">ลิงก์เฉพาะผู้ติดตั้ง</h2>
                  <p className="text-sm text-[var(--color-muted)] mb-4">
                    ผู้ติดตั้งที่เข้าร่วมโปรแกรม Affiliate จะแสดงที่นี่ พร้อมลิงก์แนะนำเฉพาะราย
                  </p>
                  {installersLoading ? (
                    <div className="text-center text-sm text-[var(--color-muted)] py-6">กำลังโหลด...</div>
                  ) : enabledInstallers.length === 0 ? (
                    <div className="text-center text-sm text-[var(--color-muted)] py-6">
                      ยังไม่มีผู้ติดตั้งที่เข้าร่วมโปรแกรม Affiliate ในขณะนี้
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {enabledInstallers.map((inst) => {
                        const link = `${origin}/installers/${inst.id}?ref=${affiliate.referral_code}`;
                        return (
                          <div key={inst.id} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)]">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--color-surface-2)] flex-shrink-0 flex items-center justify-center">
                              {inst.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={inst.logo_url} alt={inst.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>☀️</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate">{inst.name}</div>
                              <div className="text-xs text-[var(--color-muted)] truncate">{link}</div>
                            </div>
                            <button
                              onClick={() => copyToClipboard(link, `inst-${inst.id}`)}
                              className={`btn btn-xs flex-shrink-0 ${copied === `inst-${inst.id}` ? 'btn-success' : 'btn-outline'}`}
                            >
                              {copied === `inst-${inst.id}` ? '✓' : 'คัดลอก'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Commissions ── */}
            {activeTab === 'commissions' && (
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-3">
                  <div className="font-bold">ประวัติคอมมิชชัน</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['all', 'pending', 'eligible', 'paid', 'clawed_back'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`btn btn-xs ${statusFilter === s ? 'btn-blue' : 'btn-outline'}`}
                      >
                        {s === 'all' ? 'ทั้งหมด' : STATUS_LABEL[s].label}
                      </button>
                    ))}
                  </div>
                </div>
                {commissionsLoading ? (
                  <div className="p-8 text-center text-[var(--color-muted)] text-sm">กำลังโหลด...</div>
                ) : commissions.length === 0 ? (
                  <div className="p-8 text-center text-[var(--color-muted)] text-sm">ยังไม่มีข้อมูล</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                          <th className="text-left px-4 py-3">ผู้ติดตั้ง</th>
                          <th className="text-left px-4 py-3">ประเภท</th>
                          <th className="text-left px-4 py-3">มูลค่าอ้างอิง</th>
                          <th className="text-left px-4 py-3">คอมมิชชัน</th>
                          <th className="text-left px-4 py-3">สถานะ</th>
                          <th className="text-left px-4 py-3">วันที่</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissions.map((c) => (
                          <tr key={c.id} className="border-t border-[var(--color-border)]">
                            <td className="px-4 py-3">{c.installer_name}</td>
                            <td className="px-4 py-3">{c.commission_type === 'percent' ? 'เปอร์เซ็นต์' : 'คงที่'}</td>
                            <td className="px-4 py-3">฿{c.base_amount.toLocaleString('th-TH')}</td>
                            <td className="px-4 py-3 font-semibold">฿{c.commission_amount.toLocaleString('th-TH')}</td>
                            <td className="px-4 py-3">
                              <span className={`badge ${STATUS_LABEL[c.status].badgeClass}`}>{STATUS_LABEL[c.status].label}</span>
                            </td>
                            <td className="px-4 py-3 text-[var(--color-muted)]">{new Date(c.created_at).toLocaleDateString('th-TH')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Payout ── */}
            {activeTab === 'payout' && (
              <div className="space-y-5">
                <div className="alert alert-info">
                  <span>ℹ️</span>
                  การจ่ายเงินเป็นแบบ manual — ทีมงานจะโอนเงินเข้าบัญชีนี้เมื่อยอดคอมมิชชันของคุณถึงเกณฑ์ขั้นต่ำ ฿{PAYOUT_THRESHOLD_THB.toLocaleString('th-TH')}
                </div>
                <div className="card p-6">
                  <h2 className="font-bold mb-4">บัญชีสำหรับรับเงิน</h2>
                  <form onSubmit={savePayoutSettings} className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">ธนาคาร</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="เช่น ธนาคารกสิกรไทย"
                        value={payoutForm.payout_bank_name}
                        onChange={(e) => setPayoutForm((f) => ({ ...f, payout_bank_name: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="form-label">เลขที่บัญชี</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="XXX-X-XXXXX-X"
                          value={payoutForm.payout_account_number}
                          onChange={(e) => setPayoutForm((f) => ({ ...f, payout_account_number: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">ชื่อบัญชี</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="ชื่อ-นามสกุลตามบัญชีธนาคาร"
                          value={payoutForm.payout_account_name}
                          onChange={(e) => setPayoutForm((f) => ({ ...f, payout_account_name: e.target.value }))}
                        />
                      </div>
                    </div>
                    <button type="submit" disabled={payoutSaving} className="btn btn-primary">
                      {payoutSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลบัญชี'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
