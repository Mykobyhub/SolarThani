'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import SpecialtyPicker from '@/components/subcontractor/SpecialtyPicker';
import { parseTags } from '@/lib/subcontractor/constants';

interface SubcontractorRow {
  id: number;
  name: string;
  phone: string | null;
  specialty_tags: string;
  line_user_id: string | null;
  active_job_count: number;
}

interface FormState { name: string; phone: string; tags: string[] }

const emptyForm: FormState = { name: '', phone: '', tags: [] };

export default function SubcontractorsTab() {
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<SubcontractorRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [invitePanelFor, setInvitePanelFor] = useState<number | null>(null);
  const [invite, setInvite] = useState<{ code: string; addFriendUrl: string; oaBasicId: string; inviteMessage: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function showAlert(type: 'success' | 'error', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/installer/subcontractors');
    const d = await res.json();
    if (d.success) setRoster(d.subcontractors);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live-poll one sub-contractor's LINE-link status while their invite panel is open — mirrors
  // components/payment/LineConnect.tsx's polling pattern (4s interval, cleared on unmount / once
  // linked), so the roster flips to "🔗 เชื่อมต่อแล้ว" automatically without a manual reload.
  const checkSubLinked = useCallback(async (id: number) => {
    const res = await fetch('/api/installer/subcontractors');
    const d = await res.json();
    if (!d.success) return false;
    const sub = (d.subcontractors as SubcontractorRow[]).find((s) => s.id === id);
    return !!sub?.line_user_id;
  }, []);

  useEffect(() => {
    if (invitePanelFor === null) return;
    const sub = roster.find((s) => s.id === invitePanelFor);
    if (!sub || sub.line_user_id) return;
    const id = invitePanelFor;
    pollRef.current = setInterval(async () => {
      const linked = await checkSubLinked(id);
      if (linked) {
        if (pollRef.current) clearInterval(pollRef.current);
        setInvitePanelFor(null);
        setInvite(null);
        load();
      }
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [invitePanelFor, roster, checkSubLinked, load]);

  function startAdd() { setEditingId(null); setForm(emptyForm); setShowForm(true); }
  function startEdit(s: SubcontractorRow) {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone || '', tags: parseTags(s.specialty_tags) });
    setShowForm(true);
  }

  async function submitForm() {
    if (!form.name.trim()) { showAlert('error', 'กรุณาระบุชื่อช่าง'); return; }
    setSaving(true);
    const url = editingId ? `/api/installer/subcontractors/${editingId}` : '/api/installer/subcontractors';
    const res = await fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim() || null, specialtyTags: form.tags }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.success) {
      showAlert('success', d.message);
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } else showAlert('error', d.message || 'เกิดข้อผิดพลาด');
  }

  async function openInvite(id: number) {
    setInvitePanelFor(id);
    setInvite(null);
    setInviteLoading(true);
    const res = await fetch(`/api/installer/subcontractors/${id}/line-link-code`, { method: 'POST' });
    const d = await res.json();
    setInviteLoading(false);
    if (d.success) setInvite(d);
    else showAlert('error', d.message || 'เกิดข้อผิดพลาด');
  }

  async function copyInviteMessage() {
    if (!invite) return;
    await navigator.clipboard?.writeText(invite.inviteMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {alert && (
        <div className={`alert ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          <span>{alert.type === 'success' ? '✅' : '⚠️'}</span> {alert.msg}
        </div>
      )}

      <div className="flex justify-end">
        <button className="btn btn-primary btn-sm" onClick={showForm && editingId === null ? () => setShowForm(false) : startAdd}>
          {showForm && editingId === null ? 'ยกเลิก' : '+ เพิ่มช่าง'}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-3">
          <h3 className="font-bold text-sm">{editingId ? 'แก้ไขข้อมูลช่าง' : '+ เพิ่มช่างในทีม'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">ชื่อช่าง/ทีม</label>
              <input type="text" className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">เบอร์โทร</label>
              <input type="tel" className="form-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <p className="form-hint">ใช้ติดต่อภายในของคุณเท่านั้น — ลูกค้าจะไม่เห็นข้อมูลนี้</p>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">ความถนัด</label>
            <SpecialtyPicker value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
            <p className="form-hint">แท็กเหล่านี้เป็นข้อมูลอ้างอิงเท่านั้น ไม่ได้จำกัดว่าช่างจะรับงานประเภทใดได้บ้าง</p>
          </div>
          <button className="btn btn-primary btn-sm" disabled={saving} onClick={submitForm}>
            {saving ? '⏳ กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="card p-10 text-center text-[var(--color-muted)] text-sm">กำลังโหลด...</div>
      ) : roster.length === 0 ? (
        <div className="card p-10 text-center text-[var(--color-muted)] text-sm">
          ยังไม่มีช่างในทีม — กด &quot;+ เพิ่มช่าง&quot; เพื่อเริ่มสร้างทีมรับเหมาช่วง
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm roster-table">
              <thead>
                <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                  <th className="text-left px-4 py-3">ชื่อช่าง/ทีม</th>
                  <th className="text-left px-4 py-3">เบอร์โทร</th>
                  <th className="text-left px-4 py-3">ความถนัด</th>
                  <th className="text-left px-4 py-3">สถานะ LINE</th>
                  <th className="text-left px-4 py-3">งานที่กำลังทำ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <Fragment key={s.id}>
                    <tr className="border-t border-[var(--color-border)]">
                      <td className="px-4 py-3 font-medium" data-label="ชื่อช่าง/ทีม">{s.name}</td>
                      <td className="px-4 py-3 text-[var(--color-muted)]" data-label="เบอร์โทร">{s.phone || '—'}</td>
                      <td className="px-4 py-3" data-label="ความถนัด">
                        <div className="flex flex-wrap gap-1">
                          {parseTags(s.specialty_tags).map((t) => <span key={t} className="badge badge-primary">{t}</span>)}
                        </div>
                      </td>
                      <td className="px-4 py-3" data-label="สถานะ LINE">
                        {s.line_user_id ? (
                          <span className="line-oa-pill">🔗 เชื่อมต่อแล้ว</span>
                        ) : (
                          <button className="badge badge-warning" onClick={() => openInvite(s.id)}>⚠️ ยังไม่เชื่อมต่อ</button>
                        )}
                      </td>
                      <td className="px-4 py-3" data-label="งานที่กำลังทำ">{s.active_job_count}</td>
                      <td className="px-4 py-3">
                        <button className="text-xs text-[var(--color-primary)] hover:underline" onClick={() => startEdit(s)}>แก้ไข</button>
                      </td>
                    </tr>
                    {invitePanelFor === s.id && (
                      <tr>
                        <td colSpan={6} className="px-4 pb-4 roster-invite-cell">
                          <div className="card p-4 space-y-3">
                            {inviteLoading ? (
                              <p className="text-sm text-[var(--color-muted)]">กำลังสร้างรหัส...</p>
                            ) : invite ? (
                              <>
                                <p className="text-sm text-[var(--color-muted)]">
                                  ส่งข้อความเชิญนี้ให้ &quot;{s.name}&quot; ผ่านช่องทางของคุณเอง (LINE/SMS/โทร) — เมื่อเขาเพิ่มเพื่อนและพิมพ์รหัสในแชท ระบบจะเชื่อมต่อให้อัตโนมัติ
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="verify-code-chip">ยืนยัน SP-{invite.code}</span>
                                  <button className="btn btn-outline btn-sm" onClick={copyInviteMessage}>
                                    {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอกข้อความเชิญ'}
                                  </button>
                                </div>
                                <p className="text-xs text-[var(--color-muted)]">รหัสหมดอายุใน 10 นาที · หน้านี้จะอัปเดตอัตโนมัติเมื่อเชื่อมต่อสำเร็จ</p>
                              </>
                            ) : null}
                            <button className="btn btn-ghost btn-sm border border-[var(--color-border)]" onClick={() => setInvitePanelFor(null)}>ปิด</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
