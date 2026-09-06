'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import ChannelPicker from '@/components/payment/ChannelPicker';
import LineConnect from '@/components/payment/LineConnect';

interface HubData {
  project: { notify_channel: string; line_linked: boolean };
  line: { enabled: boolean; oaBasicId: string };
}

export default function CustomerLineConnectPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<HubData | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  function showAlert(type: 'success' | 'error', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  const load = useCallback(async () => {
    const res = await fetch(`/api/customer/payment-projects/${token}`);
    const d = await res.json();
    if (d.success) setData(d);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function generateCode() {
    const res = await fetch(`/api/customer/payment-projects/${token}/line-link-code`, { method: 'POST' });
    const d = await res.json();
    if (d.success) return { code: d.code, expiresAt: d.expiresAt, addFriendUrl: d.addFriendUrl };
    showAlert('error', d.error || d.message || 'เกิดข้อผิดพลาด');
    return null;
  }

  async function unlink() {
    await fetch(`/api/customer/payment-projects/${token}/line-link`, { method: 'DELETE' });
    await load();
  }

  async function checkLinked() {
    const res = await fetch(`/api/customer/payment-projects/${token}`);
    const d = await res.json();
    if (d.success) { setData(d); return !!d.project.line_linked; }
    return false;
  }

  async function setChannel(channel: string) {
    const res = await fetch(`/api/customer/payment-projects/${token}/notify-channel`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel }),
    });
    const d = await res.json();
    if (d.success) { showAlert('success', d.message); load(); } else showAlert('error', d.error || d.message);
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
            <span className="text-white">เชื่อมต่อ LINE</span>
          </nav>
          <h1 className="text-3xl font-bold text-white mt-2 mb-2">เชื่อมต่อ LINE รับแจ้งเตือน</h1>
        </div>
      </div>

      <div className="section-sm">
        <div className="container mx-auto px-4 space-y-4" style={{ maxWidth: 560 }}>
          {alert && (
            <div className={`alert ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              <span>{alert.type === 'success' ? '✅' : '⚠️'}</span> {alert.msg}
            </div>
          )}

          {!data ? (
            <div className="card p-8 text-center text-[var(--color-muted)] text-sm">กำลังโหลด...</div>
          ) : (
            <>
              <LineConnect
                linked={data.project.line_linked}
                oaBasicId={data.line.oaBasicId}
                lineEnabled={data.line.enabled}
                onGenerateCode={generateCode}
                onUnlink={unlink}
                onCheckLinked={checkLinked}
              />

              {data.line.enabled && (
                <div className="card p-5">
                  <div className="font-bold mb-3">ช่องทางการแจ้งเตือน</div>
                  <ChannelPicker value={data.project.notify_channel} lineLinked={data.project.line_linked} onChange={setChannel} />
                </div>
              )}

              <Link href={`/project/${token}`} className="text-sm text-[var(--color-primary)] hover:underline">← กลับไปหน้าโครงการ</Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
