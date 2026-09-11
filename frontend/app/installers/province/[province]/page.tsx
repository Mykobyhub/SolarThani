import { cache } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import type { Installer } from '@/types';
import { SITE_URL, jsonLdHtml } from '@/lib/jsonld';
import {
  THAI_PROVINCES,
  isThaiProvince,
  getInstallerProvinces,
  PROVINCE_REGION,
  REGION_LABEL,
  REGION_SOLAR_DATA,
  getNearbyProvinces,
  getPopularProvinces,
} from '@/lib/provinces';
import { getProvinceIntroParagraphs } from '@/lib/provinceContent';

// This is a static/SSG SEO landing page for a single province (e.g. "ผู้ติดตั้งโซล่าเซลล์เชียงใหม่"
// long-tail search intent) — distinct from the interactive `/installers?province=X` filter view.
// That existing filter route is left untouched; this route is additive.
export const revalidate = 3600;

// ─── Data fetching (memoized per-request with React.cache — generateMetadata, generateStaticParams,
// and the page component would otherwise each re-run the same query) ─────────────────────────────
const getActiveInstallers = cache(async (): Promise<Installer[]> => {
  try {
    return (await db.prepare("SELECT * FROM installers WHERE status='active'").all()) as Installer[];
  } catch { return []; }
});

const getSiteImages = cache(async () => {
  try {
    const rows = (await db
      .prepare("SELECT key, value FROM site_content WHERE key IN ('default_installer_image','default_installer_card_image')")
      .all()) as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      defaultInstallerImage: map['default_installer_image'] || null,
      defaultInstallerCardImage: map['default_installer_card_image'] || null,
    };
  } catch { return { defaultInstallerImage: null, defaultInstallerCardImage: null }; }
});

function computeProvinceData(province: string, installers: Installer[]) {
  const matched = installers.filter((i) => getInstallerProvinces(i).includes(province));
  const count = matched.length;
  const avgRating = count > 0 ? matched.reduce((sum, i) => sum + (i.rating || 0), 0) / count : 0;
  const reviewCount = matched.reduce((sum, i) => sum + (i.reviews_count || 0), 0);
  const avgExperience = count > 0 ? Math.round(matched.reduce((sum, i) => sum + (i.experience || 0), 0) / count) : 0;
  const totalProjects = matched.reduce((sum, i) => sum + (i.total_projects || 0), 0);
  const totalKw = matched.reduce((sum, i) => sum + (i.total_kw || 0), 0);
  const verifiedCount = matched.filter((i) => i.verified_at).length;
  // Same "recommended" ordering as the homepage's featured-installers query / InstallersClient's default sort.
  const sorted = [...matched].sort(
    (a, b) => (b.rating || 0) * Math.log((b.reviews_count || 0) + 1) - (a.rating || 0) * Math.log((a.reviews_count || 0) + 1)
  );
  return { installers: sorted, count, avgRating, reviewCount, avgExperience, totalProjects, totalKw, verifiedCount };
}

interface Props { params: Promise<{ province: string }> }

// Next's dynamic route params for this segment arrive still percent-encoded (observed on Next 16 /
// Turbopack — unlike some other Next versions/configs, `params.province` is NOT auto-decoded here),
// so every reader of `params.province` must decode it explicitly before comparing against
// THAI_PROVINCES. A malformed sequence (never expected from our own generated links, but a stray
// direct request could send one) falls back to the raw value, which simply fails isThaiProvince below.
function decodeProvinceParam(raw: string): string {
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export async function generateStaticParams() {
  try {
    const installers = await getActiveInstallers();
    const present = new Set<string>();
    installers.forEach((i) => getInstallerProvinces(i).forEach((p) => present.add(p)));
    // Only pre-render provinces with >=1 active installer at build time — provinces with 0 still
    // resolve on-demand (dynamicParams defaults to true) so a direct link never 404s, they're just
    // not pre-built or included in the sitemap (see app/sitemap.ts).
    return THAI_PROVINCES.filter((p) => present.has(p)).map((province) => ({ province }));
  } catch { return []; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const province = decodeProvinceParam((await params).province);
  if (!isThaiProvince(province)) return {};

  const installers = await getActiveInstallers();
  const data = computeProvinceData(province, installers);
  const url = `${SITE_URL}/installers/province/${encodeURIComponent(province)}`;
  const title = `ผู้ติดตั้งโซลาร์เซลล์${province} — เปรียบเทียบและติดต่อผู้เชี่ยวชาญในพื้นที่`;
  const description = data.count > 0
    ? `เปรียบเทียบผู้ติดตั้งโซลาร์เซลล์ใน${province}กว่า ${data.count} ราย คะแนนรีวิวเฉลี่ย ${data.avgRating.toFixed(1)} ดาว จากรีวิวจริง ${data.reviewCount} รายการ ค้นหาผู้เชี่ยวชาญที่ผ่านการตรวจสอบและขอใบเสนอราคาฟรี`
    : `ค้นหาผู้ติดตั้งโซลาร์เซลล์คุณภาพสำหรับพื้นที่${province} พร้อมข้อมูลศักยภาพพลังงานแสงอาทิตย์ในพื้นที่ และผู้ติดตั้งจากจังหวัดใกล้เคียงที่รับงานครอบคลุม${province}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

function starsHtml(rating: number) {
  const pct = ((rating / 5) * 100).toFixed(1);
  return `<span class="stars-wrap"><span class="stars-base">★★★★★</span><span class="stars-fill" style="width:${pct}%">★★★★★</span></span>`;
}

export default async function ProvincePage({ params }: Props) {
  const province = decodeProvinceParam((await params).province);
  if (!isThaiProvince(province)) notFound();

  const [installers, site] = await Promise.all([getActiveInstallers(), getSiteImages()]);
  const data = computeProvinceData(province, installers);
  const region = PROVINCE_REGION[province];
  const solar = REGION_SOLAR_DATA[region];
  const [introA, introB, introC] = getProvinceIntroParagraphs({
    province,
    region,
    count: data.count,
    avgRating: data.avgRating,
    reviewCount: data.reviewCount,
    avgExperience: data.avgExperience,
    totalProjects: data.totalProjects,
    totalKw: data.totalKw,
    verifiedCount: data.verifiedCount,
  });

  const nearby = getNearbyProvinces(province, 6);
  const popular = getPopularProvinces(province, 5);
  const pageUrl = `${SITE_URL}/installers/province/${encodeURIComponent(province)}`;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'ผู้ติดตั้งโซลาร์เซลล์', item: `${SITE_URL}/installers` },
      { '@type': 'ListItem', position: 3, name: province, item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbLd) }} />

      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="container">
          <nav className="breadcrumb text-white/70">
            <Link href="/" className="hover:text-white">หน้าแรก</Link>
            <span>›</span>
            <Link href="/installers" className="hover:text-white">ผู้ติดตั้งโซลาร์เซลล์</Link>
            <span>›</span>
            <span className="text-white">{province}</span>
          </nav>
          <p className="text-white/80 text-sm mt-1 mb-1">📍 ไดเรกทอรีจังหวัด</p>
          <h1 className="text-3xl font-bold text-white mb-2">ผู้ติดตั้งโซลาร์เซลล์{province}</h1>
          <p className="text-white/80 mb-5">
            {data.count > 0
              ? `เปรียบเทียบผู้ติดตั้งโซลาร์เซลล์ที่ผ่านการตรวจสอบใน${province} พร้อมรีวิวจริงจากลูกค้า`
              : `ค้นหาผู้ติดตั้งโซลาร์เซลล์สำหรับพื้นที่${province} หรือดูผู้ติดตั้งจากจังหวัดใกล้เคียงที่ให้บริการครอบคลุมพื้นที่นี้`}
          </p>
          <div className="flex flex-wrap gap-2">
            {data.count > 0 ? (
              <>
                <span className="tbadge blue">🏢 {data.count} ผู้ติดตั้ง</span>
                <span className="tbadge amber">⭐ {data.avgRating.toFixed(1)} คะแนนเฉลี่ย</span>
                <span className="tbadge green">✓ {data.verifiedCount} ตรวจสอบแล้ว</span>
                <span className="tbadge gray">📂 {data.totalProjects} โครงการ</span>
              </>
            ) : (
              <>
                <span className="tbadge blue">📍 {REGION_LABEL[region]}</span>
                <span className="tbadge amber">☀️ {solar.avgIrradiance} kWh/ตร.ม./วัน</span>
                <span className="tbadge green">🗓️ {solar.clearDays} วันแดดจัด/ปี</span>
                <span className="tbadge gray">🇹🇭 150+ ผู้ติดตั้งทั่วประเทศ</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Province intro: description + stat card ── */}
      <section className="section-sm" style={{ background: 'var(--color-bg-alt)' }}>
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-10 items-start">
            <div className="space-y-4 text-[var(--color-text-light)] leading-relaxed text-[0.9375rem]">
              <p>{introA}</p>
              <p>{introB}</p>
              <p>{introC}</p>
            </div>

            <div className="card-static p-6">
              {data.count > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <div className="stat-number text-[var(--color-primary)]">{data.count}</div>
                      <div className="stat-label">ผู้ติดตั้งในระบบ</div>
                    </div>
                    <div>
                      <div className="stat-number text-[var(--color-primary)]">{data.avgRating.toFixed(1)}</div>
                      <div className="stat-label">คะแนนเฉลี่ย</div>
                    </div>
                    <div>
                      <div className="stat-number text-[var(--color-primary)]">{data.totalProjects}</div>
                      <div className="stat-label">โครงการสำเร็จ</div>
                    </div>
                    <div>
                      <div className="stat-number text-[var(--color-primary)]">{data.verifiedCount}</div>
                      <div className="stat-label">ตรวจสอบแล้ว</div>
                    </div>
                  </div>
                  <div className="mt-5 pt-5 border-t border-[var(--color-border)] text-center">
                    <div className="stat-number text-[var(--color-primary)]">
                      {data.totalKw}<span className="text-lg font-bold ml-1">kW</span>
                    </div>
                    <div className="stat-label">กำลังผลิตติดตั้งสะสมทั้งหมด</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <div className="stat-number text-[var(--color-primary)]">{solar.avgIrradiance}</div>
                      <div className="stat-label">kWh/ตร.ม./วัน เฉลี่ย</div>
                    </div>
                    <div>
                      <div className="stat-number text-[var(--color-primary)]">{solar.peakSunHours}</div>
                      <div className="stat-label">ชม. แดดจัดสูงสุด/วัน</div>
                    </div>
                  </div>
                  <div className="mt-5 pt-5 border-t border-[var(--color-border)] text-center">
                    <div className="stat-number text-[var(--color-primary)]">{solar.clearDays}</div>
                    <div className="stat-label">วันแดดจัดต่อปีโดยประมาณ</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Installer grid (or empty state) ── */}
      <section className="section-sm">
        <div className="container">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
            <div>
              <span className="section-eyebrow">ผู้ติดตั้งในพื้นที่</span>
              <h2 className="section-title mb-0">
                {data.count > 0 ? `รายชื่อผู้ติดตั้งใน${province}` : `กำลังมองหาผู้ติดตั้งใน${province}`}
              </h2>
            </div>
            <Link
              href={`/installers?province=${encodeURIComponent(province)}`}
              className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors inline-flex items-center gap-1.5"
            >
              ดูตัวกรองเพิ่มเติม
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {data.count > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.installers.map((inst) => (
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
                      ) : inst.logo_url || site.defaultInstallerCardImage || site.defaultInstallerImage ? (
                        <Image
                          src={inst.logo_url || site.defaultInstallerCardImage || site.defaultInstallerImage!}
                          alt={inst.name} fill sizes="300px" unoptimized
                          className={inst.logo_url ? 'object-contain p-8' : 'object-cover'}
                          style={inst.logo_url ? undefined : { filter: 'grayscale(10%)', opacity: 0.5 }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
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
                        <div className="flex items-center gap-1.5">
                          <span dangerouslySetInnerHTML={{ __html: starsHtml(inst.rating || 0) }} />
                          <span className="text-xs font-bold text-[var(--color-text)]">{inst.rating}</span>
                          <span className="text-[10px] text-[var(--color-muted)]">({inst.reviews_count} รีวิว)</span>
                        </div>
                      </div>

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
                            <div className="text-[11px] text-[var(--color-muted)] mt-1">ติดตั้ง</div>
                          </div>
                          <div className="w-px h-8 bg-[var(--color-border)]" />
                          <div className="text-center">
                            <div className="text-base font-black text-[var(--color-primary)] leading-none">{inst.satisfaction_rate}<span className="text-[11px] font-normal">%</span></div>
                            <div className="text-[11px] text-[var(--color-muted)] mt-1">พึงพอใจ</div>
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
              <div className="text-center mt-10">
                <Link href="/installers" className="btn btn-secondary btn-lg">ดูผู้ติดตั้งทั้งหมดทั่วประเทศ →</Link>
              </div>
            </>
          ) : (
            <div className="border-2 border-dashed border-[var(--color-border-dark)] rounded-2xl py-16 px-6 text-center">
              <div className="text-5xl mb-4">📍</div>
              <h3 className="font-bold text-xl mb-2">ยังไม่มีผู้ติดตั้งใน{province}</h3>
              <p className="text-[var(--color-muted)] text-sm mb-6 max-w-md mx-auto leading-relaxed">
                ลองดูผู้ติดตั้งจากจังหวัดใกล้เคียงที่มักรับงานครอบคลุมพื้นที่นี้ หรือค้นหาผู้ติดตั้งทั่วประเทศ
              </p>
              {nearby.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-7">
                  {nearby.slice(0, 2).map((p) => (
                    <Link key={p} href={`/installers/province/${encodeURIComponent(p)}`} className="province-chip">
                      {p}
                    </Link>
                  ))}
                </div>
              )}
              <Link href="/installers" className="btn btn-primary">ดูทั่วประเทศ</Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Nearby provinces ── */}
      <section className="section-sm" style={{ background: 'var(--color-bg-alt)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">พื้นที่ใกล้เคียง</span>
            <h2 className="section-title">จังหวัดใกล้เคียงและยอดนิยม</h2>
            <p className="section-sub">สำรวจผู้ติดตั้งโซลาร์เซลล์ในจังหวัดอื่นๆ ทั่วประเทศ</p>
          </div>

          {nearby.length > 0 && (
            <div className="mb-7">
              <p className="text-xs text-[var(--color-muted)] mb-2.5 text-center">จังหวัดใน{REGION_LABEL[region]}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {nearby.map((p) => (
                  <Link key={p} href={`/installers/province/${encodeURIComponent(p)}`} className="province-chip">
                    {p}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {popular.length > 0 && (
            <div>
              <p className="text-xs text-[var(--color-muted)] mb-2.5 text-center">จังหวัดยอดนิยม</p>
              <div className="flex flex-wrap justify-center gap-2">
                {popular.map((p) => (
                  <Link key={p} href={`/installers/province/${encodeURIComponent(p)}`} className="province-chip">
                    {p}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="section-sm bg-white">
        <div className="container">
          <div className="cta-banner">
            <div className="cta-banner-ring" style={{ width: 300, height: 300, right: 80, top: '50%', transform: 'translateY(-50%)' }} />
            <div className="cta-banner-ring" style={{ width: 420, height: 420, right: 20, top: '50%', transform: 'translateY(-50%)' }} />

            <div className="relative max-w-lg">
              <span className="section-eyebrow" style={{ color: '#bfdbfe' }}>เริ่มต้นวันนี้</span>
              <h2 className="text-2xl md:text-3xl font-black mt-1 mb-3 leading-tight" style={{ color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.45)' }}>
                พร้อมติดตั้งโซลาร์เซลล์ใน{province}แล้วหรือยัง?
              </h2>
              <p className="text-white/85 mb-7 text-[0.9375rem] leading-relaxed">
                เปรียบเทียบผู้ติดตั้งที่ผ่านการตรวจสอบ อ่านรีวิวจริง และขอใบเสนอราคาฟรี ไม่มีค่าใช้จ่ายใดๆ
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={`/installers?province=${encodeURIComponent(province)}`} className="btn btn-primary btn-lg inline-flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  ค้นหาผู้ติดตั้งใน{province}
                </Link>
                <Link href="/calculator" className="btn btn-outline-white btn-lg">
                  คำนวณราคาก่อน →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
