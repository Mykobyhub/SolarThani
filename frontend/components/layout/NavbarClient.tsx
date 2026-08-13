'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { JwtPayload } from '@/types';

const NAV_LINKS = [
  { href: '/', label: 'หน้าหลัก' },
  { href: '/installers', label: 'รายชื่อผู้ติดตั้ง' },
  { href: '/calculator', label: 'คำนวณราคา' },
  { href: '/blog', label: 'บทความ' },
  { href: '/about', label: 'เกี่ยวกับเรา' },
  { href: '/contact', label: 'ติดต่อเรา' },
];

export default function NavbarClient({
  session,
  logoUrl,
  siteName,
}: {
  session: JwtPayload | null;
  logoUrl: string | null;
  siteName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    if (href.startsWith('/#')) return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* ── Desktop Nav ── */}
      <nav className="navbar-nav hidden md:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`navbar-nav-link${isActive(link.href) ? ' active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* ── Desktop Auth ── */}
      <div className="navbar-actions hidden md:flex">
        {session ? (
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold hover:bg-[var(--color-surface-2)] transition-colors border border-[var(--color-border)]"
            >
              <span className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
                {session.name?.[0] ?? 'U'}
              </span>
              <span className="max-w-[110px] truncate">{session.name}</span>
              <svg className="w-3.5 h-3.5 text-[var(--color-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={dropdownOpen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[var(--color-border)] py-1.5 z-50 overflow-hidden">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-text-light)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-primary)] transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <span className="text-base">📊</span> แดชบอร์ด
                </Link>
                {session.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-text-light)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-primary)] transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="text-base">⚙️</span> Admin Panel
                  </Link>
                )}
                <div className="h-px bg-[var(--color-border)] mx-3 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <span className="text-base">🚪</span> ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost btn-sm text-[var(--color-text-light)] hover:text-[var(--color-primary)]">
              เข้าสู่ระบบ
            </Link>
            <Link href="/register" className="btn btn-primary btn-sm">
              ลงทะเบียนฟรี
            </Link>
          </>
        )}
      </div>

      {/* ── Mobile hamburger ── */}
      <button
        className="md:hidden p-2 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="เปิด/ปิดเมนู"
      >
        <span className={`block w-5 h-0.5 bg-[var(--color-text)] transition-all mb-1.5 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`block w-5 h-0.5 bg-[var(--color-text)] transition-all mb-1.5 ${menuOpen ? 'opacity-0' : ''}`} />
        <span className={`block w-4 h-0.5 bg-[var(--color-text)] transition-all ${menuOpen ? '-rotate-45 -translate-y-2 w-5' : ''}`} />
      </button>

      {/* ── Mobile menu overlay ── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-[300px] bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-8 object-contain" />
              ) : (
                <span className="flex items-center gap-2 font-bold text-[var(--color-text)]">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-amber-400 flex items-center justify-center text-base flex-shrink-0">☀️</div>
                  {siteName}
                </span>
              )}
              <button
                onClick={() => setMenuOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--color-surface-2)] text-[var(--color-muted)] transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col p-4 flex-1 overflow-y-auto gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'text-[var(--color-primary)] bg-[var(--color-primary-light)] font-semibold'
                      : 'text-[var(--color-text-light)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Auth section */}
            <div className="p-4 border-t border-[var(--color-border)] space-y-2">
              {session ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-bg-alt)] rounded-xl">
                    <span className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold uppercase flex-shrink-0">
                      {session.name?.[0] ?? 'U'}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{session.name}</div>
                      <div className="text-xs text-[var(--color-muted)]">{session.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ติดตั้ง'}</div>
                    </div>
                  </div>
                  <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-[var(--color-text-light)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-primary)] transition-colors">
                    📊 แดชบอร์ด
                  </Link>
                  {session.role === 'admin' && (
                    <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-[var(--color-text-light)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-primary)] transition-colors">
                      ⚙️ Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    🚪 ออกจากระบบ
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn btn-secondary btn-sm w-full justify-center">
                    เข้าสู่ระบบ
                  </Link>
                  <Link href="/register" className="btn btn-primary btn-sm w-full justify-center">
                    ลงทะเบียนฟรี
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
