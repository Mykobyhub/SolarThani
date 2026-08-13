'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [providers, setProviders] = useState<string[]>([]);

  // Load active OAuth providers
  useEffect(() => {
    fetch('/api/auth/providers')
      .then((r) => r.json())
      .then((d) => setProviders(d.data?.map((p: { provider: string }) => p.provider) ?? []))
      .catch(() => {});

    // Handle OAuth callback token
    const token = params.get('token');
    if (token) {
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oauthToken: token }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) redirectByRole(d.data.role);
        })
        .catch(() => {});
    }

    // Handle OAuth error
    const oauthErr = params.get('error');
    if (oauthErr) setError(decodeURIComponent(oauthErr));
  }, [params]);

  function redirectByRole(role: string) {
    router.push(role === 'admin' ? '/admin' : '/dashboard');
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        redirectByRole(data.data.role);
      } else {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }

  const PROVIDER_META: Record<string, { label: string; icon: string; color: string }> = {
    google:   { label: 'Google',   icon: '🔵', color: '#4285f4' },
    facebook: { label: 'Facebook', icon: '📘', color: '#1877f3' },
    twitter:  { label: 'X (Twitter)', icon: '✖️', color: '#000' },
    tiktok:   { label: 'TikTok',   icon: '🎵', color: '#010101' },
  };

  return (
    <>
      <div className="text-center mb-7">
        <h1 className="text-2xl font-black text-[var(--color-text)]">เข้าสู่ระบบ</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">ยินดีต้อนรับกลับ</p>
      </div>

      {error && (
        <div className="alert alert-error mb-5">
          <span>⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label className="form-label">อีเมล / ชื่อผู้ใช้</label>
          <input
            type="text"
            className="form-input"
            placeholder="อีเมล หรือ ชื่อผู้ใช้"
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
          <Link href="/forgot-password" className="text-sm text-[var(--color-primary)] hover:underline">
            ลืมรหัสผ่าน?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full justify-center"
        >
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>

      {/* Social OAuth */}
      {providers.length > 0 && (
        <>
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-muted)]">หรือเข้าสู่ระบบด้วย</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {providers.map((prov) => {
              const meta = PROVIDER_META[prov];
              if (!meta) return null;
              return (
                <a
                  key={prov}
                  href={`/api/auth/${prov}`}
                  className="btn btn-outline text-sm justify-center gap-2"
                >
                  <span>{meta.icon}</span> {meta.label}
                </a>
              );
            })}
          </div>
        </>
      )}

      <p className="text-center text-sm text-[var(--color-muted)] mt-6">
        ยังไม่มีบัญชี?{' '}
        <Link href="/register" className="text-[var(--color-primary)] font-semibold hover:underline">
          สมัครผู้ติดตั้ง
        </Link>
      </p>
    </>
  );
}
