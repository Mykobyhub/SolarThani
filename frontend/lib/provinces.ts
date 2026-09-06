// Shared Thai-province utilities.
//
// THAI_PROVINCES / PROVINCE_ALIASES / extractProvincesFromLocation / normalizeProvinceName /
// getInstallerProvinces were originally defined inline in `app/installers/InstallersClient.tsx`
// (the `/installers?province=X` filter). Extracted here so the new `/installers/province/[province]`
// SEO landing pages (server-rendered, no client filter state) can reuse the exact same
// province-matching logic instead of re-implementing it — both call sites now import from here.
//
// PROVINCE_REGION / REGION_LABEL / REGION_SOLAR_DATA / POPULAR_PROVINCES are new, added for the
// province landing pages (dynamic SEO content + "จังหวัดใกล้เคียง" / "จังหวัดยอดนิยม" chips).

import type { Installer } from '@/types';

export const THAI_PROVINCES = [
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
] as const;

export type ThaiProvince = (typeof THAI_PROVINCES)[number];

export function isThaiProvince(value: string): value is ThaiProvince {
  return (THAI_PROVINCES as readonly string[]).includes(value);
}

export const PROVINCE_ALIASES: Record<string, string> = {
  'กทม': 'กรุงเทพมหานคร', 'กทม.': 'กรุงเทพมหานคร',
  'กรุงเทพ': 'กรุงเทพมหานคร', 'กรุงเทพฯ': 'กรุงเทพมหานคร',
  'หาดใหญ่': 'สงขลา', 'พัทยา': 'ชลบุรี',
};

export function extractProvincesFromLocation(location: string): string[] {
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
export function normalizeProvinceName(raw: string): string | null {
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
export function getInstallerProvinces(inst: Pick<Installer, 'service_provinces' | 'location'>): string[] {
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

// ─── Region grouping (for province landing pages) ────────────────────────────
// Common ("tourism board"-style) 6-region grouping — every one of the 77 THAI_PROVINCES appears
// exactly once. Used only for SEO copy variety (solar-radiation blurb + "จังหวัดใกล้เคียง" chips),
// not an official government classification.

export type Region = 'เหนือ' | 'กลาง' | 'อีสาน' | 'ตะวันออก' | 'ตะวันตก' | 'ใต้';

export const REGION_LABEL: Record<Region, string> = {
  เหนือ: 'ภาคเหนือ',
  กลาง: 'ภาคกลาง',
  อีสาน: 'ภาคตะวันออกเฉียงเหนือ (อีสาน)',
  ตะวันออก: 'ภาคตะวันออก',
  ตะวันตก: 'ภาคตะวันตก',
  ใต้: 'ภาคใต้',
};

const REGION_PROVINCES: Record<Region, string[]> = {
  เหนือ: ['เชียงใหม่', 'เชียงราย', 'แม่ฮ่องสอน', 'ลำปาง', 'ลำพูน', 'น่าน', 'พะเยา', 'แพร่', 'อุตรดิตถ์'],
  อีสาน: [
    'กาฬสินธุ์', 'ขอนแก่น', 'ชัยภูมิ', 'นครพนม', 'นครราชสีมา', 'บึงกาฬ', 'บุรีรัมย์', 'มหาสารคาม',
    'มุกดาหาร', 'ยโสธร', 'ร้อยเอ็ด', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู',
    'อำนาจเจริญ', 'อุดรธานี', 'อุบลราชธานี',
  ],
  ตะวันออก: ['ชลบุรี', 'ระยอง', 'จันทบุรี', 'ตราด', 'ฉะเชิงเทรา', 'ปราจีนบุรี', 'สระแก้ว'],
  ตะวันตก: ['กาญจนบุรี', 'ราชบุรี', 'เพชรบุรี', 'ประจวบคีรีขันธ์', 'ตาก'],
  ใต้: [
    'ชุมพร', 'ระนอง', 'สุราษฎร์ธานี', 'พังงา', 'ภูเก็ต', 'กระบี่', 'นครศรีธรรมราช', 'ตรัง',
    'พัทลุง', 'สตูล', 'สงขลา', 'ปัตตานี', 'ยะลา', 'นราธิวาส',
  ],
  กลาง: [
    'กรุงเทพมหานคร', 'กำแพงเพชร', 'ชัยนาท', 'นครนายก', 'นครปฐม', 'นครสวรรค์', 'นนทบุรี', 'ปทุมธานี',
    'พระนครศรีอยุธยา', 'พิจิตร', 'พิษณุโลก', 'เพชรบูรณ์', 'ลพบุรี', 'สมุทรปราการ', 'สมุทรสงคราม',
    'สมุทรสาคร', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สระบุรี', 'อ่างทอง', 'อุทัยธานี',
  ],
};

export const PROVINCE_REGION: Record<string, Region> = Object.fromEntries(
  (Object.entries(REGION_PROVINCES) as [Region, string[]][]).flatMap(([region, provinces]) =>
    provinces.map((p) => [p, region] as const)
  )
);

export function getNearbyProvinces(province: string, limit = 6): string[] {
  const region = PROVINCE_REGION[province];
  if (!region) return [];
  return REGION_PROVINCES[region].filter((p) => p !== province).slice(0, limit);
}

// Popular provinces — same set the homepage's "จังหวัดยอดนิยม" quick links point at
// (see app/page.tsx), spelled out in canonical THAI_PROVINCES form for direct routing here.
export const POPULAR_PROVINCES = ['กรุงเทพมหานคร', 'เชียงใหม่', 'ภูเก็ต', 'ชลบุรี', 'ขอนแก่น'] as const;

export function getPopularProvinces(excluding: string, limit = 5): string[] {
  return POPULAR_PROVINCES.filter((p) => p !== excluding).slice(0, limit);
}

// ─── Regional solar-radiation reference data (province landing pages) ────────
// Approximate averages per region, in the style of DEDE's (กรมพัฒนาพลังงานทดแทนและอนุรักษ์พลังงาน)
// solar radiation potential map — intentionally kept at region granularity (not per-province) since
// provinces within the same region genuinely share very similar irradiance figures at this resolution.
export interface RegionSolarInfo {
  avgIrradiance: number; // kWh/m²/day, average daily global solar radiation
  peakSunHours: number;  // effective peak-sun-hours/day used for rough yield estimates
  clearDays: number;     // approx. days/year with strong, mostly-unobstructed sun
  bestMonths: string;    // months with the strongest/most consistent sun in the region
}

export const REGION_SOLAR_DATA: Record<Region, RegionSolarInfo> = {
  เหนือ:     { avgIrradiance: 5.1, peakSunHours: 5.0, clearDays: 275, bestMonths: 'กุมภาพันธ์ถึงเมษายน' },
  กลาง:      { avgIrradiance: 5.4, peakSunHours: 5.3, clearDays: 280, bestMonths: 'มกราคมถึงเมษายน' },
  อีสาน:     { avgIrradiance: 5.5, peakSunHours: 5.5, clearDays: 285, bestMonths: 'มกราคมถึงพฤษภาคม' },
  ตะวันออก:  { avgIrradiance: 5.2, peakSunHours: 5.1, clearDays: 270, bestMonths: 'ธันวาคมถึงเมษายน' },
  ตะวันตก:   { avgIrradiance: 5.3, peakSunHours: 5.2, clearDays: 275, bestMonths: 'ธันวาคมถึงเมษายน' },
  ใต้:       { avgIrradiance: 4.9, peakSunHours: 4.7, clearDays: 230, bestMonths: 'กุมภาพันธ์ถึงเมษายน' },
};
