'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function ContactForm() {
  const params = useSearchParams();
  const installerId = params.get('installer_id');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: installerId ? 'ขอใบเสนอราคา' : '',
    message: installerId ? `สนใจขอใบเสนอราคาจากผู้ติดตั้ง ID: ${installerId}` : '',
  });

  useEffect(() => {
    fetch('/api/content')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.support_email) setSupportEmail(d.data.support_email);
      })
      .catch(() => {});
  }, []);

  function update(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/contact-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, installer_id: installerId ? Number(installerId) : undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('ส่งข้อความสำเร็จ! ทีมงานจะติดต่อกลับเร็วๆ นี้');
        setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form */}
      <div className="lg:col-span-2">
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-5">📝 ส่งข้อความถึงเรา</h2>

          {success && <div className="alert alert-success mb-5"><span>✅</span> {success}</div>}
          {error   && <div className="alert alert-error   mb-5"><span>⚠️</span> {error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">ชื่อ <span className="text-red-500">*</span></label>
                <input type="text" className="form-input" placeholder="ชื่อ-นามสกุล" value={form.name} onChange={update('name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">อีเมล <span className="text-red-500">*</span></label>
                <input type="email" className="form-input" placeholder="example@email.com" value={form.email} onChange={update('email')} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">เบอร์โทร <span className="text-red-500">*</span></label>
                <input type="tel" className="form-input" placeholder="0X-XXX-XXXX" value={form.phone} onChange={update('phone')} required />
              </div>
              <div className="form-group">
                <label className="form-label">หัวข้อ <span className="text-red-500">*</span></label>
                <select className="form-input" value={form.subject} onChange={update('subject')} required>
                  <option value="">เลือกหัวข้อ...</option>
                  <option>ขอใบเสนอราคา</option>
                  <option>ต้องการสอบถาม</option>
                  <option>แจ้งปัญหา</option>
                  <option>อื่นๆ</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">ข้อความ <span className="text-red-500">*</span></label>
              <textarea
                className="form-input"
                rows={5}
                placeholder="รายละเอียดที่ต้องการสอบถามหรือแจ้ง..."
                value={form.message}
                onChange={update('message')}
                required
                style={{ resize: 'vertical' }}
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
              {loading ? 'กำลังส่ง...' : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                  ส่งข้อความ
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-5">
        <div className="card p-5">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5 text-[var(--color-primary)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.74v6.018Z" />
            </svg>
            ข้อมูลติดต่อ
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--color-primary)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <div>
                <div className="font-medium">พื้นที่บริการ</div>
                <div className="text-[var(--color-muted)]">ทั่วประเทศไทย</div>
              </div>
            </div>
            {supportEmail && (
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--color-primary)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                <div>
                  <div className="font-medium">อีเมล</div>
                  <a href={`mailto:${supportEmail}`} className="text-[var(--color-primary)] hover:underline">{supportEmail}</a>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--color-primary)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <div>
                <div className="font-medium">เวลาทำการ</div>
                <div className="text-[var(--color-muted)]">จันทร์–ศุกร์ 9.00–18.00</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-[var(--radius-xl)]" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', color: '#fff' }}>
          <div className="mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803 7.5 7.5 0 0 0 15.803 15.803Z" />
            </svg>
          </div>
          <h3 className="font-bold mb-1" style={{ color: '#ffffff' }}>ต้องการขอใบเสนอราคา?</h3>
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.85)' }}>ค้นหาผู้ติดตั้งในพื้นที่และติดต่อโดยตรง</p>
          <Link href="/installers" className="btn btn-outline-white btn-sm w-full justify-center">ดูรายชื่อผู้ติดตั้ง</Link>
        </div>
      </div>
    </div>
  );
}
