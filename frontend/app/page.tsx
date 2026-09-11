import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import type { Installer, Blog, SiteContent } from '@/types';
import { SITE_URL, jsonLdHtml } from '@/lib/jsonld';

export const metadata: Metadata = {
  title: 'Solar Thani — ค้นหาผู้ติดตั้งโซลาร์เซลล์',
};

export const revalidate = 300;

async function getSiteData() {
  try {
    const rows = (await db.prepare('SELECT key, value FROM site_content').all()) as SiteContent[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch { return {}; }
}

async function getInstallers(): Promise<Installer[]> {
  try {
    return (await db
      .prepare("SELECT * FROM installers WHERE status='active' ORDER BY (rating * LOG(reviews_count + 1)) DESC LIMIT 8")
      .all()) as Installer[];
  } catch { return []; }
}

async function getFeaturedBlogs(): Promise<Blog[]> {
  try {
    return (await db
      .prepare("SELECT * FROM blogs WHERE featured=1 AND status='active' ORDER BY published_at DESC LIMIT 3")
      .all()) as Blog[];
  } catch { return []; }
}

export default async function HomePage() {
  const site      = await getSiteData();
  const installers      = await getInstallers();
  const featuredBlogs   = await getFeaturedBlogs();

  const heroTitle = site['hero_headline'] || 'ค้นหาผู้ติดตั้งโซลาร์เซลล์ที่ใช่สำหรับคุณ';
  const heroSub   = site['hero_sub']      || 'เปรียบเทียบผู้ติดตั้งกว่า 150 ราย พร้อมรีวิวจริงและเครื่องมือคำนวณราคา';
  const heroBg    = site['hero_bg_image'] || null;

  // Bound to the real search box below (`<form action="/installers" method="GET">`, input name="q"),
  // which InstallersClient reads on mount to filter the installer list.
  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Solar Thani',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/installers?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(websiteLd) }} />

      {/* ════════════════════════════════════════
          HERO — LearnHub split layout
      ════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white">
        {/* Subtle dot grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.5] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(15,31,75,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Glow blobs */}
        <div aria-hidden className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[var(--color-primary)]/8 blur-[80px] pointer-events-none" />
        <div aria-hidden className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-[var(--color-accent)]/8 blur-[60px] pointer-events-none" />

        <div className="container relative pt-16 pb-14 lg:pt-20 lg:pb-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* ── Left: text ── */}
            <div>
              {/* Eyebrow pill */}
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 ring-1 ring-[var(--color-border)] bg-[var(--color-primary-light)]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="text-xs text-[var(--color-primary)] font-medium">ผู้ติดตั้งที่ผ่านการตรวจสอบกว่า 150 รายทั่วประเทศ</span>
              </div>

              {/* Headline */}
              <h1 className="text-[2.4rem] leading-[1.18] font-black text-[var(--color-text)] sm:text-5xl lg:text-[3rem] tracking-tight">
                {heroTitle}
              </h1>
              <p className="mt-5 text-[var(--color-muted)] text-base leading-relaxed max-w-[480px]">
                {heroSub}
              </p>

              {/* Search bar */}
              <form action="/installers" method="GET" className="mt-8 max-w-[440px]">
                <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 ring-1 ring-[var(--color-border)] shadow-sm">
                  <div className="flex flex-1 items-center gap-2 px-3">
                    <svg className="w-4 h-4 text-[var(--color-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      name="q"
                      placeholder="ค้นหาผู้ติดตั้ง หรือจังหวัด..."
                      className="flex-1 bg-transparent text-[var(--color-text)] placeholder-[var(--color-muted)] text-sm outline-none py-2"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm flex-shrink-0 rounded-xl"
                    style={{ borderRadius: '12px' }}
                  >
                    ค้นหา
                  </button>
                </div>
              </form>

              {/* Popular tags */}
              <div className="mt-3.5 flex flex-wrap gap-2 items-center">
                <span className="text-[11px] text-[var(--color-muted)]">ยอดนิยม:</span>
                {['กรุงเทพ', 'เชียงใหม่', 'ภูเก็ต', 'ชลบุรี', 'ขอนแก่น'].map((p) => (
                  <Link
                    key={p}
                    href={`/installers?province=${encodeURIComponent(p)}`}
                    className="text-[11px] text-[var(--color-text-light)] hover:text-[var(--color-primary)] bg-[var(--color-bg-alt)] hover:bg-[var(--color-primary-light)] rounded-full px-3 py-1 transition-all border border-[var(--color-border)]"
                  >
                    {p}
                  </Link>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/installers" className="btn btn-primary btn-lg inline-flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  ค้นหาผู้ติดตั้ง
                </Link>
                <Link href="/calculator" className="btn btn-secondary btn-lg inline-flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm2.498-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm2.248-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008ZM8.25 6h7.5v2.25h-7.5V6ZM4.5 3.75h15A2.25 2.25 0 0 1 21.75 6v12A2.25 2.25 0 0 1 19.5 20.25h-15A2.25 2.25 0 0 1 2.25 18V6A2.25 2.25 0 0 1 4.5 3.75Z" />
                  </svg>
                  คำนวณราคา
                </Link>
              </div>
            </div>

            {/* ── Right: visual card ── */}
            <div className="hidden lg:block relative">
              {/* Main card */}
              <div className="relative rounded-3xl overflow-hidden shadow-xl ring-1 ring-[var(--color-border)] aspect-[4/3]">
                {heroBg ? (
                  <img src={heroBg} alt="Solar Panel Installation" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0d2c8a] via-[#0262EC] to-[#0282FB] flex items-center justify-center">
                    <span className="text-[9rem] opacity-15 select-none">☀️</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Stats bar ── */}
          <div className="mt-14 pt-10 border-t border-[var(--color-border)] grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { num: '150+',    label: 'ผู้ติดตั้งที่ตรวจสอบแล้ว' },
              { num: '4.8 ★',   label: 'คะแนนเฉลี่ยจากรีวิวจริง'  },
              { num: '77',      label: 'จังหวัดทั่วประเทศ'          },
              { num: '10,000+', label: 'โครงการที่สำเร็จแล้ว'       },
            ].map((s, i) => (
              <div key={s.label} className={`text-center lg:text-left ${i > 0 ? 'md:border-l md:border-[var(--color-border)] md:pl-6' : ''}`}>
                <div className="text-3xl font-black text-[var(--color-primary)] leading-none">{s.num}</div>
                <div className="text-xs text-[var(--color-muted)] mt-2 leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          HOW IT WORKS — 3 steps, LearnHub card style
      ════════════════════════════════════════ */}
      <section className="section bg-white">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">ง่ายแค่ 3 ขั้นตอน</span>
            <h2 className="section-title">เริ่มต้นหาผู้ติดตั้งโซลาร์เซลล์</h2>
            <p className="section-sub">ค้นหา เปรียบเทียบ และติดต่อผู้ติดตั้งที่ตรงใจ — ฟรี ไม่มีค่าใช้จ่าย</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: '🔍',
                iconClass: 'icon-box-blue',
                title: 'ค้นหาผู้ติดตั้ง',
                desc: 'ค้นหาตามจังหวัด ราคา หรือประเภทระบบที่ต้องการ ครอบคลุม 77 จังหวัดทั่วประเทศ',
                href: '/installers',
              },
              {
                step: '02',
                icon: '⚖️',
                iconClass: 'icon-box-orange',
                title: 'เปรียบเทียบและเลือก',
                desc: 'อ่านรีวิวจริงจากลูกค้า ดูผลงาน และใช้เครื่องมือคำนวณคืนทุน',
                href: '/calculator',
              },
              {
                step: '03',
                icon: '📞',
                iconClass: 'icon-box-green',
                title: 'ติดต่อผู้ติดตั้ง',
                desc: 'ติดต่อโดยตรง รับใบเสนอราคาฟรี ไม่มีค่าใช้จ่ายใดๆ',
                href: '/contact',
              },
            ].map((item) => (
              <Link key={item.step} href={item.href} className="step-card group block">
                <div className="step-card-number">{item.step}</div>
                <div className={`icon-box ${item.iconClass} mb-5`}>{item.icon}</div>
                <h3 className="font-bold text-[var(--color-text)] text-lg mb-2.5 group-hover:text-[var(--color-primary)] transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURED INSTALLERS — LearnHub card grid
      ════════════════════════════════════════ */}
      <section className="section" id="directory">
        <div className="container">
          {/* Header row */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="section-eyebrow">แนะนำ</span>
              <h2 className="section-title mb-0">ผู้ติดตั้งโซลาร์แนะนำ</h2>
              <p className="text-[var(--color-muted)] text-sm mt-2">คัดเลือกเฉพาะผู้ที่ผ่านการตรวจสอบมาตรฐานและมีรีวิวดีเด่น</p>
            </div>
            <Link
              href="/installers"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors"
            >
              ดูทั้งหมด
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {installers.map((inst) => (
              <div key={inst.id} className="inst-card group">

                {/* ── Cover: logo เป็น cover image, tint 30% เมื่อไม่มี logo ── */}
                <div
                  className="inst-card-cover"
                  style={{
                    background: inst.card_image
                      ? 'transparent'
                      : inst.logo_url
                        ? '#fff'
                        : 'linear-gradient(135deg, rgba(2,98,236,0.3) 0%, rgba(2,130,251,0.2) 100%)',
                  }}
                >
                  {inst.card_image ? (
                    <Image src={inst.card_image} alt={inst.name} fill className="object-cover" sizes="300px" unoptimized />
                  ) : inst.logo_url || site['default_installer_card_image'] || site['default_installer_image'] ? (
                    <Image
                      src={inst.logo_url || site['default_installer_card_image'] || site['default_installer_image']}
                      alt={inst.name} fill sizes="300px" unoptimized
                      className={inst.logo_url ? 'object-contain p-8' : 'object-cover'}
                      style={inst.logo_url ? undefined : { filter: 'grayscale(10%)', opacity: 0.5 }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.08]">
                      <span className="text-6xl">🏢</span>
                    </div>
                  )}
                  {inst.experience > 0 && (
                    <div className="absolute top-3 left-3 bg-white border border-[var(--color-border)] text-[var(--color-muted)] rounded-full px-2.5 py-1 text-[10px] font-semibold">
                      {inst.experience} ปีประสบการณ์
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm border border-[var(--color-border)]">
                    <span className="text-amber-400 text-xs">★</span>
                    <span className="text-xs font-bold text-gray-800">{Number(inst.rating || 0).toFixed(1)}</span>
                    <span className="text-[10px] text-gray-400">({inst.reviews_count})</span>
                  </div>
                </div>

                {/* ── Body ── */}
                <div className="inst-card-body">
                  {/* top section — flex-col gap replaces per-element margins */}
                  <div className="flex-1 flex flex-col gap-2.5">
                    {inst.verified_at && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5 self-start">
                        ✓ ตรวจสอบแล้ว
                      </span>
                    )}
                    <h3 className="font-bold text-[15px] leading-snug line-clamp-2 text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                      {inst.name}
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] flex items-center gap-1.5">
                      <span>📍</span>{inst.location}
                    </p>
                  </div>

                  {/* divider + stats — LearnHub style inline */}
                  <div className="border-t border-[var(--color-border)] mt-4 pt-4">
                    <div className="flex items-center justify-around mb-4">
                      <div className="text-center">
                        <div className="text-base font-black text-[var(--color-primary)] leading-none">{inst.total_projects}</div>
                        <div className="text-[11px] text-[var(--color-muted)] mt-1">โครงการ</div>
                      </div>
                      <div className="w-px h-8 bg-[var(--color-border)]" />
                      <div className="text-center">
                        <div className="text-base font-black text-[var(--color-primary)] leading-none">
                          {inst.total_kw}<span className="text-[11px] font-normal ml-0.5">kW</span>
                        </div>
                        <div className="text-[11px] text-[var(--color-muted)] mt-1">ติดตั้งแล้ว</div>
                      </div>
                    </div>
                    <Link
                      href={`/installers/${inst.id}`}
                      className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] border border-[var(--color-primary)]/40 rounded-xl py-2.5 hover:bg-[var(--color-primary-light)] hover:border-[var(--color-primary)] transition-all"
                    >
                      ดูรายละเอียด
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: see all */}
          <div className="text-center mt-10 sm:hidden">
            <Link href="/installers" className="btn btn-primary btn-lg">
              ดูผู้ติดตั้งทั้งหมด →
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CALCULATOR CTA BANNER
      ════════════════════════════════════════ */}
      <section className="section bg-white">
        <div className="container">
          <div className="cta-banner" style={site['calculator_banner_image'] ? {
            backgroundImage: `url(${site['calculator_banner_image']})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}>
            {/* Rings */}
            <div className="cta-banner-ring" style={{ width: 300, height: 300, right: 80, top: '50%', transform: 'translateY(-50%)' }} />
            <div className="cta-banner-ring" style={{ width: 420, height: 420, right: 20, top: '50%', transform: 'translateY(-50%)' }} />

            <div className="relative max-w-lg">
              <span className="section-eyebrow" style={{ color: '#bfdbfe' }}>เครื่องมือฟรี</span>
              <h2 className="text-2xl md:text-3xl font-black mt-1 mb-3 leading-tight" style={{ color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.45)' }}>
                คำนวณค่าใช้จ่าย<br className="hidden sm:block" />และระยะเวลาคืนทุน
              </h2>
              <p className="text-white/85 mb-7 text-[0.9375rem] leading-relaxed">
                ใส่ค่าไฟต่อเดือนและขนาดระบบ ระบบจะคำนวณราคาติดตั้งและระยะเวลาคืนทุนโดยประมาณให้ทันที
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/calculator" className="btn btn-primary btn-lg inline-flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm2.498-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm2.248-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008ZM8.25 6h7.5v2.25h-7.5V6ZM4.5 3.75h15A2.25 2.25 0 0 1 21.75 6v12A2.25 2.25 0 0 1 19.5 20.25h-15A2.25 2.25 0 0 1 2.25 18V6A2.25 2.25 0 0 1 4.5 3.75Z" />
                  </svg>
                  เริ่มคำนวณฟรี
                </Link>
                <Link href="/installers" className="btn btn-outline-white btn-lg">
                  ดูผู้ติดตั้ง →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          WHY US — feature cards
      ════════════════════════════════════════ */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">ทำไมต้องเลือกเรา</span>
            <h2 className="section-title">Solar Thani</h2>
            <p className="section-sub">
              เราคัดสรรและตรวจสอบผู้ติดตั้งอย่างเข้มงวด เพื่อให้คุณได้รับบริการที่ดีที่สุด
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '🔍',
                iconClass: 'icon-box-blue',
                title: 'รวบรวมผู้ติดตั้ง',
                desc: 'รวบรวมบริษัทและช่างติดตั้งโซลาร์เซลล์มากกว่า 150 รายทั่วประเทศ ผ่านการตรวจสอบประวัติและใบรับรอง',
                stat: '150+',
                statLabel: 'ผู้ติดตั้ง',
              },
              {
                icon: '⚖️',
                iconClass: 'icon-box-orange',
                title: 'เปรียบเทียบง่าย',
                desc: 'เปรียบเทียบราคา ประสบการณ์ รีวิวจริงจากลูกค้า และพื้นที่บริการได้ในที่เดียว',
                stat: '10K+',
                statLabel: 'รีวิวจริง',
              },
              {
                icon: '⚡',
                iconClass: 'icon-box-green',
                title: 'คำนวณทันที',
                desc: 'เครื่องมือคำนวณราคาและระยะเวลาคืนทุนที่แม่นยำ ช่วยวางแผนการลงทุนได้ถูกต้อง',
                stat: 'ฟรี',
                statLabel: 'ไม่มีค่าใช้จ่าย',
              },
            ].map((item) => (
              <div key={item.title} className="card p-7 group hover:border-[var(--color-primary)]/30">
                <div className={`icon-box ${item.iconClass} mb-5`}>{item.icon}</div>
                <h3 className="font-bold text-xl text-[var(--color-text)] mb-2.5 group-hover:text-[var(--color-primary)] transition-colors">
                  {item.title}
                </h3>
                <p className="text-[var(--color-muted)] text-sm leading-relaxed mb-5">{item.desc}</p>
                <div className="flex items-baseline gap-1.5 pt-4 border-t border-[var(--color-border)]">
                  <span className="text-2xl font-black text-[var(--color-primary)]">{item.stat}</span>
                  <span className="text-xs text-[var(--color-muted)]">{item.statLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURED BLOGS
      ════════════════════════════════════════ */}
      {featuredBlogs.length > 0 && (
        <section className="section bg-white" id="home-blogs">
          <div className="container">
            <div className="flex items-end justify-between mb-10">
              <div>
                <span className="section-eyebrow">ความรู้โซลาร์เซลล์</span>
                <h2 className="section-title mb-0">บทความแนะนำ</h2>
              </div>
              <Link
                href="/blog"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors"
              >
                อ่านทั้งหมด
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {featuredBlogs.map((blog) => (
                <Link key={blog.id} href={`/blog/${blog.slug}`} className="blog-card group">
                  <div className="blog-card-img">
                    {blog.cover_image ? (
                      <img src={blog.cover_image} alt={blog.title} />
                    ) : site['default_blog_image'] ? (
                      <img src={site['default_blog_image']} alt={blog.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#e8f4fd] to-[#d0e8fb]">
                        <span className="text-5xl opacity-20">☀️</span>
                      </div>
                    )}
                  </div>
                  <div className="blog-card-body">
                    <span className="badge badge-primary mb-3 w-fit">{blog.category}</span>
                    <h3 className="font-bold text-[var(--color-text)] text-sm leading-snug mb-2 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors flex-1">
                      {blog.title}
                    </h3>
                    {blog.excerpt && (
                      <p className="text-xs text-[var(--color-muted)] line-clamp-2 mb-3 leading-relaxed">{blog.excerpt}</p>
                    )}
                    <div className="text-xs text-[var(--color-muted)] flex items-center gap-1.5 mt-auto pt-3 border-t border-[var(--color-border)]">
                      <span>✍️</span>
                      <span>{blog.author}</span>
                      <span>·</span>
                      <span>{new Date(blog.published_at).toLocaleDateString('th-TH')}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-10 sm:hidden">
              <Link href="/blog" className="btn btn-primary">📰 อ่านบทความทั้งหมด</Link>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════
          CONTACT CTA — bottom
      ════════════════════════════════════════ */}
      <section className="section">
        <div className="container">
          <div className="relative rounded-3xl overflow-hidden bg-white border border-[var(--color-border)] p-10 md:p-16 text-center">
            {/* Top accent line */}
            <div
              aria-hidden
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: 'linear-gradient(90deg, var(--color-accent) 0%, var(--color-primary) 50%, var(--color-secondary) 100%)' }}
            />
            {/* Background decoration */}
            <div aria-hidden className="absolute right-8 top-1/2 -translate-y-1/2 text-[8rem] opacity-[0.04] select-none pointer-events-none">☀️</div>

            <div className="relative">
              <span className="section-eyebrow">ก้าวแรกของคุณ</span>
              <h2 className="section-title mt-1">พร้อมเริ่มต้นติดตั้งโซลาร์แล้วหรือยัง?</h2>
              <p className="text-[var(--color-muted)] mb-8 max-w-md mx-auto leading-relaxed">
                ติดต่อทีมงานเพื่อรับคำแนะนำฟรี หรือค้นหาผู้ติดตั้งในพื้นที่ของคุณได้เลยทันที
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/contact" className="btn btn-primary btn-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  ติดต่อเรา
                </Link>
                <Link href="/installers" className="btn btn-secondary btn-lg inline-flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  ค้นหาผู้ติดตั้ง
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
