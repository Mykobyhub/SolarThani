import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';

async function getSiteContent() {
  try {
    const rows = (await db
      .prepare("SELECT key, value FROM site_content WHERE key IN ('site_name','support_email','footer_text','logo_url','footer_logo_url')")
      .all()) as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      name: map['site_name'] || 'Solar Thani',
      email: map['support_email'] || '',
      footerText: map['footer_text'] || '',
      logo: map['footer_logo_url'] || map['logo_url'] || null,
    };
  } catch {
    return { name: 'Solar Thani', email: '', footerText: '', logo: null };
  }
}

export default async function Footer() {
  const site = await getSiteContent();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* Brand — 4 cols */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-2.5 mb-4">
              {site.logo ? (
                <Image
                  src={site.logo}
                  alt={site.name}
                  width={120}
                  height={40}
                  className="h-10 w-auto object-contain"
                  unoptimized
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-amber-400 flex items-center justify-center text-xl flex-shrink-0 shadow-md">
                  ☀️
                </div>
              )}
              <div className="footer-brand-name">{site.name}</div>
            </div>
            <p className="footer-tagline">
              {site.footerText ||
                'แหล่งรวมผู้ติดตั้งโซลาร์เซลล์ที่ผ่านการตรวจสอบทั่วประเทศไทย เปรียบเทียบราคา รีวิว และเลือกผู้ติดตั้งที่ดีที่สุด'}
            </p>
            {site.email && (
              <a
                href={`mailto:${site.email}`}
                className="inline-flex items-center gap-2 mt-4 text-sm text-white/50 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                {site.email}
              </a>
            )}

            {/* Social links */}
            <div className="flex gap-2.5 mt-5">
              {[
                {
                  label: 'Facebook', href: '#',
                  icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
                },
                {
                  label: 'Line', href: '#',
                  icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>,
                },
                {
                  label: 'YouTube', href: '#',
                  icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
                },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick links — 2 cols */}
          <div className="md:col-span-2">
            <div className="footer-heading">เมนูหลัก</div>
            <ul className="space-y-0.5">
              {[
                { href: '/',           label: 'หน้าแรก' },
                { href: '/installers', label: 'รายชื่อผู้ติดตั้ง' },
                { href: '/calculator', label: 'คำนวณราคา' },
                { href: '/blog',       label: 'บทความ' },
                { href: '/contact',    label: 'ติดต่อเรา' },
                { href: '/affiliate',  label: 'โปรแกรม Affiliate' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="footer-link">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For installers — 2 cols */}
          <div className="md:col-span-2">
            <div className="footer-heading">สำหรับผู้ติดตั้ง</div>
            <ul className="space-y-0.5">
              {[
                { href: '/register',   label: 'ลงทะเบียน' },
                { href: '/login',      label: 'เข้าสู่ระบบ' },
                { href: '/dashboard',  label: 'แดชบอร์ด' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="footer-link">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Why solar — 4 cols */}
          <div className="md:col-span-4">
            <div className="footer-heading">ทำไมต้องโซลาร์เซลล์?</div>
            <ul className="space-y-2.5">
              {[
                { icon: '💡', text: 'ลดค่าไฟฟ้าได้สูงสุด 80%' },
                { icon: '🌿', text: 'ลดการปล่อย CO₂' },
                { icon: '💰', text: 'คืนทุนภายใน 5–7 ปี' },
                { icon: '🔋', text: 'รองรับแบตเตอรี่สำรองไฟ' },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-2.5 text-sm text-white/55">
                  <span className="text-base">{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="footer-divider" />

        <div className="footer-bottom justify-center">
          <p>© {year} {site.name}. สงวนลิขสิทธิ์</p>
        </div>
      </div>
    </footer>
  );
}
