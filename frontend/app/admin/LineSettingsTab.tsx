'use client';

import { useEffect, useState } from 'react';

interface LineSettings {
  channel_id: string;
  oa_basic_id: string;
  channel_secret_set: boolean;
  channel_access_token_set: boolean;
  notify_enabled: boolean;
  webhook_url: string;
}

export default function LineSettingsTab({ showAlert }: { showAlert: (type: 'success' | 'error', msg: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<LineSettings | null>(null);
  const [channelId, setChannelId] = useState('');
  const [oaBasicId, setOaBasicId] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/settings/line');
      const d = await res.json();
      if (d.success) {
        setSettings(d);
        setChannelId(d.channel_id);
        setOaBasicId(d.oa_basic_id);
        setNotifyEnabled(d.notify_enabled);
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const body: Record<string, unknown> = { channel_id: channelId, oa_basic_id: oaBasicId, notify_enabled: notifyEnabled };
    if (channelSecret.trim()) body.channel_secret = channelSecret.trim();
    if (accessToken.trim()) body.channel_access_token = accessToken.trim();
    const res = await fetch('/api/admin/settings/line', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    setSaving(false);
    if (d.success) {
      showAlert('success', d.message);
      setSettings((s) => (s ? { ...s, channel_secret_set: s.channel_secret_set || !!channelSecret.trim(), channel_access_token_set: s.channel_access_token_set || !!accessToken.trim() } : s));
      setChannelSecret('');
      setAccessToken('');
    } else {
      showAlert('error', d.error || d.message || 'เกิดข้อผิดพลาด');
    }
  }

  async function testSend() {
    setTesting(true);
    const res = await fetch('/api/admin/settings/line/test', { method: 'POST' });
    const d = await res.json();
    setTesting(false);
    if (d.success) showAlert('success', d.message);
    else showAlert('error', d.error || d.message || 'เกิดข้อผิดพลาด');
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
          <h2 className="font-bold text-base">📱 LINE Official Account — การแจ้งเตือน</h2>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={notifyEnabled} onChange={(e) => setNotifyEnabled(e.target.checked)} />
            เปิดใช้งานการแจ้งเตือนทาง LINE
          </label>
        </div>

        <p className="text-xs text-[var(--color-muted)] mb-4">
          ใช้ LINE OA เดียวสำหรับทั้งเว็บไซต์เพื่อส่งแจ้งเตือนเกี่ยวกับโครงการผ่อนชำระ (เสนอแผน, ชำระเงิน, แจ้งงวดเสร็จ, ปล่อยเงิน, ข้อโต้แย้ง)
          — กรอก credential จาก LINE Developers Console ให้ครบและเปิดใช้งานเพื่อเริ่มส่งข้อความจริง หากยังไม่ได้ตั้งค่า ระบบจะข้ามการส่งทาง LINE เงียบๆ (ยังใช้อีเมลได้ตามปกติ)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ maxWidth: 680 }}>
          <div className="form-group mb-0">
            <label className="form-label">Channel ID</label>
            <input type="text" className="form-input" value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="1234567890" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">OA Basic ID</label>
            <input type="text" className="form-input" value={oaBasicId} onChange={(e) => setOaBasicId(e.target.value)} placeholder="@solarthani" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">
              Channel Secret{' '}
              {settings?.channel_secret_set && <span className="text-xs font-normal text-[var(--color-muted)]">(ตั้งค่าไว้แล้ว)</span>}
            </label>
            <input
              type="password"
              className="form-input"
              value={channelSecret}
              onChange={(e) => setChannelSecret(e.target.value)}
              placeholder={settings?.channel_secret_set ? '•••••••••••••• (เว้นว่างไว้เพื่อไม่เปลี่ยน)' : 'ยังไม่ได้ตั้งค่า'}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">
              Channel Access Token{' '}
              {settings?.channel_access_token_set && <span className="text-xs font-normal text-[var(--color-muted)]">(ตั้งค่าไว้แล้ว)</span>}
            </label>
            <input
              type="password"
              className="form-input"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={settings?.channel_access_token_set ? '•••••••••••••• (เว้นว่างไว้เพื่อไม่เปลี่ยน)' : 'ยังไม่ได้ตั้งค่า'}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group mb-0 sm:col-span-2">
            <label className="form-label">Webhook URL</label>
            <div className="flex gap-2">
              <input type="text" className="form-input bg-gray-50 text-[var(--color-muted)]" value={settings?.webhook_url || ''} disabled />
              <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={copyWebhook}>{copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}</button>
            </div>
            <p className="form-hint">นำ URL นี้ไปตั้งค่าใน LINE Developers Console</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button type="button" className="btn btn-outline btn-sm" disabled={testing} onClick={testSend}>
            {testing ? '⏳ กำลังส่ง...' : '📤 ทดสอบส่งข้อความ'}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: '✅', label: 'ส่งสำเร็จวันนี้', val: 0 },
          { icon: '❌', label: 'ส่งไม่สำเร็จ', val: 0 },
          { icon: '🔗', label: 'ผู้ใช้เชื่อมต่อ LINE ทั้งหมด', val: 0 },
          { icon: '📈', label: 'อัตราส่งสำเร็จ', val: '—' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold">{s.val}</div>
            <div className="text-xs text-[var(--color-muted)]">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
