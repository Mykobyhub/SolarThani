'use client';

import { useEffect, useState } from 'react';

interface OmiseSettings {
  mode: 'test' | 'live';
  integration_mode: 'recipient_api' | 'account_chaining';
  test_public_key: string;
  live_public_key: string;
  test_secret_key_set: boolean;
  live_secret_key_set: boolean;
  webhook_url: string;
}

export default function GatewaySettingsTab({ showAlert }: { showAlert: (type: 'success' | 'error', msg: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<OmiseSettings | null>(null);
  const [mode, setMode] = useState<'test' | 'live'>('test');
  const [testPublicKey, setTestPublicKey] = useState('');
  const [livePublicKey, setLivePublicKey] = useState('');
  const [testSecretKey, setTestSecretKey] = useState('');
  const [liveSecretKey, setLiveSecretKey] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/settings/omise');
      const d = await res.json();
      if (d.success) {
        setSettings(d);
        setMode(d.mode);
        setTestPublicKey(d.test_public_key);
        setLivePublicKey(d.live_public_key);
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const body: Record<string, unknown> = {
      mode,
      integration_mode: 'recipient_api', // only mode implemented today — see note below
      test_public_key: testPublicKey,
      live_public_key: livePublicKey,
    };
    if (testSecretKey.trim()) body.test_secret_key = testSecretKey.trim();
    if (liveSecretKey.trim()) body.live_secret_key = liveSecretKey.trim();
    const res = await fetch('/api/admin/settings/omise', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    setSaving(false);
    if (d.success) {
      showAlert('success', d.message);
      setSettings((s) =>
        s
          ? {
              ...s,
              mode,
              test_secret_key_set: s.test_secret_key_set || !!testSecretKey.trim(),
              live_secret_key_set: s.live_secret_key_set || !!liveSecretKey.trim(),
            }
          : s
      );
      setTestSecretKey('');
      setLiveSecretKey('');
    } else {
      showAlert('error', d.error || d.message || 'เกิดข้อผิดพลาด');
    }
  }

  function copyWebhook() {
    if (!settings) return;
    navigator.clipboard?.writeText(settings.webhook_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return <div className="card p-10 text-center text-[var(--color-muted)] text-sm">กำลังโหลด...</div>;

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base">💳 Payment Gateway — Omise (Opn Payments)</h2>
          <span className={`badge ${mode === 'live' ? 'badge-danger' : 'badge-warning'}`}>{mode === 'live' ? 'LIVE — เงินจริง' : 'TEST MODE'}</span>
        </div>

        <p className="text-xs text-[var(--color-muted)] mb-4">
          ใช้ Omise Recipient API — เงินจากลูกค้าเข้าบัญชี Omise ของเราก่อน (Charge) แล้วเราโอนต่อให้ผู้ติดตั้งเอง (Transfer) เมื่อปล่อยเงินตามงวด
          ผู้ติดตั้งต้องกรอกข้อมูลบัญชีธนาคารในหน้าโปรไฟล์ก่อนจึงจะปล่อยเงินให้ได้ ระบบยังไม่รองรับ Account Chaining (sub-merchant ต่อผู้ติดตั้ง)
        </p>

        <div className="form-group mb-4" style={{ maxWidth: 320 }}>
          <label className="form-label">โหมดที่ใช้งาน</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={mode === 'test'} onChange={() => setMode('test')} /> Test
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={mode === 'live'} onChange={() => setMode('live')} /> Live
            </label>
          </div>
          <p className="form-hint">แนะนำให้ใช้ Test mode จนกว่าจะพร้อมใช้เงินจริง (ต้องผ่านการตรวจสอบ ธปท. ก่อน — แยกจากงานนี้)</p>
        </div>

        <div className="divider" />
        <div className="font-semibold text-sm mb-3">🧪 Test Mode Keys</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2" style={{ maxWidth: 680 }}>
          <div className="form-group mb-0">
            <label className="form-label">Test Public Key</label>
            <input type="text" className="form-input" value={testPublicKey} onChange={(e) => setTestPublicKey(e.target.value)} placeholder="pkey_test_..." />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">
              Test Secret Key{' '}
              {settings?.test_secret_key_set && <span className="text-xs font-normal text-[var(--color-muted)]">(ตั้งค่าไว้แล้ว)</span>}
            </label>
            <input
              type="password"
              className="form-input"
              value={testSecretKey}
              onChange={(e) => setTestSecretKey(e.target.value)}
              placeholder={settings?.test_secret_key_set ? '•••••••••••••• (เว้นว่างไว้เพื่อไม่เปลี่ยน)' : 'skey_test_...'}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="divider" />
        <div className="font-semibold text-sm mb-3">🔴 Live Mode Keys</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ maxWidth: 680 }}>
          <div className="form-group mb-0">
            <label className="form-label">Live Public Key</label>
            <input type="text" className="form-input" value={livePublicKey} onChange={(e) => setLivePublicKey(e.target.value)} placeholder="pkey_live_..." />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">
              Live Secret Key{' '}
              {settings?.live_secret_key_set && <span className="text-xs font-normal text-[var(--color-muted)]">(ตั้งค่าไว้แล้ว)</span>}
            </label>
            <input
              type="password"
              className="form-input"
              value={liveSecretKey}
              onChange={(e) => setLiveSecretKey(e.target.value)}
              placeholder={settings?.live_secret_key_set ? '•••••••••••••• (เว้นว่างไว้เพื่อไม่เปลี่ยน)' : 'skey_live_...'}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group mb-0 sm:col-span-2">
            <label className="form-label">Webhook URL</label>
            <div className="flex gap-2">
              <input type="text" className="form-input bg-gray-50 text-[var(--color-muted)]" value={settings?.webhook_url || ''} disabled />
              <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={copyWebhook}>{copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}</button>
            </div>
            <p className="form-hint">นำ URL นี้ไปตั้งค่าที่ Omise Dashboard → Webhooks (ทั้ง test และ live)</p>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
          </button>
        </div>
      </div>

      <div className="card p-4 text-xs text-[var(--color-muted)]">
        ผู้ติดตั้งต้องกรอกชื่อธนาคาร/เลขบัญชี/ชื่อบัญชีในหน้า &quot;ตั้งค่า&quot; ของ Dashboard ผู้ติดตั้งก่อน ระบบจึงจะสร้าง Omise Recipient และโอนเงินให้ได้จริง
      </div>
    </div>
  );
}
