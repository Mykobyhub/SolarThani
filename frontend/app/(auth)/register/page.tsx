'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!agreed) {
      setError('กรุณายอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัวก่อนสมัคร');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    if (form.password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(
          data.data?.autoApproved
            ? 'สมัครสำเร็จ! กรุณาเข้าสู่ระบบ'
            : 'สมัครสำเร็จ! กรุณารอการอนุมัติจากผู้ดูแลระบบ'
        );
        setTimeout(() => router.push('/login'), 2500);
      } else {
        setError(data.error || 'สมัครไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="text-center mb-7">
        <h1 className="text-2xl font-black text-[var(--color-text)]">สมัครผู้ติดตั้ง</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">ลงทะเบียนเป็นผู้ให้บริการในไดเรกทอรี</p>
      </div>

      {success && <div className="alert alert-success mb-5"><span>✅</span> {success}</div>}
      {error   && <div className="alert alert-error   mb-5"><span>⚠️</span> {error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Company name */}
        <div className="form-group">
          <label className="form-label">ชื่อบริษัท / ชื่อผู้ติดตั้ง <span className="text-red-500">*</span></label>
          <input type="text" className="form-input" placeholder="เช่น Eco Solar Pro" value={form.name} onChange={update('name')} required />
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label">อีเมล <span className="text-red-500">*</span></label>
          <input type="email" className="form-input" placeholder="example@email.com" value={form.email} onChange={update('email')} required autoComplete="email" />
        </div>

        {/* Password row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">รหัสผ่าน <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="form-input pr-10"
                placeholder="อย่างน้อย 8 ตัวอักษร"
                value={form.password}
                onChange={update('password')}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0262EC] hover:text-[#0250cc] transition-colors">
                {showPw ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">ยืนยันรหัสผ่าน <span className="text-red-500">*</span></label>
            <input
              type={showPw ? 'text' : 'password'}
              className="form-input"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="form-group">
          <label className="form-label">เบอร์โทร</label>
          <input type="tel" className="form-input" placeholder="0X-XXX-XXXX" value={form.phone} onChange={update('phone')} />
        </div>

        {/* Terms checkbox */}
        <div className="flex items-start gap-3 pt-1">
          <input
            id="agree-terms"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[var(--color-primary)] cursor-pointer"
          />
          <label htmlFor="agree-terms" className="text-sm leading-snug cursor-pointer" style={{ color: 'var(--color-muted)' }}>
            ฉันได้อ่านและยอมรับ{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 hover:opacity-80"
              style={{ color: 'var(--color-primary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              เงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว
            </a>
            {' '}รวมถึงยินยอมให้เก็บและใช้ข้อมูลของฉันตามที่ระบุไว้ <span className="text-red-500">*</span>
          </label>
        </div>

        <button type="submit" disabled={loading || !agreed} className="btn btn-primary w-full justify-center mt-2">
          {loading ? 'กำลังสมัคร...' : 'สมัครเลย'}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--color-muted)] mt-6">
        มีบัญชีแล้ว?{' '}
        <Link href="/login" className="text-[var(--color-primary)] font-semibold hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </>
  );
}
