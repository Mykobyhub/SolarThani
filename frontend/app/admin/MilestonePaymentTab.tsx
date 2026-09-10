'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';

interface Milestone {
  id: number;
  project_id: number;
  seq: number;
  description: string;
  amount: number;
  status: string;
  completed_at: string | null;
  released_at: string | null;
}

interface Project {
  id: number;
  installer_id: number;
  installer_name: string;
  customer_name: string;
  title: string;
  total_amount: number;
  status: string;
  created_at: string;
  milestones: Milestone[];
  customer_notify_channel: string;
  installer_notify_channel: string;
  customer_line_user_id: string | null;
  installer_line_linked: boolean;
}

interface Transaction {
  id: number;
  milestone_id: number;
  milestone_seq: number;
  project_id: number;
  project_title: string;
  type: string;
  amount: number;
  provider: string;
  provider_reference_id: string | null;
  status: string;
  created_at: string;
}

interface Dispute {
  id: number;
  milestone_id: number;
  milestone_seq: number;
  milestone_description: string;
  milestone_amount: number;
  project_id: number;
  project_title: string;
  customer_name: string;
  installer_name: string;
  raised_by: string;
  reason: string;
  status: string;
  created_at: string;
}

const PROJECT_STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  proposed:               { label: 'รอลูกค้ายอมรับ', bg: '#f3f4f6', color: '#374151' },
  awaiting_first_payment: { label: 'รอชำระงวดแรก',  bg: '#fef3c7', color: '#92400e' },
  active:                 { label: 'กำลังดำเนินงาน', bg: 'rgba(2,98,236,0.08)', color: 'var(--color-primary)' },
  completed:              { label: 'เสร็จสมบูรณ์',   bg: 'rgba(16,185,129,0.08)', color: '#059669' },
  disputed:               { label: 'มีข้อโต้แย้ง',    bg: 'rgba(239,68,68,.1)', color: '#b91c1c' },
  cancelled:              { label: 'ยกเลิกแล้ว',      bg: '#f3f4f6', color: '#6b7280' },
};

const MILESTONE_STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending_payment:        { label: '⏳ รอชำระเงิน',        bg: '#f3f4f6', color: '#374151' },
  paid_hold:              { label: '🔒 ชำระแล้ว · พักไว้', bg: 'rgba(99,102,241,.1)', color: '#4338ca' },
  in_progress:            { label: '🔧 กำลังดำเนินงาน',    bg: 'rgba(2,98,236,0.08)', color: 'var(--color-primary)' },
  awaiting_confirmation:  { label: '📢 รอลูกค้ายืนยัน',    bg: 'rgba(253,105,2,0.08)', color: 'var(--color-accent)' },
  released:               { label: '✅ ปล่อยเงินแล้ว',     bg: 'rgba(16,185,129,0.08)', color: '#059669' },
  disputed:               { label: '⚠️ มีข้อโต้แย้ง',      bg: 'rgba(239,68,68,.1)', color: '#b91c1c' },
  refunded:               { label: '↩ คืนเงินแล้ว',        bg: '#e0e7ff', color: '#3730a3' },
  cancelled:              { label: '🚫 ยกเลิกแล้ว',        bg: '#f3f4f6', color: '#6b7280' },
};

function StatusPill({ map, status }: { map: Record<string, { label: string; bg: string; color: string }>; status: string }) {
  const s = map[status] ?? { label: status, bg: '#f3f4f6', color: '#374151' };
  return <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function ProgressTrack({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="progress-track" style={{ minWidth: 80 }}>
      {milestones.map((m) => {
        let cls = '';
        if (['released', 'refunded'].includes(m.status)) cls = 'done';
        else if (m.status === 'disputed') cls = 'danger';
        else if (['paid_hold', 'in_progress', 'awaiting_confirmation'].includes(m.status)) cls = 'active';
        return <div key={m.id} className={`progress-seg ${cls}`} title={`งวด ${m.seq}: ${MILESTONE_STATUS_MAP[m.status]?.label || m.status}`} />;
      })}
    </div>
  );
}

const THB = (n: number) => `฿${Math.round(n).toLocaleString('th-TH')}`;

export default function MilestonePaymentTab({
  initialOpenDisputes,
  showAlert,
}: {
  initialOpenDisputes: number;
  showAlert: (type: 'success' | 'error', msg: string) => void;
}) {
  const [section, setSection] = useState<'overview' | 'projects' | 'disputes'>('overview');
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [togglingFlag, setTogglingFlag] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState({ totalProjects: 0, activeProjects: 0, openDisputes: initialOpenDisputes, escrowValue: 0 });
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatus, setProjectStatus] = useState('');
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [busyMilestoneId, setBusyMilestoneId] = useState<number | null>(null);
  const [busyDisputeId, setBusyDisputeId] = useState<number | null>(null);
  const [busyCancelId, setBusyCancelId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [projRes, flagRes] = await Promise.all([
      fetch('/api/admin/payment-projects'),
      fetch('/api/admin/settings/milestone-payment'),
    ]);
    const projData = await projRes.json();
    const flagData = await flagRes.json();
    if (projData.success) {
      setProjects(projData.projects);
      setTransactions(projData.transactions);
      setDisputes(projData.disputes);
      setStats(projData.stats);
    }
    if (flagData.success) setEnabled(flagData.enabled);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleFlag() {
    setTogglingFlag(true);
    const res = await fetch('/api/admin/settings/milestone-payment', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    });
    const d = await res.json();
    setTogglingFlag(false);
    if (d.success) { setEnabled(!enabled); showAlert('success', d.message); }
    else showAlert('error', d.error || 'เกิดข้อผิดพลาด');
  }

  async function mockPay(projectId: number, milestoneId: number) {
    setBusyMilestoneId(milestoneId);
    const res = await fetch(`/api/admin/payment-projects/${projectId}/milestones/${milestoneId}/mock-pay`, { method: 'POST' });
    const d = await res.json();
    setBusyMilestoneId(null);
    if (d.success) { showAlert('success', d.message); load(); }
    else showAlert('error', d.error || d.message || 'เกิดข้อผิดพลาด');
  }

  async function mockDispute(projectId: number, milestoneId: number) {
    if (!confirm('เปิดข้อโต้แย้งทดสอบสำหรับงวดนี้? (ใช้สำหรับทดสอบคิว dispute เท่านั้น)')) return;
    setBusyMilestoneId(milestoneId);
    const res = await fetch(`/api/admin/payment-projects/${projectId}/milestones/${milestoneId}/mock-dispute`, { method: 'POST' });
    const d = await res.json();
    setBusyMilestoneId(null);
    if (d.success) { showAlert('success', d.message); load(); }
    else showAlert('error', d.error || d.message || 'เกิดข้อผิดพลาด');
  }

  async function cancelProject(projectId: number) {
    if (!confirm('ยืนยันการยกเลิกโครงการนี้? งวดที่ชำระแล้วแต่ยังไม่เริ่มงานจะถูกคืนเงินอัตโนมัติ ส่วนงวดที่กำลังดำเนินงานอยู่จะถูกส่งเข้าคิวข้อโต้แย้ง')) return;
    setBusyCancelId(projectId);
    const res = await fetch(`/api/admin/payment-projects/${projectId}/cancel`, { method: 'POST' });
    const d = await res.json();
    setBusyCancelId(null);
    if (d.success) { showAlert('success', d.message); load(); }
    else showAlert('error', d.error || d.message || 'เกิดข้อผิดพลาด');
  }

  async function resolveDispute(disputeId: number, action: 'release' | 'refund', amount: number) {
    const verb = action === 'release' ? `ปล่อยเงิน ${THB(amount)} ให้ผู้ติดตั้ง` : `คืนเงิน ${THB(amount)} ให้ลูกค้า`;
    if (!confirm(`ยืนยันการตัดสิน: ${verb}? การตัดสินนี้เป็นที่สิ้นสุดและจะแจ้งอีเมลทั้งสองฝ่าย`)) return;
    setBusyDisputeId(disputeId);
    const res = await fetch(`/api/admin/payment-disputes/${disputeId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const d = await res.json();
    setBusyDisputeId(null);
    if (d.success) { showAlert('success', d.message); load(); }
    else showAlert('error', d.error || d.message || 'เกิดข้อผิดพลาด');
  }

  const filteredProjects = projects.filter((p) => {
    const q = projectSearch.toLowerCase();
    if (q && ![p.customer_name, p.title, p.installer_name].some((v) => (v || '').toLowerCase().includes(q))) return false;
    if (projectStatus && p.status !== projectStatus) return false;
    return true;
  });

  const SUB_NAV: { key: typeof section; label: string; badge?: number }[] = [
    { key: 'overview',  label: '📊 ภาพรวม & ตั้งค่า' },
    { key: 'projects',  label: '📋 โครงการ & ธุรกรรม' },
    { key: 'disputes',  label: '⚠️ คิวข้อโต้แย้ง', badge: stats.openDisputes },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {SUB_NAV.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`btn btn-sm ${section === s.key ? 'btn-blue' : 'btn-outline'}`}
          >
            {s.label}
            {(s.badge ?? 0) > 0 && (
              <span className="ml-1.5 badge" style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>{s.badge}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-10 text-center text-[var(--color-muted)] text-sm">กำลังโหลด...</div>
      ) : (
        <>
          {section === 'overview' && (
            <div className="space-y-4">
              <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="font-bold mb-1">💳 ระบบผ่อนชำระตามงวดงาน (Milestone Payment)</div>
                  <p className="text-xs text-[var(--color-muted)]">เปิด/ปิดฟีเจอร์นี้ทั้งระบบ — เมื่อปิด ผู้ติดตั้งจะไม่สามารถสร้างแผนงวดใหม่ได้</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="badge" style={enabled ? { background: 'rgba(16,185,129,0.08)', color: '#059669' } : { background: '#f3f4f6', color: '#6b7280' }}>
                    {enabled ? 'เปิดใช้งานอยู่' : 'ปิดใช้งานอยู่'}
                  </span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={enabled} disabled={togglingFlag} onChange={toggleFlag} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: '📁', label: 'โครงการทั้งหมด', val: stats.totalProjects, color: '#3b82f6' },
                  { icon: '🔧', label: 'กำลังดำเนินงาน', val: stats.activeProjects, color: '#0262EC' },
                  { icon: '🔒', label: 'มูลค่าเงินที่พักไว้', val: THB(stats.escrowValue), color: '#4338ca' },
                  { icon: '⚠️', label: 'ข้อโต้แย้งที่เปิดอยู่', val: stats.openDisputes, color: '#ef4444' },
                ].map((s) => (
                  <div key={s.label} className="card p-4 text-center">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-xl font-bold" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-xs text-[var(--color-muted)]">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'projects' && (
            <div className="space-y-4">
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border)]">
                  <div className="font-bold mb-3">
                    โครงการ {filteredProjects.length !== projects.length ? `${filteredProjects.length} / ${projects.length}` : `(${projects.length})`}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      className="form-input py-1.5 text-sm"
                      style={{ minWidth: 200, flex: '1 1 200px' }}
                      placeholder="🔍 ค้นหาลูกค้า / โครงการ / ผู้ติดตั้ง..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                    />
                    <select className="form-input py-1.5 text-sm" style={{ width: 'auto', minWidth: 150 }} value={projectStatus} onChange={(e) => setProjectStatus(e.target.value)}>
                      <option value="">สถานะทั้งหมด</option>
                      {Object.entries(PROJECT_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                        <th className="text-left px-4 py-3">โครงการ / ลูกค้า</th>
                        <th className="text-left px-4 py-3">ผู้ติดตั้ง</th>
                        <th className="text-left px-4 py-3">มูลค่ารวม</th>
                        <th className="text-left px-4 py-3">ความคืบหน้า</th>
                        <th className="text-left px-4 py-3">สถานะ</th>
                        <th className="text-left px-4 py-3">แจ้งเตือน</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-[var(--color-muted)] text-sm">ไม่พบรายการที่ตรงกัน</td></tr>
                      ) : filteredProjects.map((p) => (
                        <Fragment key={p.id}>
                          <tr className="border-t border-[var(--color-border)] hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedProject(expandedProject === p.id ? null : p.id)}>
                            <td className="px-4 py-3">
                              <div className="font-medium">{p.title}</div>
                              <div className="text-xs text-[var(--color-muted)]">{p.customer_name}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[var(--color-muted)]">{p.installer_name}</td>
                            <td className="px-4 py-3 font-medium">{THB(p.total_amount)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <ProgressTrack milestones={p.milestones} />
                                <span className="text-xs text-[var(--color-muted)] whitespace-nowrap">
                                  {p.milestones.filter((m) => ['released', 'refunded'].includes(m.status)).length}/{p.milestones.length}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3"><StatusPill map={PROJECT_STATUS_MAP} status={p.status} /></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <span className="tbadge blue">📧</span>
                                {((p.customer_notify_channel !== 'email' && p.customer_line_user_id) || (p.installer_notify_channel !== 'email' && p.installer_line_linked)) && (
                                  <span className="tbadge green">💬</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[var(--color-primary)]">{expandedProject === p.id ? 'ซ่อน ▲' : 'ดู ▼'}</td>
                          </tr>
                          {expandedProject === p.id && (
                            <tr key={`${p.id}-detail`} className="border-t border-[var(--color-border)] bg-[var(--color-bg-alt)]">
                              <td colSpan={7} className="px-4 py-4">
                                <div className="space-y-2">
                                  {p.milestones.map((m) => (
                                    <div key={m.id} className="flex flex-wrap items-center gap-2 justify-between bg-white rounded-lg border border-[var(--color-border)] px-3 py-2">
                                      <div className="text-xs">
                                        <span className="font-semibold">งวด {m.seq}</span> · {m.description} · <span className="font-medium">{THB(m.amount)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <StatusPill map={MILESTONE_STATUS_MAP} status={m.status} />
                                        {m.status === 'pending_payment' && (
                                          <button
                                            className="btn btn-xs btn-outline"
                                            disabled={busyMilestoneId === m.id}
                                            onClick={(e) => { e.stopPropagation(); mockPay(p.id, m.id); }}
                                          >
                                            {busyMilestoneId === m.id ? '⏳' : '💳'} บันทึกว่าชำระแล้ว (Manual/ทดสอบ)
                                          </button>
                                        )}
                                        {m.status === 'awaiting_confirmation' && (
                                          <button
                                            className="btn btn-xs btn-ghost border border-[var(--color-border)]"
                                            disabled={busyMilestoneId === m.id}
                                            onClick={(e) => { e.stopPropagation(); mockDispute(p.id, m.id); }}
                                          >
                                            {busyMilestoneId === m.id ? '⏳' : '⚠️'} จำลองข้อโต้แย้ง (ทดสอบ)
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {!['completed', 'cancelled'].includes(p.status) && (
                                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                                    <button
                                      className="btn btn-xs btn-danger-outline"
                                      disabled={busyCancelId === p.id}
                                      onClick={(e) => { e.stopPropagation(); cancelProject(p.id); }}
                                    >
                                      {busyCancelId === p.id ? '⏳' : '🚫'} ยกเลิกโครงการ
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border)] font-bold">ประวัติธุรกรรม (ล่าสุด {transactions.length} รายการ)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                        <th className="text-left px-4 py-3">วันที่</th>
                        <th className="text-left px-4 py-3">โครงการ</th>
                        <th className="text-left px-4 py-3">งวด</th>
                        <th className="text-left px-4 py-3">ประเภท</th>
                        <th className="text-left px-4 py-3">จำนวนเงิน</th>
                        <th className="text-left px-4 py-3">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-muted)] text-sm">ยังไม่มีธุรกรรม</td></tr>
                      ) : transactions.map((t) => (
                        <tr key={t.id} className="border-t border-[var(--color-border)]">
                          <td className="px-4 py-3 text-xs text-[var(--color-muted)] whitespace-nowrap">{new Date(t.created_at).toLocaleString('th-TH')}</td>
                          <td className="px-4 py-3">{t.project_title}</td>
                          <td className="px-4 py-3 text-xs">งวด {t.milestone_seq}</td>
                          <td className="px-4 py-3">
                            <span className="tbadge" style={t.type === 'hold' ? { background: 'rgba(99,102,241,.1)', color: '#4338ca' } : t.type === 'release' ? { background: '#d1fae5', color: '#065f46' } : { background: '#fee2e2', color: '#991b1b' }}>
                              {t.type === 'hold' ? 'พักเงิน' : t.type === 'release' ? 'ปล่อยเงิน' : 'คืนเงิน'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">{THB(t.amount)}</td>
                          <td className="px-4 py-3 text-xs">
                            <span
                              className="tbadge"
                              style={
                                t.status === 'succeeded'
                                  ? { background: '#d1fae5', color: '#065f46' }
                                  : t.status === 'failed'
                                  ? { background: '#fee2e2', color: '#991b1b' }
                                  : { background: '#fef3c7', color: '#92400e' }
                              }
                            >
                              {t.status === 'succeeded' ? 'สำเร็จ' : t.status === 'failed' ? 'ไม่สำเร็จ' : 'รอยืนยัน'}
                            </span>
                            <div className="text-[var(--color-muted)] mt-0.5" title={t.provider_reference_id || ''}>{t.provider_reference_id}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {section === 'disputes' && (
            <div className="space-y-4">
              {disputes.filter((d) => d.status === 'open').length === 0 ? (
                <div className="card p-10 text-center text-[var(--color-muted)] text-sm">ไม่มีข้อโต้แย้งที่รอการพิจารณา 🎉</div>
              ) : disputes.filter((d) => d.status === 'open').map((d) => (
                <div key={d.id} className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="font-bold">{d.project_title} — งวดที่ {d.milestone_seq}</div>
                      <div className="text-xs text-[var(--color-muted)]">ผู้ติดตั้ง: {d.installer_name} · ลูกค้า: {d.customer_name} · เปิดเมื่อ {new Date(d.created_at).toLocaleDateString('th-TH')}</div>
                    </div>
                    <span className="badge badge-danger">⚠️ มีข้อโต้แย้ง</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="rounded-lg border border-[var(--color-border)] p-3">
                      <div className="text-xs font-semibold text-[var(--color-muted)] mb-1">งานที่ผู้ติดตั้งแจ้งว่าเสร็จแล้ว</div>
                      <div className="text-sm">{d.milestone_description}</div>
                      <div className="text-sm font-medium mt-1">{THB(d.milestone_amount)}</div>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <div className="text-xs font-semibold text-[#991b1b] mb-1">เหตุผลที่ลูกค้าโต้แย้ง ({d.raised_by === 'customer' ? 'ลูกค้าเป็นผู้แจ้ง' : 'ผู้ติดตั้งเป็นผู้แจ้ง'})</div>
                      <div className="text-sm">{d.reason}</div>
                    </div>
                  </div>
                  <div className="alert alert-info mb-3"><span>ℹ️</span> การตัดสินนี้เป็นที่สิ้นสุดและจะแจ้งอีเมลทั้งสองฝ่ายทันที</div>
                  <div className="flex gap-2 flex-wrap">
                    <button className="btn btn-blue btn-sm" disabled={busyDisputeId === d.id} onClick={() => resolveDispute(d.id, 'release', d.milestone_amount)}>
                      {busyDisputeId === d.id ? '⏳' : '✓'} ปล่อยเงินให้ผู้ติดตั้ง ({THB(d.milestone_amount)})
                    </button>
                    <button className="btn btn-danger-outline btn-sm" disabled={busyDisputeId === d.id} onClick={() => resolveDispute(d.id, 'refund', d.milestone_amount)}>
                      {busyDisputeId === d.id ? '⏳' : '↩'} คืนเงินให้ลูกค้า ({THB(d.milestone_amount)})
                    </button>
                  </div>
                </div>
              ))}

              {disputes.filter((d) => d.status !== 'open').length > 0 && (
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-[var(--color-border)] font-bold">ประวัติข้อโต้แย้งที่ตัดสินแล้ว</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                          <th className="text-left px-4 py-3">โครงการ</th>
                          <th className="text-left px-4 py-3">งวด</th>
                          <th className="text-left px-4 py-3">ผลการตัดสิน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {disputes.filter((d) => d.status !== 'open').map((d) => (
                          <tr key={d.id} className="border-t border-[var(--color-border)]">
                            <td className="px-4 py-3">{d.project_title}</td>
                            <td className="px-4 py-3 text-xs">งวด {d.milestone_seq}</td>
                            <td className="px-4 py-3">
                              <span className="badge" style={d.status === 'resolved_release' ? { background: '#d1fae5', color: '#065f46' } : { background: '#fee2e2', color: '#991b1b' }}>
                                {d.status === 'resolved_release' ? '✓ ปล่อยเงินให้ผู้ติดตั้ง' : '↩ คืนเงินให้ลูกค้า'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
