import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import type { Installer, Review, PortfolioPhoto } from '@/types';
import { SITE_URL, jsonLdHtml } from '@/lib/jsonld';
import ReviewSection from './ReviewSection';

// Same 4 Q&A shown in the "คำถามที่พบบ่อย" card below — kept as a single source of truth so the
// FAQPage JSON-LD always matches what's actually visible on the page (Google requires this).
const INSTALLER_FAQS = [
  { q: 'ใช้เวลาติดตั้งนานแค่ไหน?', a: '1–3 วันทำการสำหรับระบบทั่วไป ขึ้นอยู่กับขนาดและความซับซ้อน' },
  { q: 'ต้องเตรียมอะไรบ้างก่อนติดตั้ง?', a: 'หลังคาแข็งแรงเพียงพอ ทีมงานจะสำรวจฟรีก่อนเสมอ' },
  { q: 'หลังติดตั้งดูแลยากไหม?', a: 'ง่ายมาก เพียงทำความสะอาดแผงปีละ 1–2 ครั้ง' },
  { q: 'ค่าไฟจะลดได้มากแค่ไหน?', a: 'เฉลี่ย 60–80% บางรายลดได้มากกว่า 90%' },
] as const;

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const inst = (await db.prepare("SELECT name, location, about, logo_url FROM installers WHERE id=? AND status='active'").get(id)) as { name: string; location: string; about: string | null; logo_url: string | null } | undefined;
    if (!inst) return {};
    const desc = inst.about || `ข้อมูล รีวิว และบริการของ ${inst.name} พื้นที่ ${inst.location}`;
    return {
      title: `${inst.name} — รายละเอียดผู้ติดตั้ง`,
      description: desc,
      openGraph: {
        title: `${inst.name} — ผู้ติดตั้งโซลาร์เซลล์`,
        description: desc,
        images: inst.logo_url ? [{ url: inst.logo_url, alt: inst.name }] : [],
        type: 'profile',
      },
      twitter: {
        card: 'summary',
        title: `${inst.name} — Solar Thani`,
        description: desc,
        images: inst.logo_url ? [inst.logo_url] : [],
      },
    };
  } catch { return {}; }
}

export async function generateStaticParams() {
  try {
    const rows = (await db.prepare("SELECT id FROM installers WHERE status='active'").all()) as { id: number }[];
    return rows.map((r) => ({ id: String(r.id) }));
  } catch { return []; }
}

export const revalidate = 60;

async function getInstaller(id: string): Promise<Installer | null> {
  try {
    return (await db.prepare("SELECT * FROM installers WHERE id=? AND status='active'").get(id)) as Installer | null;
  } catch { return null; }
}

async function getReviews(installerId: number): Promise<Review[]> {
  try {
    return (await db
      .prepare("SELECT * FROM reviews WHERE installer_id=? AND status='active' ORDER BY created_at DESC LIMIT 20")
      .all(installerId)) as Review[];
  } catch { return []; }
}

async function getPortfolio(installerId: number): Promise<PortfolioPhoto[]> {
  try {
    return (await db.prepare('SELECT * FROM portfolio_photos WHERE installer_id=? ORDER BY created_at DESC LIMIT 12').all(installerId)) as PortfolioPhoto[];
  } catch { return []; }
}

// Computed fresh from `reviews` (not the installers.rating/reviews_count columns, which can be a
// stale/manually-set baseline) so the AggregateRating in JSON-LD always reflects real, verifiable
// approved reviews — never a number Google could flag as fake structured data.
async function getReviewStats(installerId: number): Promise<{ count: number; average: number }> {
  try {
    const row = (await db
      .prepare("SELECT COUNT(*)::int AS cnt, AVG(rating)::float8 AS avg FROM reviews WHERE installer_id=? AND status='active'")
      .get(installerId)) as { cnt: number; avg: number | null } | undefined;
    return { count: row?.cnt ?? 0, average: row?.avg ?? 0 };
  } catch { return { count: 0, average: 0 }; }
}

async function getDefaultImages(): Promise<{ logoDefault: string | null; bannerDefault: string | null }> {
  try {
    const rows = (await db.prepare("SELECT key, value FROM site_content WHERE key IN ('default_installer_image','default_installer_banner_image')").all()) as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      logoDefault:   map['default_installer_image']        || null,
      bannerDefault: map['default_installer_banner_image'] || null,
    };
  } catch { return { logoDefault: null, bannerDefault: null }; }
}

function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

// `services`/`certifications` are JSON arrays for the original demo rows, but most bulk-imported
// installers store this as plain comma/newline-separated text — parse both so the "บริการของเรา" /
// "ใบรับรองและมาตรฐาน" sections actually render instead of silently disappearing.
function parseListField(value: string | null): string[] {
  if (!value) return [];
  try {
    const arr = JSON.parse(value);
    if (Array.isArray(arr)) return arr.map((s) => String(s)).filter(Boolean);
  } catch { /* not JSON — treat as plain text */ }
  return value.split('\n').flatMap((line) => line.split(',')).map((s) => s.trim()).filter(Boolean);
}

function starsHtml(rating: number) {
  const pct = ((rating / 5) * 100).toFixed(1);
  return `<span class="stars-wrap"><span class="stars-base">★★★★★</span><span class="stars-fill" style="width:${pct}%">★★★★★</span></span>`;
}

export default async function InstallerDetailPage({ params }: Props) {
  const { id } = await params;
  const inst = await getInstaller(id);
  if (!inst) notFound();

  const reviews = await getReviews(inst.id);
  const portfolio = await getPortfolio(inst.id);
  const reviewStats = await getReviewStats(inst.id);

  const { logoDefault, bannerDefault } = await getDefaultImages();
  const services      = parseListField(inst.services);
  const certifications = parseListField(inst.certifications);
  const projects      = safeJson<{ name: string; savings: string }[]>(inst.projects, []);
  const areaServed    = parseListField(inst.service_provinces);

  const pageUrl = `${SITE_URL}/installers/${inst.id}`;

  const localBusinessLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': pageUrl,
    name: inst.name,
    url: pageUrl,
    image: inst.logo_url || inst.banner_image || logoDefault || undefined,
    description: inst.about || undefined,
    telephone: inst.phone || undefined,
    address: inst.location
      ? { '@type': 'PostalAddress', addressLocality: inst.location, addressCountry: 'TH' }
      : undefined,
    areaServed: areaServed.length > 0 ? areaServed : undefined,
  };
  if (reviewStats.count > 0) {
    localBusinessLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(reviewStats.average.toFixed(2)),
      reviewCount: reviewStats.count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (reviews.length > 0) {
    // reviewer_email is deliberately omitted — it's private contact info, not part of the public review.
    localBusinessLd.review = reviews.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.reviewer_name },
      datePublished: r.created_at,
      name: r.title || undefined,
      reviewBody: r.body,
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    }));
  }

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: INSTALLER_FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(localBusinessLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(faqLd) }} />

      {/* Hero Banner */}
      <div
        className="text-white py-8"
        style={inst.banner_image || bannerDefault ? {
          backgroundImage: `url(${inst.banner_image || bannerDefault})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : { background: 'linear-gradient(135deg, var(--color-bg-dark) 0%, var(--color-primary) 60%, var(--color-secondary) 100%)' }}
      >
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/70 mb-4">
            <Link href="/" className="hover:text-white">หน้าแรก</Link>
            <span>›</span>
            <Link href="/installers" className="hover:text-white">รายชื่อผู้ติดตั้ง</Link>
            <span>›</span>
            <span className="text-white">{inst.name}</span>
          </nav>

          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Logo */}
            <div className="relative w-20 h-20 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center overflow-hidden flex-shrink-0">
              {inst.logo_url || logoDefault ? (
                <Image
                  src={inst.logo_url || logoDefault!}
                  alt={inst.name}
                  fill
                  className={inst.logo_url ? 'object-contain p-1' : 'object-cover'}
                  sizes="80px"
                  unoptimized
                />
              ) : (
                <span className="text-3xl">🏢</span>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: '#ffffff' }}>{inst.name}</h1>
              {/* Trust badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {inst.verified_at ? (
                  <span className="tbadge green">✓ ตรวจสอบแล้ว</span>
                ) : (
                  <span className="tbadge gray">○ ยังไม่ตรวจสอบ</span>
                )}
                <span className="tbadge amber">⭐ {inst.experience}+ ปีประสบการณ์</span>
                <span className="tbadge blue">📜 ISO Certified</span>
                <span className="tbadge blue">🛡️ มีประกันงาน</span>
                {inst.founded_year && <span className="tbadge blue">ก่อตั้ง {inst.founded_year}</span>}
              </div>
              {/* Stars */}
              <div className="flex items-center gap-2 mb-4">
                <span dangerouslySetInnerHTML={{ __html: starsHtml(inst.rating || 0) }} className="text-xl" />
                <span className="font-bold text-lg">{inst.rating}</span>
                <span className="text-white/70 text-sm">({inst.reviews_count} รีวิว)</span>
              </div>
              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: '📂', val: inst.total_projects, lbl: 'โครงการ' },
                  { icon: '⚡', val: `${inst.total_kw}kW`, lbl: 'ติดตั้งสะสม' },
                  { icon: '🏆', val: `${inst.experience} ปี`, lbl: 'ประสบการณ์' },
                  { icon: '😊', val: `${inst.satisfaction_rate}%`, lbl: 'พึงพอใจ' },
                ].map((s) => (
                  <div key={s.lbl} className="bg-white/10 rounded-xl px-3 py-2 text-center">
                    <div className="text-lg font-bold text-white">{s.val}</div>
                    <div className="text-xs text-white/70">{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 space-y-6">

            {/* About */}
            {inst.about && (
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-3">🏢 เกี่ยวกับบริษัท</h2>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">{inst.about}</p>
              </div>
            )}

            {/* Services */}
            {services.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-3">🔧 บริการของเรา</h2>
                <ul className="space-y-2">
                  {services.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 font-bold mt-0.5">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Certifications */}
            {certifications.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-3">📜 ใบรับรองและมาตรฐาน</h2>
                <div className="flex flex-wrap gap-2">
                  {certifications.map((c, i) => (
                    <span key={i} className="badge badge-primary">🏆 {c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Warranty */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10B981" className="w-5 h-5">
                  <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Z" clipRule="evenodd" />
                </svg>
                การรับประกัน
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {inst.warranty_panel && (
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="flex justify-center mb-2">
                      <img src="/icons/warranty-panel.svg" alt="แผงโซลาร์" className="w-16 h-16"/>
                    </div>
                    <div className="font-bold text-[var(--color-primary)]">{inst.warranty_panel}</div>
                    <div className="text-xs text-[var(--color-muted)]">แผงโซลาร์</div>
                  </div>
                )}
                {inst.warranty_inverter && (
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="flex justify-center mb-2">
                      <img src="/icons/warranty-inverter.svg" alt="อินเวอร์เตอร์" className="w-16 h-16"/>
                    </div>
                    <div className="font-bold text-[var(--color-primary)]">{inst.warranty_inverter}</div>
                    <div className="text-xs text-[var(--color-muted)]">อินเวอร์เตอร์</div>
                  </div>
                )}
                {inst.warranty_workmanship && (
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="flex justify-center mb-2">
                      <img src="/icons/warranty-tools.svg" alt="งานติดตั้ง" className="w-16 h-16"/>
                    </div>
                    <div className="font-bold text-[var(--color-primary)]">{inst.warranty_workmanship}</div>
                    <div className="text-xs text-[var(--color-muted)]">งานติดตั้ง</div>
                  </div>
                )}
              </div>
            </div>

            {/* Projects */}
            {projects.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-3">📋 โครงการที่ผ่านมา</h2>
                <ul className="space-y-2">
                  {projects.map((p, i) => (
                    <li key={i} className="flex items-center justify-between text-sm py-2 border-b border-[var(--color-border)] last:border-0">
                      <span>📌 {p.name}</span>
                      <span className="badge badge-success">💰 {p.savings}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* YouTube */}
            {inst.youtube_url && (
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-3">▶ วิดีโอแนะนำ</h2>
                <div className="aspect-video rounded-xl overflow-hidden">
                  <iframe
                    src={inst.youtube_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Portfolio */}
            {portfolio.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-bold mb-3">🖼️ ผลงาน</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {portfolio.map((ph) => (
                    <div key={ph.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                      <img
                        src={ph.photo_url}
                        alt={ph.caption || 'ผลงาน'}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <ReviewSection installerId={inst.id} reviews={reviews} rating={inst.rating || 0} reviewCount={inst.reviews_count} />

            {/* FAQ */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">❓ คำถามที่พบบ่อย</h2>
              <div className="space-y-3">
                {INSTALLER_FAQS.map((faq) => (
                  <details key={faq.q} className="border border-[var(--color-border)] rounded-xl">
                    <summary className="px-4 py-3 font-medium text-sm cursor-pointer hover:bg-blue-50/50 rounded-xl">
                      {faq.q}
                    </summary>
                    <p className="px-4 pb-3 text-sm text-[var(--color-muted)]">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="card p-5 sticky top-20">
              <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5 text-[var(--color-primary)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.74v6.018Z" />
                </svg>
                ติดต่อ
              </h3>
              <div className="space-y-3 mb-5 text-sm">
                {inst.phone && (
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 flex-shrink-0 text-[var(--color-primary)]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                    <span>{inst.phone}</span>
                  </div>
                )}
                {inst.email && (
                  <div className="flex items-center gap-2 min-w-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 flex-shrink-0 text-[var(--color-primary)]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    <span className="truncate">{inst.email}</span>
                  </div>
                )}
                {inst.location && (
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 flex-shrink-0 text-[var(--color-primary)]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    <span>{inst.location}</span>
                  </div>
                )}
                {inst.response_time && (
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 flex-shrink-0 text-[var(--color-primary)]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                    </svg>
                    <span>ตอบกลับ {inst.response_time}</span>
                  </div>
                )}
                {inst.website_url && (
                  <a href={inst.website_url} target="_blank" rel="noopener" className="flex items-center gap-2 text-[var(--color-primary)] hover:underline">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    เว็บไซต์
                  </a>
                )}
                {inst.facebook_url && (
                  <a href={inst.facebook_url} target="_blank" rel="noopener" className="flex items-center gap-2 text-[var(--color-primary)] hover:underline">
                    <span>📘</span> Facebook
                  </a>
                )}
                {inst.tiktok_url && (
                  <a href={inst.tiktok_url} target="_blank" rel="noopener" className="flex items-center gap-2 text-[var(--color-primary)] hover:underline">
                    <span>🎵</span> TikTok
                  </a>
                )}
              </div>

              <div className="space-y-2">
                <Link href={`/contact?installer_id=${inst.id}`} className="btn btn-primary w-full justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  ขอใบเสนอราคาฟรี
                </Link>
                {inst.line_id && (
                  <a
                    href={`https://line.me/R/ti/p/${inst.line_id}`}
                    target="_blank"
                    rel="noopener"
                    className="btn w-full justify-center text-white"
                    style={{ background: '#06c755', borderColor: '#06c755' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                    </svg>
                    ติดต่อทาง LINE
                  </a>
                )}
                {inst.phone && (
                  <a href={`tel:${inst.phone.replace(/-/g, '')}`} className="btn btn-outline w-full justify-center">
                    📞 โทรหาเลย
                  </a>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Bottom CTA */}
      <section className="py-10 text-center text-white" style={{ background: 'linear-gradient(135deg, var(--color-bg-dark) 0%, var(--color-primary) 100%)' }}>
        <div className="container mx-auto px-4">
          <h2 className="text-xl font-bold mb-3" style={{ color: '#ffffff' }}>สนใจติดตั้งกับ {inst.name}?</h2>
          <p className="text-white text-sm mb-5">ขอใบเสนอราคาฟรี ไม่มีค่าใช้จ่าย</p>
          <Link href={`/contact?installer_id=${inst.id}`} className="btn btn-outline-white btn-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            ขอใบเสนอราคาทันที
          </Link>
        </div>
      </section>
    </>
  );
}
