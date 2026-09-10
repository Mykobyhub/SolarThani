'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Milestone { id: number; seq: number; description: string; amount: number; status: string }
interface HubData {
  project: { title: string; total_amount: number };
  milestones: Milestone[];
}

const THB = (n: number) => `฿${Math.round(n).toLocaleString('th-TH')}`;

// Poll for confirmation up to this long before giving up and asking the customer to retry —
// long enough to cover a slow bank-app scan, short enough not to poll forever if they abandon it.
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export default function PayMilestonePage() {
  const { token, milestoneId } = useParams<{ token: string; milestoneId: string }>();
  const router = useRouter();
  const [data, setData] = useState<HubData | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingQrUrl, setPendingQrUrl] = useState<string | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/customer/payment-projects/${token}`);
    const d = await res.json();
    if (d.success) setData(d); else setError(d.message || 'ไม่พบโครงการนี้');
    return d;
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (pollTimeoutRef.current) { clearTimeout(pollTimeoutRef.current); pollTimeoutRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  function startPolling() {
    stopPolling();
    setPollTimedOut(false);
    pollRef.current = setInterval(async () => {
      const d = await load();
      if (!d.success) return;
      const m = (d.milestones as Milestone[]).find((x) => String(x.id) === milestoneId);
      if (m && m.status !== 'pending_payment') {
        stopPolling();
        router.push(`/project/${token}/receipt/${milestoneId}`);
      }
    }, POLL_INTERVAL_MS);
    pollTimeoutRef.current = setTimeout(() => {
      stopPolling();
      setPollTimedOut(true);
    }, POLL_TIMEOUT_MS);
  }

  const milestone = data?.milestones.find((m) => String(m.id) === milestoneId);

  async function pay() {
    setSubmitting(true);
    setError('');
    setPollTimedOut(false);
    const res = await fetch(`/api/customer/payment-projects/${token}/milestones/${milestoneId}/pay`, { method: 'POST' });
    const d = await res.json();
    setSubmitting(false);
    if (!d.success) { setError(d.error || d.message || 'เกิดข้อผิดพลาด'); return; }
    if (d.pending) {
      setPendingQrUrl(d.nextActionUrl || null);
      startPolling();
    } else {
      router.push(`/project/${token}/receipt/${milestoneId}`);
    }
  }

  function retry() {
    setPendingQrUrl(null);
    setPollTimedOut(false);
    pay();
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
            ) : pendingQrUrl ? (
              <>
                {pollTimedOut ? (
                  <div className="alert alert-warning mb-5"><span>⏰</span> หมดเวลารอชำระเงิน กรุณาลองใหม่</div>
                ) : (
                  <div className="alert alert-info mb-5">
                    <span>🔒</span> เงินของคุณจะถูกพักไว้อย่างปลอดภัย (escrow) และจะโอนให้ผู้ติดตั้งก็ต่อเมื่อคุณยืนยันว่างานงวดนี้เสร็จเรียบร้อยแล้วเท่านั้น
                  </div>
                )}
                <div className="text-center mb-5">
                  <p className="text-sm text-[var(--color-muted)] mb-1">งวดที่ {milestone.seq} — {milestone.description}</p>
                  <div className="stat-number">{THB(milestone.amount)}</div>
                </div>
                {!pollTimedOut ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pendingQrUrl} alt="สแกนเพื่อชำระเงินผ่าน PromptPay" className="mx-auto mb-4" style={{ maxWidth: 260, width: '100%' }} />
                    <p className="text-center text-sm text-[var(--color-muted)] mb-2">สแกน QR นี้ด้วยแอปธนาคารของคุณเพื่อชำระเงิน</p>
                    <p className="text-center text-xs text-[var(--color-muted)]">⏳ กำลังรอการยืนยันการชำระเงิน...</p>
                  </>
                ) : (
                  <button className="btn btn-primary btn-xl w-full justify-center" disabled={submitting} onClick={retry}>
                    {submitting ? '⏳ กำลังสร้างรายการใหม่...' : 'ลองใหม่'}
                  </button>
                )}
              </>
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
              </>
            )}
            {milestone && milestone.status === 'pending_payment' && !pendingQrUrl && (
              <p className="text-center text-xs text-[var(--color-muted)] mt-4">การชำระเงินนี้เป็นการจำลอง (Mock) สำหรับทดสอบระบบเท่านั้น</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
