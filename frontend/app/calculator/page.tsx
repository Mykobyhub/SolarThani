import type { Metadata } from 'next';
import Link from 'next/link';
import CalculatorWizard from '@/components/calculator/CalculatorWizard';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'คำนวณราคาติดตั้งโซลาร์เซลล์',
  description: 'คำนวณค่าใช้จ่ายในการติดตั้งโซลาร์เซลล์ ประหยัดต่อเดือน และระยะเวลาคืนทุน ฟรี ไม่มีค่าใช้จ่าย',
};

async function getPrices() {
  try {
    const rows = (await db
      .prepare("SELECT key, value FROM site_content WHERE key IN ('calc_price_ongrid','calc_price_hybrid','calc_bat5','calc_bat10','calc_bat15')")
      .all()) as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, parseFloat(r.value)]));
    const ongrid = map['calc_price_ongrid'] || 45000;
    const hybrid = map['calc_price_hybrid'] || 58000;
    return {
      ongridHardware:  Math.round(ongrid * 0.89),
      ongridLabor:     Math.round(ongrid * 0.11),
      hybridHardware:  Math.round(hybrid * 0.88),
      hybridLabor:     Math.round(hybrid * 0.12),
      battery5:        map['calc_bat5']  || 50000,
      battery10:       map['calc_bat10'] || 90000,
      battery15:       map['calc_bat15'] || 125000,
    };
  } catch {
    return {
      ongridHardware: 40000, ongridLabor: 5000,
      hybridHardware: 51000, hybridLabor: 7000,
      battery5: 50000, battery10: 90000, battery15: 125000,
    };
  }
}

async function getHeaderData() {
  try {
    const rows = (await db.prepare("SELECT key, value FROM site_content WHERE key IN ('calculator_header_image','calculator_header_pos','calculator_header_size')").all()) as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      image: map['calculator_header_image'] || null,
      pos:   map['calculator_header_pos']   || 'center',
      size:  map['calculator_header_size']  || 'cover',
    };
  } catch { return { image: null, pos: 'center', size: 'cover' }; }
}

export default async function CalculatorPage() {
  const prices = await getPrices();
  const header = await getHeaderData();

  return (
    <>
      {/* Page Header */}
      <div
        className="page-header"
        style={header.image ? {
          backgroundImage: `url(${header.image})`,
          backgroundSize: header.size,
          backgroundPosition: header.pos,
        } : undefined}
      >
        <div className="container mx-auto px-4">
          <nav className="breadcrumb text-white/70">
            <Link href="/" className="hover:text-white">หน้าแรก</Link>
            <span>›</span>
            <span className="text-white">คำนวณราคา</span>
          </nav>
          <p className="text-white/80 text-sm mt-1 mb-1">🧮 เครื่องมือฟรี</p>
          <h1 className="text-3xl font-bold text-white mb-2">คำนวณราคาติดตั้งโซลาร์เซลล์</h1>
          <p className="text-white/80">ประเมินค่าใช้จ่าย ประหยัดต่อเดือน และระยะเวลาคืนทุน</p>
        </div>
      </div>

      {/* Calculator */}
      <div className="section-sm">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <CalculatorWizard prices={prices} />
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="section-sm bg-white border-t border-[var(--color-border)]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-xl font-bold mb-3">พร้อมติดตั้งแล้วหรือยัง?</h2>
          <p className="text-[var(--color-muted)] text-sm mb-5">ค้นหาผู้ติดตั้งที่ผ่านการตรวจสอบในพื้นที่ของคุณ</p>
          <Link href="/installers" className="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            ดูรายชื่อผู้ติดตั้ง
          </Link>
        </div>
      </section>
    </>
  );
}
