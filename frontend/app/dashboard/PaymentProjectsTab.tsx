'use client';

import { useEffect, useState, useCallback } from 'react';
import ChannelPicker from '@/components/payment/ChannelPicker';
import LineConnect from '@/components/payment/LineConnect';
import JobsPanel, { type JobRow } from '@/components/subcontractor/JobsPanel';
import type { RosterItem } from '@/components/subcontractor/AssignPicker';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  province: string;
}

interface Milestone {
  id: number;
  project_id: number;
  seq: number;
  description: string;
  amount: number;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  released_at: string | null;
  release_reference: string | null;
  release_transferred_at: string | null;
  jobs: JobRow[];
}

interface Project {
  id: number;
  customer_name: string;
  title: string;
  address: string | null;
  total_amount: number;
  status: string;
  milestone_count: number;
  released_count: number;
  milestones: Milestone[];
  created_at: string;
  installer_notify_channel: string;
}

const PROJECT_STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  proposed:               { label: 'รอลูกค้ายอมรับแผน', bg: '#f3f4f6', color: '#374151' },
  awaiting_first_payment: { label: 'รอชำระงวดแรก',      bg: '#fef3c7', color: '#92400e' },
  active:                 { label: 'กำลังดำเนินงาน',     bg: 'rgba(2,98,236,0.08)', color: 'var(--color-primary)' },
  completed:              { label: 'เสร็จสมบูรณ์',       bg: 'rgba(16,185,129,0.08)', color: '#059669' },
  disputed:               { label: 'มีข้อโต้แย้ง',        bg: 'rgba(239,68,68,.1)', color: '#b91c1c' },
  cancelled:              { label: 'ยกเลิกแล้ว',          bg: '#f3f4f6', color: '#6b7280' },
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

const THB = (n: number) => `฿${Math.round(n).toLocaleString('th-TH')}`;

function ProjectStatusBadge({ status }: { status: string }) {
  const s = PROJECT_STATUS_MAP[status] ?? { label: status, bg: '#f3f4f6', color: '#374151' };
  return <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function MilestoneStatusBadge({ status }: { status: string }) {
  const s = MILESTONE_STATUS_MAP[status] ?? { label: status, bg: '#f3f4f6', color: '#374151' };
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
        return <div key={m.id} className={`progress-seg ${cls}`} />;
      })}
    </div>
  );
}

const MILESTONE_MARKER: Record<string, string> = {
  pending_payment: '',
  paid_hold: 'is-warn',
  in_progress: 'is-active',
  awaiting_confirmation: 'is-warn',
  released: 'is-done',
  disputed: 'is-danger',
  refunded: 'is-done',
  cancelled: '',
};

interface MilestoneDraft { description: string; amount: string }

export default function PaymentProjectsTab() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [busyMilestoneId, setBusyMilestoneId] = useState<number | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [line, setLine] = useState({ enabled: false, oaBasicId: '', linked: false });
  const [savingChannel, setSavingChannel] = useState(false);
  const [roster, setRoster] = useState<RosterItem[]>([]);

  // Create form state
  const [leadId, setLeadId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [milestoneDrafts, setMilestoneDrafts] = useState<MilestoneDraft[]>([{ description: '', amount: '' }, { description: '', amount: '' }]);
  const [submitting, setSubmitting] = useState(false);

  function showAlert(type: 'success' | 'error', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/installer/payment-projects');
    const d = await res.json();
    if (d.success) { setProjects(d.projects); setAvailableLeads(d.availableLeads); setEnabled(!!d.enabled); if (d.line) setLine(d.line); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadRoster = useCallback(async () => {
    const res = await fetch('/api/installer/subcontractors');
    const d = await res.json();
    if (d.success) setRoster(d.subcontractors);
  }, []);

  useEffect(() => { if (view === 'detail') loadRoster(); }, [view, loadRoster]);

  async function generateLineCode() {
    const res = await fetch('/api/installer/line-link-code', { method: 'POST' });
    const d = await res.json();
    if (d.success) return { code: d.code, expiresAt: d.expiresAt, addFriendUrl: d.addFriendUrl };
    showAlert('error', d.error || d.message || 'เกิดข้อผิดพลาด');
    return null;
  }

  async function unlinkLine() {
    await fetch('/api/installer/line-link', { method: 'DELETE' });
    await load();
  }

  async function checkLineLinked() {
    const res = await fetch('/api/installer/payment-projects');
    const d = await res.json();
    if (d.success && d.line) { setLine(d.line); return !!d.line.linked; }
    return false;
  }

  async function setProjectChannel(projectId: number, channel: string) {
    setSavingChannel(true);
    const res = await fetch(`/api/installer/payment-projects/${projectId}/notify-channel`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel }),
    });
    const d = await res.json();
    setSavingChannel(false);
    if (d.success) { showAlert('success', d.message); load(); } else showAlert('error', d.error || d.message);
  }

  const totalDraft = milestoneDrafts.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);

  function addMilestoneRow() { setMilestoneDrafts((d) => [...d, { description: '', amount: '' }]); }
  function removeMilestoneRow(idx: number) { setMilestoneDrafts((d) => d.filter((_, i) => i !== idx)); }
  function updateMilestoneRow(idx: number, patch: Partial<MilestoneDraft>) {
    setMilestoneDrafts((d) => d.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }

  function resetCreateForm() {
    setLeadId(''); setTitle(''); setAddress('');
    setMilestoneDrafts([{ description: '', amount: '' }, { description: '', amount: '' }]);
  }

  async function submitPlan() {
    if (!leadId) { showAlert('error', 'กรุณาเลือกลูกค้า'); return; }
    if (!title.trim()) { showAlert('error', 'กรุณาระบุชื่อโครงการ'); return; }
    if (milestoneDrafts.some((m) => !m.description.trim() || !(parseFloat(m.amount) > 0))) {
      showAlert('error', 'กรุณากรอกคำอธิบายและจำนวนเงินให้ครบทุกงวด');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/installer/payment-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        title,
        address,
        milestones: milestoneDrafts.map((m) => ({ description: m.description.trim(), amount: parseFloat(m.amount) })),
      }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (d.success) {
      showAlert('success', d.message || 'สร้างแผนงวดสำเร็จ');
      resetCreateForm();
      setView('list');
      load();
    } else {
      showAlert('error', d.error || d.message || 'เกิดข้อผิดพลาด');
    }
  }

  async function startMilestone(projectId: number, milestoneId: number) {
    setBusyMilestoneId(milestoneId);
    const res = await fetch(`/api/installer/payment-projects/${projectId}/milestones/${milestoneId}/start`, { method: 'POST' });
    const d = await res.json();
    setBusyMilestoneId(null);
    if (d.success) { showAlert('success', d.message); load(); } else showAlert('error', d.error || d.message || 'เกิดข้อผิดพลาด');
  }

  async function completeMilestone(projectId: number, milestoneId: number) {
    if (!confirm('ยืนยันว่างวดนี้เสร็จสมบูรณ์แล้ว? ระบบจะแจ้งให้ลูกค้ายืนยันเพื่อปล่อยเงิน')) return;
    setBusyMilestoneId(milestoneId);
    const res = await fetch(`/api/installer/payment-projects/${projectId}/milestones/${milestoneId}/complete`, { method: 'POST' });
    const d = await res.json();
    setBusyMilestoneId(null);
    if (d.success) { showAlert('success', d.message); load(); } else showAlert('error', d.error || d.message || 'เกิดข้อผิดพลาด');
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  if (!enabled) {
    return (
      <div className="card p-8 text-center text-[var(--color-muted)] text-sm">
        ฟีเจอร์ผ่อนชำระตามงวดงานยังไม่เปิดใช้งานในขณะนี้ กรุณาติดต่อผู้ดูแลระบบ
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alert && (
        <div className={`alert ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          <span>{alert.type === 'success' ? '✅' : '⚠️'}</span> {alert.msg}
        </div>
      )}

      {loading ? (
        <div className="card p-10 text-center text-[var(--color-muted)] text-sm">กำลังโหลด...</div>
      ) : view === 'create' ? (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">+ สร้างแผนงวดใหม่</h2>
            <button className="btn btn-ghost btn-sm border border-[var(--color-border)]" onClick={() => { setView('list'); resetCreateForm(); }}>ยกเลิก</button>
          </div>

          <div className="form-group">
            <label className="form-label">ลูกค้า (จาก Lead ที่ปิดงานแล้ว)</label>
            <select className="form-input" value={leadId} onChange={(e) => setLeadId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">-- เลือกลูกค้า --</option>
              {availableLeads.map((l) => (
                <option key={l.id} value={l.id}>{l.name} · {l.province} · {l.phone}</option>
              ))}
            </select>
            {availableLeads.length === 0 && (
              <p className="form-hint">ไม่มีลูกค้าที่ปิดงานแล้วและยังไม่มีแผนงวด — ปิดงานลูกค้าในแท็บ &quot;ลูกค้า&quot; ก่อน</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">ชื่อโครงการ</label>
              <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น ติดตั้งโซลาร์เซลล์ 10kW" />
            </div>
            <div className="form-group">
              <label className="form-label">ที่อยู่หน้างาน</label>
              <input type="text" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ไม่บังคับ" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">แผนการแบ่งงวด</label>
            <div className="space-y-2">
              {milestoneDrafts.map((m, idx) => (
                <div key={idx} className="builder-row">
                  <span className="badge badge-primary shrink-0">{idx + 1}</span>
                  <input
                    type="text"
                    className="form-input py-1.5 text-sm"
                    placeholder="คำอธิบายงวด เช่น มัดจำ + เริ่มงาน"
                    value={m.description}
                    onChange={(e) => updateMilestoneRow(idx, { description: e.target.value })}
                  />
                  <input
                    type="number"
                    className="form-input py-1.5 text-sm"
                    style={{ width: 140 }}
                    placeholder="จำนวนเงิน"
                    value={m.amount}
                    onChange={(e) => updateMilestoneRow(idx, { amount: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn btn-xs shrink-0"
                    style={{ background: '#fee2e2', color: '#991b1b', border: 'none' }}
                    disabled={milestoneDrafts.length <= 2}
                    onClick={() => removeMilestoneRow(idx)}
                  >ลบ</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-ghost btn-sm border border-dashed border-[var(--color-border)] w-full mt-2" onClick={addMilestoneRow}>+ เพิ่มงวด</button>
          </div>

          <div className="alert alert-info">
            <span>ℹ️</span> รวมทุกงวด: <strong>{THB(totalDraft)}</strong> — ระบบจะรวมยอดจากงวดที่กรอกโดยอัตโนมัติเป็นมูลค่าโครงการทั้งหมด
          </div>

          <button className="btn btn-primary" disabled={submitting} onClick={submitPlan}>
            {submitting ? '⏳ กำลังส่ง...' : 'ส่งแผนให้ลูกค้ายืนยัน'}
          </button>
        </div>
      ) : view === 'detail' && selectedProject ? (
        <div className="space-y-4">
          <button className="btn btn-ghost btn-sm border border-[var(--color-border)]" onClick={() => setView('list')}>← กลับไปรายการโครงการ</button>

          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h2 className="font-bold text-base">{selectedProject.title}</h2>
              <ProjectStatusBadge status={selectedProject.status} />
            </div>
            <div className="text-sm text-[var(--color-muted)]">
              ลูกค้า: {selectedProject.customer_name}{selectedProject.address ? ` · ${selectedProject.address}` : ''} · มูลค่ารวม {THB(selectedProject.total_amount)}
            </div>
          </div>

          {selectedProject.milestones.some((m) => m.status === 'disputed') && (
            <div className="alert alert-error">
              <span>⚠️</span> โครงการนี้มีงวดที่อยู่ระหว่างพิจารณาข้อพิพาท เงินถูกพักไว้จนกว่า Admin จะตัดสิน และจะไม่สามารถดำเนินงวดถัดไปได้จนกว่าจะได้ข้อสรุป
            </div>
          )}

          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-4">งวดงาน</h3>
            <div className="milestone-timeline">
              {selectedProject.milestones.map((m, idx) => (
                <div key={m.id} className="milestone-item">
                  <div className="milestone-rail">
                    <div className={`milestone-marker ${MILESTONE_MARKER[m.status] || ''}`}>{m.seq}</div>
                    {idx < selectedProject.milestones.length - 1 && (
                      <div className={`milestone-connector ${['released', 'refunded'].includes(m.status) ? 'is-filled' : ''}`} />
                    )}
                  </div>
                  <div className="milestone-body">
                    <div className="milestone-head">
                      <span className="milestone-title">งวดที่ {m.seq}</span>
                      <MilestoneStatusBadge status={m.status} />
                    </div>
                    <div className="milestone-desc">{m.description} · {THB(m.amount)}</div>
                    <div className="milestone-actions">
                      {m.status === 'pending_payment' && <span className="text-xs text-[var(--color-muted)]">รอชำระเงิน</span>}
                      {m.status === 'paid_hold' && (
                        <button className="btn btn-sm btn-blue" disabled={busyMilestoneId === m.id} onClick={() => startMilestone(selectedProject.id, m.id)}>
                          {busyMilestoneId === m.id ? '⏳' : '▶'} เริ่มงานงวดนี้
                        </button>
                      )}
                      {m.status === 'in_progress' && (
                        <button className="btn btn-sm btn-primary" disabled={busyMilestoneId === m.id} onClick={() => completeMilestone(selectedProject.id, m.id)}>
                          {busyMilestoneId === m.id ? '⏳' : '✓'} แจ้งงวดนี้เสร็จแล้ว
                        </button>
                      )}
                      {m.status === 'awaiting_confirmation' && <span className="text-xs text-[var(--color-muted)]">รอลูกค้ายืนยัน</span>}
                      {m.status === 'disputed' && <button className="btn btn-sm btn-ghost border border-[var(--color-border)]" disabled>รอผลการพิจารณา</button>}
                      {m.status === 'released' && (
                        <span className="text-xs text-[var(--color-muted)]">
                          ปล่อยเงินแล้ว{m.released_at ? ` เมื่อ ${new Date(m.released_at).toLocaleDateString('th-TH')}` : ''}
                        </span>
                      )}
                      {m.status === 'refunded' && <span className="text-xs text-[var(--color-muted)]">คืนเงินให้ลูกค้าแล้ว</span>}
                    </div>
                    <JobsPanel projectId={selectedProject.id} milestoneId={m.id} jobs={m.jobs || []} roster={roster} onChanged={load} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-2">💰 ประวัติการรับเงิน</h3>
            <div className="alert alert-info mb-3">
              <span>ℹ️</span> เงินจะถูกโอนเข้าบัญชีที่ลงทะเบียนไว้ภายใน 1–2 วันทำการหลังลูกค้ายืนยันงวดงาน คุณจะได้รับแจ้งเตือนทันทีที่โอนสำเร็จ
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                    <th className="text-left px-3 py-2">งวดที่</th>
                    <th className="text-left px-3 py-2">จำนวนเงิน</th>
                    <th className="text-left px-3 py-2">วันที่โอน</th>
                    <th className="text-left px-3 py-2">เลขอ้างอิงการโอน</th>
                    <th className="text-left px-3 py-2">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProject.milestones.map((m) => (
                    <tr key={m.id} className="border-t border-[var(--color-border)]">
                      <td className="px-3 py-2">งวด {m.seq}</td>
                      {['released', 'refunded'].includes(m.status) ? (
                        <>
                          <td className="px-3 py-2 font-medium">{THB(m.amount)}</td>
                          <td className="px-3 py-2 text-xs text-[var(--color-muted)]">
                            {(m.release_transferred_at || m.released_at) ? new Date(m.release_transferred_at || m.released_at!).toLocaleDateString('th-TH') : '—'}
                          </td>
                          <td className="px-3 py-2 text-xs font-mono text-[var(--color-muted)]">{m.release_reference || '—'}</td>
                          <td className="px-3 py-2">
                            <span className="badge" style={m.status === 'released' ? { background: 'rgba(16,185,129,0.08)', color: '#059669' } : { background: '#e0e7ff', color: '#3730a3' }}>
                              {m.status === 'released' ? 'โอนสำเร็จ' : 'คืนเงินแล้ว (ลูกค้า)'}
                            </span>
                          </td>
                        </>
                      ) : (
                        <td colSpan={4} className="px-3 py-2 text-xs text-[var(--color-muted)]">— รอลูกค้ายืนยันงานก่อนจึงจะปล่อยเงิน —</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-3">🔔 ช่องทางการแจ้งเตือน</h3>
            {line.enabled ? (
              <div className="space-y-4">
                <ChannelPicker
                  value={selectedProject.installer_notify_channel || 'email'}
                  lineLinked={line.linked}
                  disabled={savingChannel}
                  onChange={(ch) => setProjectChannel(selectedProject.id, ch)}
                />
                <LineConnect
                  linked={line.linked}
                  oaBasicId={line.oaBasicId}
                  lineEnabled={line.enabled}
                  onGenerateCode={generateLineCode}
                  onUnlink={unlinkLine}
                  onCheckLinked={checkLineLinked}
                />
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">ระบบแจ้งเตือนทาง LINE ยังไม่เปิดใช้งานโดยผู้ดูแลระบบ — คุณจะได้รับแจ้งเตือนทางอีเมล</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn btn-primary btn-sm" onClick={() => setView('create')}>+ สร้างแผนใหม่</button>
          </div>
          {projects.length === 0 ? (
            <div className="card p-10 text-center text-[var(--color-muted)] text-sm">
              ยังไม่มีโครงการผ่อนชำระ — กด &quot;+ สร้างแผนใหม่&quot; เพื่อเริ่มจากลูกค้าที่ปิดงานแล้ว
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                      <th className="text-left px-4 py-3">โครงการ / ลูกค้า</th>
                      <th className="text-left px-4 py-3">มูลค่ารวม</th>
                      <th className="text-left px-4 py-3">ความคืบหน้า</th>
                      <th className="text-left px-4 py-3">สถานะ</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id} className="border-t border-[var(--color-border)] hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedProjectId(p.id); setView('detail'); }}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.title}</div>
                          <div className="text-xs text-[var(--color-muted)]">{p.customer_name}</div>
                        </td>
                        <td className="px-4 py-3 font-medium">{THB(p.total_amount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ProgressTrack milestones={p.milestones} />
                            <span className="text-xs text-[var(--color-muted)] whitespace-nowrap">{p.released_count}/{p.milestone_count}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><ProjectStatusBadge status={p.status} /></td>
                        <td className="px-4 py-3 text-xs text-[var(--color-primary)]">ดู →</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
