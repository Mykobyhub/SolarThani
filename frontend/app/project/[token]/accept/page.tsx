'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Milestone { id: number; seq: number; description: string; amount: number; status: string }
interface HubData {
  project: { title: string; address: string | null; total_amount: number; status: string; installer_name: string };
  milestones: Milestone[];
}

const THB = (n: number) => `฿${Math.round(n).toLocaleString('th-TH')}`;

export default function AcceptPlanPage() {
  const { token } = useParams<{ token: string }>();
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

  async function accept() {
    setSubmitting(true);
    setError('');
    const res = await fetch(`/api/customer/payment-projects/${token}/accept`, { method: 'POST' });
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
            <span className="text-white">ยืนยันแผนงวด</span>
          </nav>
          <h1 className="text-3xl font-bold text-white mt-2 mb-2">ยืนยันแผนการชำระเงิน</h1>
        </div>
      </div>

      <div className="section-sm">
        <div className="container mx-auto px-4" style={{ maxWidth: 560 }}>
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {!data ? (
              <div className="text-center text-[var(--color-muted)] text-sm">กำลังโหลด...</div>
            ) : data.project.status !== 'proposed' ? (
              <div className="alert alert-info"><span>ℹ️</span> แผนนี้ได้รับการยืนยันไปแล้ว <Link href={`/project/${token}`} className="underline">กลับไปหน้าโครงการ →</Link></div>
            ) : (
              <>
                <h2 className="font-bold text-lg mb-1">{data.project.title}</h2>
                <p className="text-sm text-[var(--color-muted)] mb-4">ผู้ติดตั้ง: {data.project.installer_name}{data.project.address ? ` · ${data.project.address}` : ''}</p>

                {error && <div className="alert alert-error mb-4"><span>⚠️</span> {error}</div>}

                <div className="rounded-lg border border-[var(--color-border)] overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                        <th className="text-left px-3 py-2">งวดที่</th>
                        <th className="text-left px-3 py-2">รายละเอียด</th>
                        <th className="text-right px-3 py-2">จำนวนเงิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.milestones.map((m) => (
                        <tr key={m.id} className="border-t border-[var(--color-border)]">
                          <td className="px-3 py-2">{m.seq}</td>
                          <td className="px-3 py-2">{m.description}</td>
                          <td className="px-3 py-2 text-right font-medium">{THB(m.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[var(--color-border)] font-bold">
                        <td className="px-3 py-2" colSpan={2}>รวม</td>
                        <td className="px-3 py-2 text-right">{THB(data.project.total_amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="alert alert-info mb-5">
                  <span>ℹ️</span> เมื่อยืนยันแผนแล้ว คุณจะต้องชำระเงินงวดแรกก่อนผู้ติดตั้งจะเริ่มดำเนินงานได้ เงินจะถูกพักไว้ในระบบ (escrow) และปล่อยให้ผู้ติดตั้งก็ต่อเมื่อคุณยืนยันว่างานแต่ละงวดเสร็จเรียบร้อยแล้วเท่านั้น
                </div>

                <button className="btn btn-primary btn-xl w-full justify-center" disabled={submitting} onClick={accept}>
                  {submitting ? '⏳ กำลังบันทึก...' : 'ยอมรับแผนนี้ ดำเนินการชำระงวดแรก'}
                </button>
                <p className="text-center text-xs text-[var(--color-muted)] mt-4">
                  ต้องการแก้ไขแผน? ติดต่อผู้ติดตั้งของคุณโดยตรงที่เบอร์ที่ให้ไว้
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
