'use client';

import { useEffect, useState, useCallback } from 'react';

interface AffiliateRow {
  id: number;
  name: string;
  email: string;
  referral_code: string;
  status: string;
  payout_bank_name: string | null;
  payout_account_number: string | null;
  payout_account_name: string | null;
  eligible_balance: number;
}

interface CommissionRow {
  id: number;
  affiliate_id: number;
  affiliate_name: string;
  affiliate_email: string;
  installer_id: number;
  installer_name: string;
  lead_id: number | null;
  project_id: number | null;
  milestone_id: number | null;
  commission_type: string;
  base_amount: number;
  commission_amount: number;
  status: string;
  clawback_reason: string | null;
  computed_at: string | null;
  paid_at: string | null;
  created_at: string;
}

interface PayoutRow {
  id: number;
  affiliate_id: number;
  affiliate_name: string;
  affiliate_email: string;
  total_amount: number;
  status: string;
  reference: string | null;
  created_at: string;
  paid_at: string | null;
}

const THB = (n: number) => `฿${Math.round(n).toLocaleString('th-TH')}`;

const COMMISSION_STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending:     { label: '⏳ รอ',        bg: '#f3f4f6', color: '#374151' },
  eligible:    { label: '✅ พร้อมจ่าย', bg: 'rgba(2,98,236,0.08)', color: 'var(--color-primary)' },
  paid:        { label: '💰 จ่ายแล้ว',  bg: 'rgba(16,185,129,0.08)', color: '#059669' },
  clawed_back: { label: '↩ ถูกหักคืน', bg: 'rgba(239,68,68,.1)', color: '#b91c1c' },
};

function StatusPill({ status }: { status: string }) {
  const s = COMMISSION_STATUS_MAP[status] ?? { label: status, bg: '#f3f4f6', color: '#374151' };
  return <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

export default function AffiliateTab({ showAlert }: { showAlert: (type: 'success' | 'error', msg: string) => void }) {
  const [section, setSection] = useState<'queue' | 'ledger' | 'payouts'>('queue');
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [payoutThreshold, setPayoutThreshold] = useState(1000);
  const [ledgerStatus, setLedgerStatus] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');

  const [payoutModal, setPayoutModal] = useState<{ open: boolean; affiliate: AffiliateRow | null }>({ open: false, affiliate: null });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/affiliate');
    const d = await res.json();
    if (d.success) {
      setAffiliates(d.affiliates);
      setCommissions(d.commissions);
      setPayouts(d.payouts);
      setPayoutThreshold(d.payoutThreshold);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openPayoutModal(aff: AffiliateRow) {
    const eligibleIds = commissions.filter((c) => c.affiliate_id === aff.id && c.status === 'eligible').map((c) => c.id);
    setSelectedIds(eligibleIds);
    setReference('');
    setPayoutModal({ open: true, affiliate: aff });
  }

  function closePayoutModal() {
    setPayoutModal({ open: false, affiliate: null });
    setSelectedIds([]);
    setReference('');
  }

  function toggleSelected(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submitPayout() {
    if (!payoutModal.affiliate) return;
    if (selectedIds.length === 0) { showAlert('error', 'กรุณาเลือกรายการคอมมิชชันอย่างน้อย 1 รายการ'); return; }
    if (!reference.trim()) { showAlert('error', 'กรุณากรอกเลขที่อ้างอิง/หมายเหตุการโอนเงิน'); return; }
    setSubmitting(true);
    const res = await fetch('/api/admin/affiliate/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ affiliateId: payoutModal.affiliate.id, commissionIds: selectedIds, reference: reference.trim() }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (d.success) {
      showAlert('success', d.message);
      closePayoutModal();
      load();
    } else {
      showAlert('error', d.error || d.message || 'เกิดข้อผิดพลาด');
    }
  }

  const modalEligibleRows = payoutModal.affiliate
    ? commissions.filter((c) => c.affiliate_id === payoutModal.affiliate!.id && c.status === 'eligible')
    : [];
  const modalTotal = modalEligibleRows.filter((c) => selectedIds.includes(c.id)).reduce((sum, c) => sum + Number(c.commission_amount), 0);

  const filteredCommissions = commissions.filter((c) => {
    if (ledgerStatus && c.status !== ledgerStatus) return false;
    const q = ledgerSearch.toLowerCase();
    if (q && ![c.affiliate_name, c.affiliate_email, c.installer_name].some((v) => (v || '').toLowerCase().includes(q))) return false;
    return true;
  });

  const SUB_NAV: { key: typeof section; label: string; badge?: number }[] = [
    { key: 'queue',   label: '💰 คิว Payout', badge: affiliates.length },
    { key: 'ledger',  label: '📒 Ledger คอมมิชชัน' },
    { key: 'payouts', label: '🧾 ประวัติการจ่ายเงิน' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {SUB_NAV.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`btn btn-sm ${section === s.key ? 'btn-blue' : 'btn-outline'}`}
          >
            {s.label}
            {(s.badge ?? 0) > 0 && (
              <span className="ml-1.5 badge" style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>{s.badge}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-10 text-center text-[var(--color-muted)] text-sm">กำลังโหลด...</div>
      ) : (
        <>
          {section === 'queue' && (
            <div className="space-y-4">
              <div className="alert alert-info">
                <span>ℹ️</span> Affiliate ที่มียอดคอมมิชชันสถานะ &quot;พร้อมจ่าย&quot; สะสมตั้งแต่ {THB(payoutThreshold)} ขึ้นไปเท่านั้นจะแสดงในคิวนี้ — กด &quot;บันทึกว่าจ่ายแล้ว&quot; หลังโอนเงินจริงนอกระบบเรียบร้อยแล้ว
              </div>
              {affiliates.length === 0 ? (
                <div className="card p-10 text-center text-[var(--color-muted)] text-sm">ยังไม่มี affiliate ที่ถึงเกณฑ์การจ่ายเงิน</div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                          <th className="text-left px-4 py-3">Affiliate</th>
                          <th className="text-left px-4 py-3">บัญชีรับเงิน</th>
                          <th className="text-left px-4 py-3">ยอดพร้อมจ่าย</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {affiliates.map((a) => (
                          <tr key={a.id} className="border-t border-[var(--color-border)]">
                            <td className="px-4 py-3">
                              <div className="font-medium">{a.name}</div>
                              <div className="text-xs text-[var(--color-muted)]">{a.email} · {a.referral_code}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[var(--color-muted)]">
                              {a.payout_bank_name ? (
                                <>{a.payout_bank_name} · {a.payout_account_number}<br />{a.payout_account_name}</>
                              ) : 'ยังไม่ได้ตั้งค่าบัญชีรับเงิน'}
                            </td>
                            <td className="px-4 py-3 font-medium">{THB(a.eligible_balance)}</td>
                            <td className="px-4 py-3 text-right">
                              <button className="btn btn-xs btn-primary" onClick={() => openPayoutModal(a)}>
                                💸 บันทึกว่าจ่ายแล้ว
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {section === 'ledger' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-[var(--color-border)]">
                <div className="font-bold mb-3">Ledger คอมมิชชันทั้งหมด ({filteredCommissions.length} / {commissions.length})</div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    className="form-input py-1.5 text-sm"
                    style={{ minWidth: 220, flex: '1 1 220px' }}
                    placeholder="🔍 ค้นหา Affiliate / ผู้ติดตั้ง..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                  />
                  <select className="form-input py-1.5 text-sm" style={{ width: 'auto', minWidth: 150 }} value={ledgerStatus} onChange={(e) => setLedgerStatus(e.target.value)}>
                    <option value="">สถานะทั้งหมด</option>
                    {Object.entries(COMMISSION_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                      <th className="text-left px-4 py-3">วันที่</th>
                      <th className="text-left px-4 py-3">Affiliate</th>
                      <th className="text-left px-4 py-3">ผู้ติดตั้ง</th>
                      <th className="text-left px-4 py-3">ประเภท</th>
                      <th className="text-left px-4 py-3">ฐานคำนวณ</th>
                      <th className="text-left px-4 py-3">ค่าคอมมิชชัน</th>
                      <th className="text-left px-4 py-3">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCommissions.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-[var(--color-muted)] text-sm">ไม่พบรายการที่ตรงกัน</td></tr>
                    ) : filteredCommissions.map((c) => (
                      <tr key={c.id} className="border-t border-[var(--color-border)]">
                        <td className="px-4 py-3 text-xs text-[var(--color-muted)] whitespace-nowrap">{new Date(c.created_at).toLocaleDateString('th-TH')}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{c.affiliate_name}</div>
                          <div className="text-xs text-[var(--color-muted)]">{c.affiliate_email}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-muted)]">{c.installer_name}</td>
                        <td className="px-4 py-3 text-xs">{c.commission_type === 'percent' ? '% ต่องวด' : 'คงที่'}</td>
                        <td className="px-4 py-3 text-xs text-[var(--color-muted)]">{THB(c.base_amount)}</td>
                        <td className="px-4 py-3 font-medium">{THB(c.commission_amount)}</td>
                        <td className="px-4 py-3">
                          <StatusPill status={c.status} />
                          {c.status === 'clawed_back' && c.clawback_reason && (
                            <div className="text-xs text-[var(--color-muted)] mt-1 max-w-xs">{c.clawback_reason}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'payouts' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-[var(--color-border)] font-bold">ประวัติการจ่ายเงิน ({payouts.length})</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-[var(--color-muted)] text-xs">
                      <th className="text-left px-4 py-3">วันที่</th>
                      <th className="text-left px-4 py-3">Affiliate</th>
                      <th className="text-left px-4 py-3">จำนวนเงิน</th>
                      <th className="text-left px-4 py-3">อ้างอิง/หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--color-muted)] text-sm">ยังไม่มีการจ่ายเงิน</td></tr>
                    ) : payouts.map((p) => (
                      <tr key={p.id} className="border-t border-[var(--color-border)]">
                        <td className="px-4 py-3 text-xs text-[var(--color-muted)] whitespace-nowrap">{new Date(p.paid_at || p.created_at).toLocaleString('th-TH')}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.affiliate_name}</div>
                          <div className="text-xs text-[var(--color-muted)]">{p.affiliate_email}</div>
                        </td>
                        <td className="px-4 py-3 font-medium">{THB(p.total_amount)}</td>
                        <td className="px-4 py-3 text-xs text-[var(--color-muted)]">{p.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Payout batch modal */}
      {payoutModal.open && payoutModal.affiliate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={closePayoutModal}>
          <div className="card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">💸 บันทึกการจ่ายเงินให้ {payoutModal.affiliate.name}</h3>
            <p className="text-xs text-[var(--color-muted)] mb-4">เลือกรายการคอมมิชชันที่โอนเงินจริงแล้ว — การบันทึกนี้ไม่ได้สั่งโอนเงินอัตโนมัติ</p>

            {modalEligibleRows.length === 0 ? (
              <div className="py-6 text-center text-sm text-[var(--color-muted)]">ไม่มีรายการที่พร้อมจ่ายแล้ว (อาจถูกจ่าย/แก้ไขไปแล้ว)</div>
            ) : (
              <div className="space-y-2 mb-4">
                {modalEligibleRows.map((c) => (
                  <label key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelected(c.id)} />
                      <div>
                        <div>{c.installer_name}</div>
                        <div className="text-xs text-[var(--color-muted)]">{c.commission_type === 'percent' ? '% ต่องวด' : 'คงที่'} · {new Date(c.created_at).toLocaleDateString('th-TH')}</div>
                      </div>
                    </div>
                    <div className="font-medium">{THB(c.commission_amount)}</div>
                  </label>
                ))}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">เลขที่อ้างอิง / หมายเหตุการโอนเงิน</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น เลขที่รายการโอน K-Bank #123456"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
              <div className="text-sm">รวม <span className="font-bold">{THB(modalTotal)}</span> ({selectedIds.length} รายการ)</div>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm border border-[var(--color-border)]" onClick={closePayoutModal} disabled={submitting}>ยกเลิก</button>
                <button className="btn btn-primary btn-sm" onClick={submitPayout} disabled={submitting || selectedIds.length === 0}>
                  {submitting ? '⏳ กำลังบันทึก...' : '✓ ยืนยันว่าจ่ายแล้ว'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
