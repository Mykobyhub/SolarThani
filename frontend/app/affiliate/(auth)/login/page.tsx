'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AffiliateLoginPage() {
  return (
    <Suspense fallback={null}>
      <AffiliateLoginForm />
    </Suspense>
  );
}

function AffiliateLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const verified = params.get('verified') === '1';
  const verifyInvalid = params.get('verify') === 'invalid';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/affiliate/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/affiliate/dashboard');
        router.refresh();
      } else {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
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
        <h1 className="text-2xl font-black text-[var(--color-text)]">เข้าสู่ระบบ Affiliate</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">ยินดีต้อนรับกลับ</p>
      </div>

      {verified && (
        <div className="alert alert-success mb-5">
          <span>✅</span> ยืนยันอีเมลสำเร็จ! กรุณาเข้าสู่ระบบ
        </div>
      )}
      {verifyInvalid && (
        <div className="alert alert-error mb-5">
          <span>⚠️</span> ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุแล้ว
        </div>
      )}
      {error && (
        <div className="alert alert-error mb-5">
          <span>⚠️</span> {error}
        </div>
      )}

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
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label className="form-label">รหัสผ่าน</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="form-input pr-10"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0262EC] hover:text-[#0250cc] transition-colors"
              aria-label={showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            >
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

        <div className="flex justify-end">
          <Link href="/affiliate/forgot-password" className="text-sm text-[var(--color-primary)] hover:underline">
            ลืมรหัสผ่าน?
          </Link>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--color-muted)] mt-6">
        ยังไม่มีบัญชี Affiliate?{' '}
        <Link href="/affiliate" className="text-[var(--color-primary)] font-semibold hover:underline">
          สมัครเลย
        </Link>
      </p>
    </>
  );
}
