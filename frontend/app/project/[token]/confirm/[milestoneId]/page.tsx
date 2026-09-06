'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Milestone { id: number; seq: number; description: string; amount: number; status: string; completed_at: string | null }
interface HubData {
  project: { title: string };
  milestones: Milestone[];
}

const THB = (n: number) => `฿${Math.round(n).toLocaleString('th-TH')}`;

export default function ConfirmMilestonePage() {
  const { token, milestoneId } = useParams<{ token: string; milestoneId: string }>();
  const router = useRouter();
  const [data, setData] = useState<HubData | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/customer/payment-projects/${token}`);
    const d = await res.json();
    if (d.success) setData(d); else setError(d.message || 'ไม่พบโครงการนี้');
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const milestone = data?.milestones.find((m) => String(m.id) === milestoneId);

  async function confirmDone() {
    if (!confirm('ยืนยันว่างานงวดนี้เสร็จสมบูรณ์แล้ว และปล่อยเงินให้ผู้ติดตั้ง?')) return;
    setSubmitting(true);
    setError('');
    const res = await fetch(`/api/customer/payment-projects/${token}/milestones/${milestoneId}/confirm`, { method: 'POST' });
    const d = await res.json();
    setSubmitting(false);
    if (d.success) router.push(`/project/${token}/receipt/${milestoneId}`);
    else setError(d.error || d.message || 'เกิดข้อผิดพลาด');
  }

  async function submitDispute() {
    if (!reason.trim()) { setError('กรุณาระบุเหตุผลที่โต้แย้ง'); return; }
    setSubmitting(true);
    setError('');
    const res = await fetch(`/api/customer/payment-projects/${token}/milestones/${milestoneId}/dispute`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (d.success) router.push(`/project/${token}`);
    else setError(d.error || d.message || 'เกิดข้อผิดพลาด');
  }

  return (
    <>
      <div className="page-header">
        <div className="container mx-auto px-4">
          <nav className="breadcrumb text-white/70">
            <Link href="/" className="hover:text-white">หน้าแรก</Link>
            <span>›</span>
            <Link href={`/project/${token}`} className="hover:text-white">โครงการของคุณ</Link>
            <span>›</span>
            <span className="text-white">ยืนยันงาน</span>
          </nav>
          <h1 className="text-3xl font-bold text-white mt-2 mb-2">ยืนยันความเสร็จสมบูรณ์ของงาน</h1>
        </div>
      </div>

      <div className="section-sm">
        <div className="container mx-auto px-4" style={{ maxWidth: 560 }}>
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {!data ? (
              <div className="text-center text-[var(--color-muted)] text-sm">กำลังโหลด...</div>
            ) : !milestone ? (
              <div className="alert alert-error"><span>⚠️</span> ไม่พบงวดนี้</div>
            ) : milestone.status !== 'awaiting_confirmation' ? (
              <div className="alert alert-info"><span>ℹ️</span> งวดนี้ไม่ได้อยู่ในสถานะรอการยืนยันแล้ว <Link href={`/project/${token}`} className="underline">กลับไปหน้าโครงการ →</Link></div>
            ) : (
              <>
                {error && <div className="alert alert-error mb-4"><span>⚠️</span> {error}</div>}
                <div className="alert alert-warning mb-5">
                  <span>📢</span> ผู้ติดตั้งแจ้งว่างานงวดที่ {milestone.seq} ({milestone.description}) เสร็จสมบูรณ์แล้ว
                  {milestone.completed_at && ` เมื่อ ${new Date(milestone.completed_at).toLocaleString('th-TH')}`}
                </div>

                {!showDisputeForm ? (
                  <div className="space-y-3">
                    <button className="btn w-full justify-center text-white" style={{ background: '#059669', borderColor: '#059669' }} disabled={submitting} onClick={confirmDone}>
                      {submitting ? '⏳ กำลังดำเนินการ...' : `✓ ยืนยันงานเสร็จ ปล่อยเงิน ${THB(milestone.amount)}`}
                    </button>
                    <button className="btn btn-danger-outline w-full justify-center" disabled={submitting} onClick={() => setShowDisputeForm(true)}>
                      ⚠️ งานยังไม่เสร็จจริง / โต้แย้ง
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="form-label">เหตุผลที่โต้แย้ง</label>
                    <textarea className="form-input" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="อธิบายว่างานส่วนใดยังไม่เสร็จ หรือมีปัญหาอย่างไร" style={{ resize: 'vertical' }} />
                    <button className="btn btn-danger-outline w-full justify-center" disabled={submitting} onClick={submitDispute}>
                      {submitting ? '⏳ กำลังส่ง...' : 'ส่งข้อโต้แย้ง'}
                    </button>
                    <button className="btn btn-ghost btn-sm border border-[var(--color-border)] w-full justify-center" onClick={() => { setShowDisputeForm(false); setReason(''); }}>
                      ยกเลิก
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
