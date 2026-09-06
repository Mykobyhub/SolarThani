'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Installer } from '@/types';


const THAI_PROVINCES = [
  'กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร',
  'ขอนแก่น','จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร',
  'เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก',
  'นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์',
  'นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์',
  'ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา',
  'พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต',
  'มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด',
  'ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','เลย',
  'ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร',
  'สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์',
  'หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ',
  'อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี',
];

const PROVINCE_ALIASES: Record<string, string> = {
  'กทม': 'กรุงเทพมหานคร', 'กทม.': 'กรุงเทพมหานคร',
  'กรุงเทพ': 'กรุงเทพมหานคร', 'กรุงเทพฯ': 'กรุงเทพมหานคร',
  'หาดใหญ่': 'สงขลา', 'พัทยา': 'ชลบุรี',
};

function extractProvincesFromLocation(location: string): string[] {
  const results = new Set<string>();
  location.split(',').forEach((chunk) => {
    const t = chunk.trim();
    if (!t) return;
    const jMatch = t.match(/จ[.]([ก-๙]+)/);
    if (jMatch) {
      const name = jMatch[1];
      const p = THAI_PROVINCES.find((pv) => pv === name || pv.startsWith(name) || name.startsWith(pv));
      if (p) { results.add(p); return; }
    }
    for (const [alias, province] of Object.entries(PROVINCE_ALIASES)) {
      if (t === alias || t.includes(alias)) results.add(province);
    }
    if (!/\d+\/|ถ\.|ซ\.|แขวง|เขต|ชั้น/.test(t)) {
      for (const p of THAI_PROVINCES) {
        if (t.includes(p)) results.add(p);
      }
    }
  });
  return Array.from(results);
}

// Resolve a free-typed province chunk (from service_provinces) to its canonical THAI_PROVINCES form.
// Returns null (discarded, not shown as a filter option) when the chunk isn't a recognizable province —
// real-world service_provinces text often carries extra notes like "ภูเก็ต และทั่วประเทศ" or "(ภาคใต้)".
function normalizeProvinceName(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (PROVINCE_ALIASES[t]) return PROVINCE_ALIASES[t];
  const exact = THAI_PROVINCES.find((p) => p === t);
  if (exact) return exact;
  return THAI_PROVINCES.find((p) => t.includes(p)) || null;
}

// service_provinces (curated via Dashboard/Admin) drives the filter when present. It's stored either as
// a JSON array (Dashboard/Admin-edit format) or plain comma-separated text (bulk-imported data) — both
// are normalized to the same comma-split parsing here. Falls back to regex-parsing the free-text
// `location` field for installers who don't have service_provinces set yet.
function getInstallerProvinces(inst: Installer): string[] {
  const raw = (inst.service_provinces || '').trim();
  if (raw) {
    let text = raw;
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) text = arr.join(', ');
    } catch { /* not JSON — treat raw value as plain comma-separated text */ }
    const normalized = text.split(',').map((s) => normalizeProvinceName(s)).filter((s): s is string => !!s);
    if (normalized.length > 0) return Array.from(new Set(normalized));
  }
  return extractProvincesFromLocation(inst.location || '');
}

function starsHtml(rating: number) {
  const pct = ((rating / 5) * 100).toFixed(1);
  return `<span class="stars-wrap"><span class="stars-base">★★★★★</span><span class="stars-fill" style="width:${pct}%">★★★★★</span></span>`;
}

export default function InstallersClient({ installers, defaultInstallerImage, defaultInstallerCardImage, initialSearch, initialProvince }: { installers: Installer[]; defaultInstallerImage?: string | null; defaultInstallerCardImage?: string | null; initialSearch?: string; initialProvince?: string }) {
  // Pre-filled from the page's `q` searchParam so the homepage search box (and the WebSite/SearchAction
  // JSON-LD target that points at /installers?q={search_term_string}) actually produces filtered results.
  const [search,    setSearch]    = useState(initialSearch?.trim() || '');
  // Pre-filled from the page's `province` searchParam (homepage "จังหวัดยอดนิยม" links, e.g.
  // /installers?province=เชียงใหม่). Normalized through the same helper used to build the `provinces`
  // dropdown options, so the seeded value always matches one of those <option> values exactly.
  const [province,  setProvince]  = useState(() => normalizeProvinceName(initialProvince || '') || '');
  const [minRating, setMinRating] = useState('');
  const [minExp,    setMinExp]    = useState('');
  const [sort,      setSort]      = useState('recommended');

  const provinceMap = useMemo(() => {
    const map = new Map<number, string[]>();
    installers.forEach((i) => map.set(i.id, getInstallerProvinces(i)));
    return map;
  }, [installers]);

  const provinces = useMemo(() => {
    const set = new Set<string>();
    provinceMap.forEach((ps) => ps.forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [provinceMap]);

  const filtered = useMemo(() => {
    let list = installers.filter((i) => {
      if (search) {
        const q = search.toLowerCase();
        const provincesText = (provinceMap.get(i.id) || []).join(' ').toLowerCase();
        if (!i.name.toLowerCase().includes(q) && !(i.location || '').toLowerCase().includes(q) && !provincesText.includes(q)) return false;
      }
      if (province && !provinceMap.get(i.id)?.includes(province)) return false;
      if (minRating && (i.rating || 0) < parseFloat(minRating)) return false;
      if (minExp && (i.experience || 0) < parseInt(minExp)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'recommended') return (b.rating || 0) * Math.log((b.reviews_count || 0) + 1) - (a.rating || 0) * Math.log((a.reviews_count || 0) + 1);
      if (sort === 'rating')      return (b.rating || 0) - (a.rating || 0);
      if (sort === 'experience')  return (b.experience || 0) - (a.experience || 0);
      if (sort === 'projects')    return (b.total_projects || 0) - (a.total_projects || 0);
      return 0;
    });
    return list;
  }, [installers, search, province, minRating, minExp, sort, provinceMap]);

  function clearFilters() {
    setSearch(''); setProvince(''); setMinRating(''); setMinExp(''); setSort('recommended');
  }

  return (
    <div className="section-sm">
      <div className="container">
        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5 mb-8">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px] form-group">
              <label className="form-label text-xs">🔍 ค้นหา</label>
              <input type="text" className="form-input" placeholder="ชื่อบริษัท หรือพื้นที่..."
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="min-w-[150px] form-group">
              <label className="form-label text-xs">📍 จังหวัด</label>
              <select className="form-input" value={province} onChange={(e) => setProvince(e.target.value)}>
                <option value="">ทั้งหมด</option>
                {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="min-w-[130px] form-group">
              <label className="form-label text-xs">⭐ Rating</label>
              <select className="form-input" value={minRating} onChange={(e) => setMinRating(e.target.value)}>
                <option value="">ทั้งหมด</option>
                <option value="4.5">4.5 ขึ้นไป</option>
                <option value="4.8">4.8 ขึ้นไป</option>
                <option value="5.0">5.0 เท่านั้น</option>
              </select>
            </div>
            <div className="min-w-[140px] form-group">
              <label className="form-label text-xs">🏆 ประสบการณ์</label>
              <select className="form-input" value={minExp} onChange={(e) => setMinExp(e.target.value)}>
                <option value="">ทั้งหมด</option>
                <option value="5">5 ปีขึ้นไป</option>
                <option value="8">8 ปีขึ้นไป</option>
                <option value="10">10 ปีขึ้นไป</option>
              </select>
            </div>
            <div className="min-w-[150px] form-group">
              <label className="form-label text-xs">↕️ เรียงโดย</label>
              <select className="form-input" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recommended">แนะนำ</option>
                <option value="rating">Rating สูงสุด</option>
                <option value="experience">ประสบการณ์มากสุด</option>
                <option value="projects">โครงการมากสุด</option>
              </select>
            </div>
            <button onClick={clearFilters} className="btn btn-ghost btn-sm self-end mb-[2px] text-[var(--color-muted)]">
              ✕ ล้าง
            </button>
          </div>
          <div className="mt-3.5 text-sm text-[var(--color-muted)] border-t border-[var(--color-border)] pt-3">
            แสดง <strong className="text-[var(--color-text)]">{filtered.length}</strong> จาก {installers.length} ราย
          </div>
        </div>

        {/* ── Grid ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="font-bold text-xl mb-2">ไม่พบผู้ติดตั้ง</h3>
            <p className="text-[var(--color-muted)] text-sm mb-6">ลองเปลี่ยนตัวกรองหรือล้างการค้นหา</p>
            <button onClick={clearFilters} className="btn btn-secondary">ล้างตัวกรองทั้งหมด</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((inst) => (
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
                  ) : inst.logo_url || defaultInstallerCardImage || defaultInstallerImage ? (
                    <Image
                      src={inst.logo_url || defaultInstallerCardImage || defaultInstallerImage!}
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
                  {/* top section — flex-col gap replaces per-element margins */}
                  <div className="flex-1 flex flex-col gap-2.5">
                    {inst.verified_at ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5 self-start">
                        ✓ ตรวจสอบแล้ว
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5 self-start">
                        ○ ยังไม่ตรวจสอบ
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

                  {/* divider + stats — LearnHub style */}
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
        )}
      </div>
    </div>
  );
}
