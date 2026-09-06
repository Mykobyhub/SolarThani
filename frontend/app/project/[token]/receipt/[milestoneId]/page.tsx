'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Receipt {
  receiptNo: string;
  paidAt: string;
  projectTitle: string;
  projectAddress: string | null;
  installerName: string;
  seq: number;
  milestoneCount: number;
  description: string;
  amount: number;
  provider: string;
  reference: string | null;
  status: string;
}

const THB = (n: number) => `฿${Math.round(n).toLocaleString('th-TH')}`;

export default function ReceiptPage() {
  const { token, milestoneId } = useParams<{ token: string; milestoneId: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/customer/payment-projects/${token}/receipts/${milestoneId}`);
    const d = await res.json();
    if (d.success) setReceipt(d.receipt); else setError(d.message || 'ไม่พบใบเสร็จนี้');
  }, [token, milestoneId]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="page-header print:hidden">
        <div className="container mx-auto px-4">
          <nav className="breadcrumb text-white/70">
            <Link href="/" className="hover:text-white">หน้าแรก</Link>
            <span>›</span>
            <Link href={`/project/${token}`} className="hover:text-white">โครงการของคุณ</Link>
            <span>›</span>
            <span className="text-white">ใบเสร็จ</span>
          </nav>
          <h1 className="text-3xl font-bold text-white mt-2 mb-2">ใบเสร็จรับเงิน</h1>
        </div>
      </div>

      <div className="section-sm">
        <div className="container mx-auto px-4" style={{ maxWidth: 600 }}>
          {error && <div className="alert alert-error"><span>⚠️</span> {error}</div>}
          {receipt && (
            <div className="card-static p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'var(--color-primary-light)' }}>☀️</div>
                  <div>
                    <div className="font-bold">Solar Thani Thailand</div>
                    <div className="text-xs text-[var(--color-muted)]">solarthani.com</div>
                  </div>
                </div>
                <span className="badge badge-success">✅ ชำระสำเร็จ</span>
              </div>

              <div className="divider" />

              <div className="receipt-row"><span className="label">เลขที่ใบเสร็จ</span><span className="value" style={{ fontFamily: 'monospace' }}>{receipt.receiptNo}</span></div>
              <div className="receipt-row"><span className="label">วันที่ชำระ</span><span className="value">{new Date(receipt.paidAt).toLocaleString('th-TH')}</span></div>
              <div className="receipt-row"><span className="label">โครงการ</span><span className="value">{receipt.projectTitle}{receipt.projectAddress ? ` — ${receipt.projectAddress}` : ''}</span></div>
              <div className="receipt-row"><span className="label">ผู้ติดตั้ง</span><span className="value">{receipt.installerName}</span></div>
              <div className="receipt-row"><span className="label">งวดที่ชำระ</span><span className="value">งวดที่ {receipt.seq} จาก {receipt.milestoneCount} — {receipt.description}</span></div>
              <div className="receipt-row"><span className="label">ช่องทางชำระเงิน</span><span className="value">{receipt.reference || '—'}</span></div>

              <div className="divider" />

              <div className="text-center py-4">
                <div className="stat-number">{THB(receipt.amount)}</div>
              </div>

              <div className="flex gap-3 print:hidden">
                <button className="btn btn-primary flex-1 justify-center" onClick={() => window.print()}>🖨 พิมพ์ / บันทึกเป็น PDF</button>
              </div>

              <p className="text-xs text-[var(--color-muted)] text-center mt-4">
                เอกสารนี้เป็นหลักฐานการชำระเงินอิเล็กทรอนิกส์ ออกโดยระบบอัตโนมัติ ไม่จำเป็นต้องมีลายเซ็น
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
