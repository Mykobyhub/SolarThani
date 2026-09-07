'use client';

import { useState } from 'react';
import AssignPicker, { type RosterItem } from './AssignPicker';
import { JOB_CATEGORIES, CATEGORY_ICON, type JobCategory } from '@/lib/subcontractor/constants';

export interface JobRow {
  id: number;
  milestone_id: number;
  category: JobCategory;
  subcontractor_id: number;
  status: 'assigned' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  submitted_note: string | null;
  submitted_at: string | null;
  rejected_reason: string | null;
  rejected_at: string | null;
  approved_at: string | null;
  previous_subcontractor_id: number | null;
  previous_subcontractor_name: string | null;
  reassigned_at: string | null;
  subcontractor_name: string;
  subcontractor_phone: string | null;
  subcontractor_line_user_id: string | null;
  photos: string[];
}

interface LogEntry { id: number; kind: 'text' | 'photo' | 'system'; body: string; created_at: string }

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  assigned: { label: 'มอบหมายแล้ว', cls: 'badge-primary' },
  in_progress: { label: '🔧 กำลังดำเนินงาน', cls: 'badge-primary' },
  submitted: { label: '📩 ส่งงานรอตรวจ', cls: 'badge-warning' },
  approved: { label: '✅ อนุมัติแล้ว', cls: 'badge-success' },
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('th-TH') : '—');

export default function JobsPanel({
  projectId,
  milestoneId,
  jobs,
  roster,
  onChanged,
}: {
  projectId: number;
  milestoneId: number;
  jobs: JobRow[];
  roster: RosterItem[];
  onChanged: () => void;
}) {
  const [picker, setPicker] = useState<{ jobId: number | null; category: JobCategory } | null>(null);
  const [busy, setBusy] = useState(false);
  const [expandedLog, setExpandedLog] = useState<Record<number, LogEntry[] | 'loading'>>({});
  const [rejecting, setRejecting] = useState<{ jobId: number; reason: string } | null>(null);
  const [inviteCopiedFor, setInviteCopiedFor] = useState<number | null>(null);

  const base = `/api/installer/payment-projects/${projectId}/milestones/${milestoneId}/jobs`;

  async function assign(category: JobCategory, payload: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, ...payload }) });
    const d = await res.json();
    setBusy(false);
    if (d.success) { setPicker(null); onChanged(); } else alert(d.message || 'เกิดข้อผิดพลาด');
  }

  async function reassign(jobId: number, payload: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`${base}/${jobId}/reassign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await res.json();
    setBusy(false);
    if (d.success) { setPicker(null); onChanged(); } else alert(d.message || 'เกิดข้อผิดพลาด');
  }

  async function approve(jobId: number) {
    setBusy(true);
    const res = await fetch(`${base}/${jobId}/approve`, { method: 'POST' });
    const d = await res.json();
    setBusy(false);
    if (d.success) onChanged(); else alert(d.message || 'เกิดข้อผิดพลาด');
  }

  async function reject(jobId: number, reason: string) {
    if (!reason.trim()) return;
    setBusy(true);
    const res = await fetch(`${base}/${jobId}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: reason.trim() }) });
    const d = await res.json();
    setBusy(false);
    if (d.success) { setRejecting(null); onChanged(); } else alert(d.message || 'เกิดข้อผิดพลาด');
  }

  async function toggleLog(jobId: number) {
    if (expandedLog[jobId]) { setExpandedLog((s) => { const n = { ...s }; delete n[jobId]; return n; }); return; }
    setExpandedLog((s) => ({ ...s, [jobId]: 'loading' }));
    const res = await fetch(`${base}/${jobId}/updates`);
    const d = await res.json();
    setExpandedLog((s) => ({ ...s, [jobId]: d.success ? d.updates : [] }));
  }

  async function copyInvite(subcontractorId: number) {
    const res = await fetch(`/api/installer/subcontractors/${subcontractorId}/line-link-code`, { method: 'POST' });
    const d = await res.json();
    if (!d.success) { alert(d.message || 'เกิดข้อผิดพลาด'); return; }
    await navigator.clipboard?.writeText(d.inviteMessage);
    setInviteCopiedFor(subcontractorId);
    setTimeout(() => setInviteCopiedFor(null), 2000);
  }

  const remainingCategories = JOB_CATEGORIES.filter((c) => !jobs.some((j) => j.category === c));
  const approvedCount = jobs.filter((j) => j.status === 'approved').length;

  return (
    <div className="jobs-panel">
      {jobs.length > 0 && (
        <span className={`badge ${approvedCount === jobs.length ? 'badge-success' : 'badge-warning'}`} style={{ alignSelf: 'flex-start' }}>
          👷 {approvedCount}/{jobs.length} อนุมัติแล้ว
          {approvedCount < jobs.length && ' · งวดยังกดเสร็จได้ แต่แนะนำให้ตรวจงานที่รออยู่ก่อน'}
        </span>
      )}

      {jobs.map((job) => {
        const badge = STATUS_BADGE[job.status] || { label: job.status, cls: 'badge-primary' };
        const canReassign = job.status === 'assigned' || job.status === 'in_progress';
        const pickerOpenHere = picker?.jobId === job.id;
        const log = expandedLog[job.id];

        return (
          <div className="job-row" key={job.id}>
            <div className="job-row-top">
              <span className="job-cat"><span className="job-cat-icon">{CATEGORY_ICON[job.category]}</span> {job.category}</span>
              <div className="job-row-status-slot">
                <span className={`badge ${badge.cls}`}>{badge.label}</span>
                <span className="text-xs text-[var(--color-muted)]">{job.subcontractor_name}</span>
                {!job.subcontractor_line_user_id && (
                  <span className="job-line-warn">
                    ⚠️ ยังไม่เชื่อมต่อ LINE — ช่างจะไม่เห็นงานนี้จนกว่าจะเชื่อมต่อ
                    <button type="button" className="underline ml-1" onClick={() => copyInvite(job.subcontractor_id)}>
                      {inviteCopiedFor === job.subcontractor_id ? '✓ คัดลอกแล้ว' : '📋 คัดลอกข้อความเชิญ LINE อีกครั้ง'}
                    </button>
                  </span>
                )}
                {canReassign && (
                  <button type="button" className="btn btn-xs btn-outline" disabled={busy} onClick={() => setPicker(pickerOpenHere ? null : { jobId: job.id, category: job.category })}>
                    🔁 เปลี่ยนช่าง
                  </button>
                )}
                <button type="button" className="text-xs text-[var(--color-primary)] hover:underline" onClick={() => toggleLog(job.id)}>
                  {log ? 'ซ่อนประวัติ' : 'ดูประวัติ'}
                </button>
              </div>
            </div>

            {job.status === 'in_progress' && job.rejected_reason && (
              <p className="text-xs text-[var(--color-muted)]">↩ ตีกลับล่าสุด: {job.rejected_reason}</p>
            )}

            {job.status === 'approved' && (
              <p className="text-xs text-[var(--color-muted)]">
                อนุมัติเมื่อ {fmt(job.approved_at)} · ไม่มีตัวเลือก &quot;เปลี่ยนช่าง&quot; หลังงานอนุมัติแล้ว
              </p>
            )}

            {job.previous_subcontractor_name && (
              <div className="job-reassign-note">
                🔁 เปลี่ยนจาก {job.previous_subcontractor_name} → {job.subcontractor_name} เมื่อ {fmt(job.reassigned_at)} · สถานะงานถูกรีเซ็ตเป็น &quot;มอบหมายแล้ว&quot; — ประวัติงาน/รูปของช่างคนเดิมยังเก็บไว้เป็นประวัติ
              </div>
            )}

            {job.status === 'submitted' && (
              <div className="job-row-detail">
                <div className="text-xs text-[var(--color-muted)]">ส่งงานเมื่อ {fmt(job.submitted_at)}</div>
                {job.submitted_note && <div className="text-sm">{job.submitted_note}</div>}
                {job.photos.length > 0 && (
                  <div className="job-photos">
                    {job.photos.map((p) => (
                      <a key={p} href={p} target="_blank" rel="noopener"><img src={p} alt="รูปงาน" className="job-photo-thumb" /></a>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-sm btn-success" disabled={busy} onClick={() => approve(job.id)}>✓ อนุมัติงาน</button>
                  <button type="button" className="btn btn-sm btn-danger-outline" disabled={busy} onClick={() => setRejecting({ jobId: job.id, reason: '' })}>↩ ตีกลับให้แก้ไข</button>
                </div>
                <p className="form-hint">เปลี่ยนช่างได้อีกครั้งเมื่อตีกลับงานนี้กลับไปเป็น &quot;กำลังดำเนินงาน&quot; ก่อน</p>
                {rejecting?.jobId === job.id && (
                  <div className="space-y-2">
                    <textarea className="form-input" rows={2} placeholder="เหตุผลที่ตีกลับ" value={rejecting.reason}
                      onChange={(e) => setRejecting({ jobId: job.id, reason: e.target.value })} />
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-sm btn-danger-outline" disabled={busy || !rejecting.reason.trim()} onClick={() => reject(job.id, rejecting.reason)}>ยืนยันตีกลับ</button>
                      <button type="button" className="btn btn-sm btn-ghost border border-[var(--color-border)]" onClick={() => setRejecting(null)}>ยกเลิก</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {log && log !== 'loading' && (
              <div className="job-log">
                {log.length === 0 ? (
                  <p className="text-xs text-[var(--color-muted)]">ยังไม่มีประวัติ</p>
                ) : (
                  log.map((e) => (
                    <div className="job-log-entry" key={e.id}>
                      <span className="job-log-time">{fmt(e.created_at)}</span>
                      <span className="job-log-text">{e.kind === 'photo' ? <a href={e.body} target="_blank" rel="noopener">📷 รูปภาพ</a> : e.body}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {pickerOpenHere && (
              <AssignPicker
                category={job.category}
                roster={roster}
                currentSubcontractorId={job.subcontractor_id}
                busy={busy}
                onPickExisting={(subId) => reassign(job.id, { subcontractorId: subId })}
                onCreateAndAssign={(name, phone, tags) => reassign(job.id, { name, phone, specialtyTags: tags })}
                onCancel={() => setPicker(null)}
              />
            )}
          </div>
        );
      })}

      {remainingCategories.map((c) => {
        const pickerOpenHere = picker?.jobId === null && picker.category === c;
        return (
          <div className="job-row" key={c}>
            <div className="job-row-top">
              <span className="job-cat"><span className="job-cat-icon">{CATEGORY_ICON[c]}</span> {c}</span>
              <div className="job-row-status-slot">
                <span className="badge badge-warning">ยังไม่ได้มอบหมาย</span>
                <button type="button" className="btn btn-xs btn-outline" disabled={busy} onClick={() => setPicker(pickerOpenHere ? null : { jobId: null, category: c })}>
                  + มอบหมาย
                </button>
              </div>
            </div>
            {pickerOpenHere && (
              <AssignPicker
                category={c}
                roster={roster}
                busy={busy}
                onPickExisting={(subId) => assign(c, { subcontractorId: subId })}
                onCreateAndAssign={(name, phone, tags) => assign(c, { name, phone, specialtyTags: tags })}
                onCancel={() => setPicker(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
