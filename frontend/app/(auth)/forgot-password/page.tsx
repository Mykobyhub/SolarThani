'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
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
    <>
      <div className="text-center mb-7">
        <h1 className="text-2xl font-black text-[var(--color-text)]">ลืมรหัสผ่าน</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          ใส่อีเมลที่ลงทะเบียนไว้ เราจะส่งลิงก์รีเซ็ตให้
        </p>
      </div>

      {done ? (
        <div className="text-center">
          <div className="alert alert-success mb-5">
            <span>✅</span>
            ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ <strong>{email}</strong> แล้ว<br />
            กรุณาตรวจสอบกล่องขาเข้า (และ spam)
          </div>
          <Link href="/login" className="btn btn-outline mt-2">
            ← กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      ) : (
        <>
          {error && <div className="alert alert-error mb-5"><span>⚠️</span> {error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label">อีเมล</label>
              <input
                type="email"
                className="form-input"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
              {loading ? '⏳ กำลังส่ง...' : '📧 ส่งลิงก์รีเซ็ต'}
            </button>
          </form>
        </>
      )}

      <p className="text-center text-sm text-[var(--color-muted)] mt-6">
        จำรหัสผ่านได้แล้ว?{' '}
        <Link href="/login" className="text-[var(--color-primary)] font-semibold hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </>
  );
}
