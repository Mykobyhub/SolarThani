'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="alert alert-error">
        <span>⚠️</span> ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('รหัสผ่านไม่ตรงกัน'); return; }
    if (password.length < 8) { setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        setTimeout(() => router.push('/login'), 2500);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="alert alert-success mb-5">
          <span>✅</span> ตั้งรหัสผ่านใหม่สำเร็จ! กำลังพาไปหน้าเข้าสู่ระบบ...
        </div>
        <Link href="/login" className="btn btn-primary">
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && <div className="alert alert-error mb-5"><span>⚠️</span> {error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label className="form-label">รหัสผ่านใหม่ <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="form-input pr-10"
              placeholder="อย่างน้อย 8 ตัวอักษร"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          <label className="form-label">ยืนยันรหัสผ่านใหม่ <span className="text-red-500">*</span></label>
          <input
            type={showPw ? 'text' : 'password'}
            className="form-input"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
          {loading ? '⏳ กำลังบันทึก...' : '🔐 ตั้งรหัสผ่านใหม่'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8">
      <div className="text-center mb-7">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg">
          🔓
        </div>
        <h1 className="text-2xl font-black text-[var(--color-text)]">ตั้งรหัสผ่านใหม่</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">กรอกรหัสผ่านใหม่ที่ต้องการ</p>
      </div>
      <Suspense fallback={<div className="text-center text-sm text-[var(--color-muted)]">โหลด...</div>}>
        <ResetForm />
      </Suspense>
      <p className="text-center text-sm text-[var(--color-muted)] mt-6">
        <Link href="/login" className="text-[var(--color-primary)] hover:underline">
          ← กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
