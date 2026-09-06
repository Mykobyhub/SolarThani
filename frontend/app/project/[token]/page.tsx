'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import ChannelPicker from '@/components/payment/ChannelPicker';

interface Milestone {
  id: number;
  seq: number;
  description: string;
  amount: number;
  status: string;
  released_at: string | null;
}

interface Receipt {
  milestoneId: number;
  seq: number;
  amount: number;
  paidAt: string | null;
  reference: string | null;
}

interface HubData {
  project: {
    id: number;
    title: string;
    address: string | null;
    customer_name: string;
    total_amount: number;
    status: string;
    installer_name: string;
    installer_phone: string | null;
    notify_channel: string;
    line_linked: boolean;
  };
  milestones: Milestone[];
  receipts: Receipt[];
  pendingAction: { type: 'accept' | 'pay' | 'confirm'; milestoneId?: number } | null;
  line: { enabled: boolean; oaBasicId: string };
}

const PROJECT_STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  proposed:               { label: 'รอคุณยืนยันแผน', bg: '#f3f4f6', color: '#374151' },
  awaiting_first_payment: { label: 'รอชำระงวดแรก',    bg: '#fef3c7', color: '#92400e' },
  active:                 { label: 'กำลังดำเนินงาน',   bg: 'rgba(2,98,236,0.08)', color: 'var(--color-primary)' },
  completed:              { label: 'เสร็จสมบูรณ์',     bg: 'rgba(16,185,129,0.08)', color: '#059669' },
  disputed:               { label: 'มีข้อโต้แย้ง',      bg: 'rgba(239,68,68,.1)', color: '#b91c1c' },
  cancelled:              { label: 'ยกเลิกแล้ว',        bg: '#f3f4f6', color: '#6b7280' },
};

const MILESTONE_STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending_payment:        { label: '⏳ รอชำระเงิน',        bg: '#f3f4f6', color: '#374151' },
  paid_hold:              { label: '🔒 ชำระแล้ว · พักไว้', bg: 'rgba(99,102,241,.1)', color: '#4338ca' },
  in_progress:            { label: '🔧 กำลังดำเนินงาน',    bg: 'rgba(2,98,236,0.08)', color: 'var(--color-primary)' },
  awaiting_confirmation:  { label: '📢 รอคุณยืนยัน',       bg: 'rgba(253,105,2,0.08)', color: 'var(--color-accent)' },
  released:               { label: '✅ ปล่อยเงินแล้ว',     bg: 'rgba(16,185,129,0.08)', color: '#059669' },
  disputed:               { label: '⚠️ มีข้อโต้แย้ง',      bg: 'rgba(239,68,68,.1)', color: '#b91c1c' },
  refunded:               { label: '↩ คืนเงินแล้ว',        bg: '#e0e7ff', color: '#3730a3' },
  cancelled:               { label: '🚫 ยกเลิกแล้ว',       bg: '#f3f4f6', color: '#6b7280' },
};

const MILESTONE_MARKER: Record<string, string> = {
  pending_payment: '', paid_hold: 'is-warn', in_progress: 'is-active', awaiting_confirmation: 'is-warn',
  released: 'is-done', disputed: 'is-danger', refunded: 'is-done', cancelled: '',
};

const THB = (n: number) => `฿${Math.round(n).toLocaleString('th-TH')}`;

function Badge({ map, status }: { map: typeof PROJECT_STATUS_MAP; status: string }) {
  const s = map[status] ?? { label: status, bg: '#f3f4f6', color: '#374151' };
  return <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

export default function ProjectHubPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<HubData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [savingChannel, setSavingChannel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  function showAlert(type: 'success' | 'error', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4500);
  }

  const load = useCallback(async () => {
    const res = await fetch(`/api/customer/payment-projects/${token}`);
    const d = await res.json();
    if (d.success) setData(d);
    else setNotFound(true);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function setChannel(channel: string) {
    setSavingChannel(true);
    const res = await fetch(`/api/customer/payment-projects/${token}/notify-channel`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel }),
    });
    const d = await res.json();
    setSavingChannel(false);
    if (d.success) { showAlert('success', d.message); load(); } else showAlert('error', d.error || d.message);
  }

  async function cancelProject() {
    if (!confirm('ยืนยันการยกเลิกโครงการนี้? งวดที่ชำระแล้วแต่ยังไม่เริ่มงานจะถูกคืนเงินอัตโนมัติ ส่วนงวดที่กำลังดำเนินงานอยู่จะถูกส่งให้ Admin พิจารณาก่อน'))
      return;
    setCancelling(true);
    const res = await fetch(`/api/customer/payment-projects/${token}/cancel`, { method: 'POST' });
    const d = await res.json();
    setCancelling(false);
    if (d.success) { showAlert('success', d.message); load(); } else showAlert('error', d.error || d.message);
  }

  if (notFound) {
    return (
      <>
        <div className="page-header">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl font-bold text-white">ไม่พบโครงการ</h1>
          </div>
        </div>
        <div className="section-sm"><div className="container mx-auto px-4" style={{ maxWidth: 560 }}>
          <div className="alert alert-error"><span>⚠️</span> ไม่พบโครงการนี้ ลิงก์อาจไม่ถูกต้องหรือหมดอายุแล้ว</div>
        </div></div>
      </>
    );
  }

  if (!data) {
    return <div className="section-sm"><div className="container mx-auto px-4 text-center text-[var(--color-muted)]">กำลังโหลด...</div></div>;
  }

  const { project, milestones, receipts, pendingAction, line } = data;
  const canCancel = !['completed', 'cancelled'].includes(project.status);

  return (
    <>
      <div className="page-header">
        <div className="container mx-auto px-4">
          <nav className="breadcrumb text-white/70">
            <Link href="/" className="hover:text-white">หน้าแรก</Link>
            <span>›</span>
            <span className="text-white">ติดตามโครงการของคุณ</span>
          </nav>
          <h1 className="text-3xl font-bold text-white mt-2 mb-2">{project.title}</h1>
          <p className="text-white/80">ผู้ติดตั้ง: {project.installer_name}{project.address ? ` · ${project.address}` : ''}</p>
        </div>
      </div>

      <div className="section-sm">
        <div className="container mx-auto px-4" style={{ maxWidth: 760 }}>
          {alert && (
            <div className={`alert mb-4 ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              <span>{alert.type === 'success' ? '✅' : '⚠️'}</span> {alert.msg}
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div className="text-sm text-[var(--color-muted)]">มูลค่ารวม <strong>{THB(project.total_amount)}</strong></div>
            <Badge map={PROJECT_STATUS_MAP} status={project.status} />
          </div>

          {pendingAction && (
            <div className="alert alert-warning mb-4 flex items-center justify-between flex-wrap gap-3">
              <span>
                <span>📢</span>{' '}
                {pendingAction.type === 'accept' && 'มีแผนการชำระเงินใหม่รอคุณยืนยัน'}
                {pendingAction.type === 'pay' && 'มีงวดงานรอการชำระเงินจากคุณ'}
                {pendingAction.type === 'confirm' && 'ผู้ติดตั้งแจ้งงานเสร็จ รอการยืนยันจากคุณ'}
              </span>
              <Link
                href={
                  pendingAction.type === 'accept' ? `/project/${token}/accept`
                  : pendingAction.type === 'pay' ? `/project/${token}/pay/${pendingAction.milestoneId}`
                  : `/project/${token}/confirm/${pendingAction.milestoneId}`
                }
                className="btn btn-primary btn-sm"
              >
                ดำเนินการ →
              </Link>
            </div>
          )}

          <div className="card p-5 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
              <div className="font-bold">🔔 การแจ้งเตือน</div>
              {line.enabled && (
                project.line_linked
                  ? <span className="line-oa-pill">🔗 เชื่อมต่อ LINE แล้ว</span>
                  : <Link href={`/project/${token}/line`} className="text-sm text-[var(--color-primary)] hover:underline">ยังไม่เชื่อมต่อ LINE — เชื่อมต่อเลย →</Link>
              )}
            </div>
            {line.enabled ? (
              <>
                <ChannelPicker value={project.notify_channel} lineLinked={project.line_linked} disabled={savingChannel} onChange={setChannel} />
                <div className="mt-2"><Link href={`/project/${token}/line`} className="text-xs text-[var(--color-primary)] hover:underline">จัดการช่องทางแจ้งเตือน →</Link></div>
              </>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">ระบบจะแจ้งเตือนความคืบหน้าทางอีเมลของคุณ</p>
            )}
          </div>

          {milestones.some((m) => m.status === 'disputed') && (
            <div className="alert alert-error mb-4">
              <span>⚠️</span> โครงการนี้มีงวดที่อยู่ระหว่างพิจารณาข้อพิพาท เงินถูกพักไว้จนกว่า Admin จะตัดสิน
            </div>
          )}

          <div className="card p-5 mb-4">
            <h3 className="font-semibold text-sm mb-4">งวดงาน</h3>
            <div className="milestone-timeline">
              {milestones.map((m, idx) => (
                <div key={m.id} className="milestone-item">
                  <div className="milestone-rail">
                    <div className={`milestone-marker ${MILESTONE_MARKER[m.status] || ''}`}>{m.seq}</div>
                    {idx < milestones.length - 1 && (
                      <div className={`milestone-connector ${['released', 'refunded'].includes(m.status) ? 'is-filled' : ''}`} />
                    )}
                  </div>
                  <div className="milestone-body">
                    <div className="milestone-head">
                      <span className="milestone-title">งวดที่ {m.seq}</span>
                      <Badge map={MILESTONE_STATUS_MAP} status={m.status} />
                    </div>
                    <div className="milestone-desc">{m.description} · {THB(m.amount)}</div>
                    {m.status === 'released' && (
                      <div className="milestone-actions">
                        <Link href={`/project/${token}/receipt/${m.id}`} className="btn btn-outline btn-sm">🧾 ดูใบเสร็จ</Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {receipts.length > 0 && (
            <div className="card overflow-hidden mb-4">
              <div className="p-4 border-b border-[var(--color-border)] font-bold">🧾 ใบเสร็จของฉัน</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                      <th className="text-left px-4 py-3">งวดที่</th>
                      <th className="text-left px-4 py-3">จำนวนเงิน</th>
                      <th className="text-left px-4 py-3">วันที่ชำระ</th>
                      <th className="text-left px-4 py-3">เลขที่</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((r) => (
                      <tr key={r.milestoneId} className="border-t border-[var(--color-border)]">
                        <td className="px-4 py-3">งวด {r.seq}</td>
                        <td className="px-4 py-3 font-medium">{THB(r.amount)}</td>
                        <td className="px-4 py-3 text-xs text-[var(--color-muted)] whitespace-nowrap">{r.paidAt ? new Date(r.paidAt).toLocaleDateString('th-TH') : '—'}</td>
                        <td className="px-4 py-3 text-xs font-mono text-[var(--color-muted)]">{r.reference}</td>
                        <td className="px-4 py-3"><Link href={`/project/${token}/receipt/${r.milestoneId}`} className="text-xs text-[var(--color-primary)] hover:underline">ดูใบเสร็จ →</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {canCancel && (
            <div className="card p-5">
              <div className="font-bold mb-1">ยกเลิกโครงการ</div>
              <p className="text-xs text-[var(--color-muted)] mb-3">
                งวดที่ยังไม่ชำระจะถูกยกเลิกทันที งวดที่ชำระแล้วแต่ยังไม่เริ่มงานจะถูกคืนเงินอัตโนมัติ
                ส่วนงวดที่กำลังดำเนินงานอยู่จะถูกส่งให้ Admin พิจารณาตัดสินก่อนจึงจะปิดโครงการได้
              </p>
              <button className="btn btn-danger-outline btn-sm" disabled={cancelling} onClick={cancelProject}>
                {cancelling ? '⏳ กำลังดำเนินการ...' : '🚫 ยกเลิกโครงการ'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
