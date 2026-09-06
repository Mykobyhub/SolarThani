'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Milestone { id: number; seq: number; description: string; amount: number; status: string }
interface HubData {
  project: { title: string; total_amount: number };
  milestones: Milestone[];
}

const THB = (n: number) => `฿${Math.round(n).toLocaleString('th-TH')}`;

export default function PayMilestonePage() {
  const { token, milestoneId } = useParams<{ token: string; milestoneId: string }>();
  const router = useRouter();
  const [data, setData] = useState<HubData | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/customer/payment-projects/${token}`);
    const d = await res.json();
    if (d.success) setData(d); else setError(d.message || 'ไม่พบโครงการนี้');
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const milestone = data?.milestones.find((m) => String(m.id) === milestoneId);

  async function pay() {
    setSubmitting(true);
    setError('');
    const res = await fetch(`/api/customer/payment-projects/${token}/milestones/${milestoneId}/pay`, { method: 'POST' });
    const d = await res.json();
    setSubmitting(false);
    if (d.success) router.push(`/project/${token}/receipt/${milestoneId}`);
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
            <span className="text-white">ชำระเงิน</span>
          </nav>
          <h1 className="text-3xl font-bold text-white mt-2 mb-2">ชำระเงินงวดงาน</h1>
        </div>
      </div>

      <div className="section-sm">
        <div className="container mx-auto px-4" style={{ maxWidth: 560 }}>
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {!data ? (
              <div className="text-center text-[var(--color-muted)] text-sm">กำลังโหลด...</div>
            ) : !milestone ? (
              <div className="alert alert-error"><span>⚠️</span> ไม่พบงวดนี้</div>
            ) : milestone.status !== 'pending_payment' ? (
              <div className="alert alert-info"><span>ℹ️</span> งวดนี้ไม่ได้อยู่ในสถานะรอชำระเงินแล้ว <Link href={`/project/${token}`} className="underline">กลับไปหน้าโครงการ →</Link></div>
            ) : (
              <>
                {error && <div className="alert alert-error mb-4"><span>⚠️</span> {error}</div>}
                <div className="text-center mb-5">
                  <p className="text-sm text-[var(--color-muted)] mb-1">งวดที่ {milestone.seq} — {milestone.description}</p>
                  <div className="stat-number">{THB(milestone.amount)}</div>
                </div>
                <div className="alert alert-info mb-5">
                  <span>🔒</span> เงินของคุณจะถูกพักไว้อย่างปลอดภัย (escrow) และจะโอนให้ผู้ติดตั้งก็ต่อเมื่อคุณยืนยันว่างานงวดนี้เสร็จเรียบร้อยแล้วเท่านั้น
                </div>
                <button className="btn btn-primary btn-xl w-full justify-center" disabled={submitting} onClick={pay}>
                  {submitting ? '⏳ กำลังชำระเงิน...' : `🔒 ชำระเงิน ${THB(milestone.amount)}`}
                </button>
                <p className="text-center text-xs text-[var(--color-muted)] mt-4">การชำระเงินนี้เป็นการจำลอง (Mock) สำหรับทดสอบระบบเท่านั้น</p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
