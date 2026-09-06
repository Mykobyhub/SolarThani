// Deterministic SEO copy generator for `/installers/province/[province]` landing pages.
//
// Goal: ~64 province pages (one per province with >=1 active installer) need genuinely different
// body copy to avoid Google flagging them as duplicate/thin content, but the copy for a given
// province must stay stable across requests/rebuilds (so the page doesn't look "different" to
// crawlers on every recrawl). We solve both with a deterministic hash of the province name picking
// one of several hand-written sentence variants per paragraph slot — same province always renders
// the same combination, different provinces usually don't.
import { REGION_LABEL, REGION_SOLAR_DATA, type Region } from './provinces';

export interface ProvinceStats {
  province: string;
  region: Region;
  count: number;
  avgRating: number;
  reviewCount: number;
  avgExperience: number;
  totalProjects: number;
  totalKw: number;
  verifiedCount: number;
}

// Simple deterministic string hash (djb2-ish) — stable across Node versions/platforms, unlike
// relying on object/array iteration order or Math.random().
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

function pick<T>(seed: string, variants: readonly T[]): T {
  return variants[hashString(seed) % variants.length];
}

const SOLAR_INTRO_VARIANTS: readonly ((s: ProvinceStats) => string)[] = [
  (s) => {
    const d = REGION_SOLAR_DATA[s.region];
    return `${s.province} ตั้งอยู่ใน${REGION_LABEL[s.region]}ของประเทศไทย ซึ่งเป็นพื้นที่ที่ได้รับปริมาณรังสีดวงอาทิตย์เฉลี่ยประมาณ ${d.avgIrradiance} kWh ต่อตารางเมตรต่อวัน และมีจำนวนวันที่ท้องฟ้าโปร่งเหมาะกับการผลิตไฟฟ้าจากแสงอาทิตย์มากถึง ${d.clearDays} วันต่อปี ทำให้การติดตั้งโซลาร์เซลล์ในพื้นที่นี้มีศักยภาพในการผลิตไฟฟ้าที่ค่อนข้างสูง โดยเฉพาะช่วง${d.bestMonths}ที่แดดจัดต่อเนื่อง`;
  },
  (s) => {
    const d = REGION_SOLAR_DATA[s.region];
    return `ด้วยทำเลที่ตั้งใน${REGION_LABEL[s.region]} ${s.province} มีความเข้มรังสีแสงอาทิตย์เฉลี่ยราว ${d.avgIrradiance} kWh ต่อตารางเมตรต่อวัน และมีชั่วโมงแดดจัดสูงสุดต่อวัน (peak sun hours) ประมาณ ${d.peakSunHours} ชั่วโมง ซึ่งถือว่าอยู่ในเกณฑ์ที่เหมาะสมสำหรับการติดตั้งระบบโซลาร์รูฟท็อปเพื่อลดค่าไฟฟ้าในระยะยาว โดยเฉพาะบ้านหรือธุรกิจที่ใช้ไฟฟ้าในช่วงกลางวันเป็นหลัก`;
  },
  (s) => {
    const d = REGION_SOLAR_DATA[s.region];
    return `ข้อมูลจากแผนที่ศักยภาพพลังงานแสงอาทิตย์ระบุว่า ${s.province} และพื้นที่โดยรอบใน${REGION_LABEL[s.region]}มีวันที่แดดจัดเหมาะกับการผลิตไฟฟ้าจากโซลาร์เซลล์ราว ${d.clearDays} วันต่อปี และมีความเข้มรังสีเฉลี่ยประมาณ ${d.avgIrradiance} kWh ต่อตารางเมตรต่อวัน ตัวเลขเหล่านี้สะท้อนว่าการลงทุนติดตั้งโซลาร์เซลล์ในพื้นที่นี้มีแนวโน้มคืนทุนได้ในระยะเวลาที่น่าพอใจ หากเลือกขนาดระบบให้เหมาะสมกับปริมาณการใช้ไฟฟ้า`;
  },
  (s) => {
    const d = REGION_SOLAR_DATA[s.region];
    return `${s.province} อยู่ใน${REGION_LABEL[s.region]} ซึ่งได้รับแสงอาทิตย์ค่อนข้างสม่ำเสมอตลอดปี โดยมีชั่วโมงแดดจัดเฉลี่ยประมาณ ${d.peakSunHours} ชั่วโมงต่อวัน และช่วงที่แดดแรงที่สุดมักอยู่ในช่วง${d.bestMonths} เจ้าของบ้านและธุรกิจในพื้นที่จึงมีโอกาสได้รับประโยชน์เต็มที่จากการติดตั้งแผงโซลาร์เซลล์ หากวางแนวและมุมเอียงของแผงให้เหมาะสมกับสภาพอากาศในพื้นที่`;
  },
];

const NETWORK_VARIANTS: readonly ((s: ProvinceStats) => string)[] = [
  (s) => `ปัจจุบันมีผู้ติดตั้งโซลาร์เซลล์ที่ให้บริการในพื้นที่${s.province}อยู่ในระบบของเราทั้งหมด ${s.count} ราย ครอบคลุมตั้งแต่ทีมงานขนาดเล็กไปจนถึงบริษัทที่มีประสบการณ์เฉลี่ย ${s.avgExperience} ปี โดยได้รับคะแนนรีวิวเฉลี่ย ${s.avgRating.toFixed(1)} ดาว จากรีวิวจริงกว่า ${s.reviewCount} รายการ และมีผู้ติดตั้งที่ผ่านการตรวจสอบยืนยันตัวตนแล้ว ${s.verifiedCount} ราย`,
  (s) => `ผู้ติดตั้งในพื้นที่${s.province}ที่เปิดให้บริการผ่านแพลตฟอร์มนี้มีทั้งหมด ${s.count} ราย ซึ่งรวมกันแล้วมีผลงานติดตั้งไปแล้วกว่า ${s.totalProjects} โครงการ คิดเป็นกำลังการผลิตติดตั้งสะสมมากกว่า ${s.totalKw} kW ทั่วพื้นที่ พร้อมคะแนนความพึงพอใจเฉลี่ยจากลูกค้าอยู่ที่ ${s.avgRating.toFixed(1)} ดาว`,
  (s) => `ในระบบของเรามีผู้ติดตั้งที่ให้บริการครอบคลุม${s.province} ${s.count} ราย โดย ${s.verifiedCount} รายได้ผ่านการตรวจสอบข้อมูลบริษัทและใบอนุญาตแล้ว ลูกค้าที่เคยใช้บริการให้คะแนนเฉลี่ย ${s.avgRating.toFixed(1)} ดาว จากรีวิวสะสม ${s.reviewCount} รายการ สะท้อนถึงคุณภาพงานติดตั้งที่ผ่านการพิสูจน์จริง`,
  (s) => `สำหรับผู้ที่กำลังมองหาผู้ติดตั้งใน${s.province} ขณะนี้มีผู้ให้บริการในระบบ ${s.count} ราย ซึ่งมีประสบการณ์เฉลี่ยรวมกันประมาณ ${s.avgExperience} ปี และเคยดำเนินโครงการติดตั้งไปแล้วรวมกว่า ${s.totalProjects} โครงการ ครอบคลุมกำลังผลิตสะสมกว่า ${s.totalKw} kW ทั่วพื้นที่บริการ`,
];

// Used instead of NETWORK_VARIANTS when count === 0 — deliberately avoids stating "0 ราย" outright.
const NETWORK_EMPTY_VARIANTS: readonly ((s: ProvinceStats) => string)[] = [
  (s) => `ขณะนี้เรากำลังขยายเครือข่ายผู้ติดตั้งโซลาร์เซลล์ให้ครอบคลุมพื้นที่${s.province}เพิ่มเติม แม้ยังไม่มีผู้ติดตั้งที่ลงทะเบียนให้บริการในจังหวัดนี้โดยตรง แต่ผู้ติดตั้งจากจังหวัดใกล้เคียงหลายรายก็รับงานครอบคลุมพื้นที่นี้เช่นกัน`,
  (s) => `${s.province}เป็นหนึ่งในพื้นที่ที่เรากำลังเปิดรับผู้ติดตั้งโซลาร์เซลล์เข้าร่วมระบบเพิ่มเติม เพื่อให้ลูกค้าในพื้นที่มีตัวเลือกที่หลากหลายมากขึ้น ระหว่างนี้แนะนำให้ลองติดต่อผู้ติดตั้งจากจังหวัดใกล้เคียงที่มักให้บริการครอบคลุมพื้นที่รอบนอกด้วยเช่นกัน`,
  (s) => `เรายังไม่มีผู้ติดตั้งที่ลงทะเบียนให้บริการใน${s.province}โดยตรงในขณะนี้ แต่ทีมงานกำลังทาบทามผู้ให้บริการคุณภาพในพื้นที่ให้เข้าร่วมแพลตฟอร์มเพิ่มเติม ระหว่างนี้ผู้ติดตั้งจากจังหวัดใกล้เคียงด้านล่างสามารถให้บริการครอบคลุมพื้นที่นี้ได้เช่นกัน`,
];

const ADVICE_VARIANTS: readonly ((s: ProvinceStats) => string)[] = [
  (s) => `ก่อนตัดสินใจเลือกผู้ติดตั้งโซลาร์เซลล์ใน${s.province} แนะนำให้เปรียบเทียบราคาและเงื่อนไขจากผู้ให้บริการอย่างน้อย 2-3 รายก่อนเซ็นสัญญา ตรวจสอบระยะเวลารับประกันแผงและอินเวอร์เตอร์ ประวัติผลงานที่ผ่านมา รวมถึงรีวิวจากลูกค้าจริง เพื่อให้มั่นใจว่าจะได้ระบบที่คุ้มค่ากับเงินลงทุนในระยะยาว`,
  (s) => `การเลือกผู้ติดตั้งที่เหมาะสมสำหรับบ้านหรือธุรกิจใน${s.province} ควรพิจารณาทั้งประสบการณ์ของทีมงาน การรับประกันหลังการติดตั้ง และบริการหลังการขาย นอกจากนี้ลองใช้เครื่องมือคำนวณระบบโซลาร์เพื่อประเมินขนาดระบบและระยะเวลาคืนทุนคร่าวๆ ก่อนติดต่อขอใบเสนอราคาจริงจากผู้ติดตั้งที่สนใจ`,
  (s) => `หากกำลังวางแผนติดตั้งโซลาร์เซลล์ใน${s.province} การอ่านรีวิวจากลูกค้าที่เคยใช้บริการจริงจะช่วยให้เห็นภาพคุณภาพงานติดตั้งและการบริการหลังการขายได้ชัดเจนขึ้น ควรสอบถามเรื่องใบรับรองมาตรฐาน การขออนุญาตเชื่อมต่อระบบไฟฟ้ากับการไฟฟ้าในพื้นที่ และระยะเวลารับประกันก่อนตัดสินใจเลือกผู้ติดตั้งรายใดรายหนึ่ง`,
  (s) => `ผู้ที่สนใจติดตั้งโซลาร์เซลล์ใน${s.province} ควรเริ่มจากการประเมินปริมาณการใช้ไฟฟ้าของตัวเองเพื่อกำหนดขนาดระบบที่เหมาะสม จากนั้นจึงเปรียบเทียบผู้ติดตั้งในด้านราคา ประสบการณ์ และการรับประกัน โดยไม่ควรตัดสินใจจากราคาที่ถูกที่สุดเพียงอย่างเดียว แต่ควรให้น้ำหนักกับคุณภาพงานและความน่าเชื่อถือของบริษัทด้วย`,
];

// 3 paragraphs for the `.province-intro` description column. Deterministic per province (stable
// across rebuilds/requests — each slot is salted differently so the 3 paragraphs for a given
// province don't always vary "in lockstep" with each other across the site).
export function getProvinceIntroParagraphs(stats: ProvinceStats): [string, string, string] {
  const solarParagraph = pick(stats.province, SOLAR_INTRO_VARIANTS)(stats);
  const networkParagraph = stats.count > 0
    ? pick(`${stats.province}:network`, NETWORK_VARIANTS)(stats)
    : pick(`${stats.province}:empty`, NETWORK_EMPTY_VARIANTS)(stats);
  const adviceParagraph = pick(`${stats.province}:advice`, ADVICE_VARIANTS)(stats);
  return [solarParagraph, networkParagraph, adviceParagraph];
}
