import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'เกี่ยวกับเรา — Solar Thani',
  description: 'รู้จักกับ Solar Thani แพลตฟอร์มรวมผู้ติดตั้งโซลาร์เซลล์ที่ผ่านการตรวจสอบทั่วประเทศไทย',
};

export const revalidate = 300;

async function getPageData() {
  try {
    const rows = (await db.prepare("SELECT key, value FROM site_content WHERE key IN ('about_header_image','about_header_pos','about_header_size','about_story_image')").all()) as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      image:      map['about_header_image'] || null,
      pos:        map['about_header_pos']   || 'center',
      size:       map['about_header_size']  || 'cover',
      storyImage: map['about_story_image']  || null,
    };
  } catch { return { image: null, pos: 'center', size: 'cover', storyImage: null }; }
}

export default async function AboutPage() {
  const { image, pos, size, storyImage } = await getPageData();
  const header = { image, pos, size };
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
            <span className="text-white">เกี่ยวกับเรา</span>
          </nav>
          <p className="text-white/80 text-sm mt-1 mb-1">🌟 เกี่ยวกับ Solar Thani</p>
          <h1 className="text-3xl font-bold text-white mb-2">เกี่ยวกับเรา</h1>
          <p className="text-white/80">แพลตฟอร์มรวมผู้ติดตั้งโซลาร์เซลล์ที่เชื่อถือได้ทั่วประเทศไทย</p>
        </div>
      </div>

      <div className="section-sm">
        <div className="container mx-auto px-4 max-w-4xl space-y-16">

          {/* ── เรื่องราวของเรา ── */}
          <section className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="section-eyebrow">เรื่องราวของเรา</span>
              <h2 className="text-2xl font-black text-[var(--color-text)] mt-2 mb-4 leading-tight">
                จากปัญหาสู่แพลตฟอร์ม<br />เพื่อพลังงานสะอาด
              </h2>
              <p className="text-[var(--color-muted)] text-sm leading-relaxed mb-4">
                Solar Thani เกิดขึ้นจากความตั้งใจที่จะแก้ปัญหาของเจ้าของบ้านและธุรกิจที่ต้องการติดตั้งโซลาร์เซลล์
                แต่ไม่รู้ว่าจะเริ่มต้นจากไหน จะเชื่อผู้ติดตั้งรายไหน และราคาที่เหมาะสมคือเท่าไร
              </p>
              <p className="text-[var(--color-muted)] text-sm leading-relaxed">
                เราจึงสร้างแพลตฟอร์มที่รวบรวมผู้ติดตั้งโซลาร์เซลล์ที่ผ่านการตรวจสอบ
                พร้อมเครื่องมือเปรียบเทียบและคำนวณราคาที่โปร่งใส เพื่อให้ทุกคนเข้าถึงพลังงานสะอาดได้อย่างง่ายดาย
              </p>
            </div>
            <div className="rounded-3xl overflow-hidden aspect-square shadow-xl">
              {storyImage ? (
                <img src={storyImage} alt="เรื่องราวของเรา" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#0d2c8a] via-[#0262EC] to-[#0282FB] flex items-center justify-center">
                  <span className="text-[8rem] opacity-30 select-none">☀️</span>
                </div>
              )}
            </div>
          </section>

          {/* ── วัตถุประสงค์ ── */}
          <section>
            <div className="section-header text-left">
              <span className="section-eyebrow">วัตถุประสงค์</span>
              <h2 className="section-title text-left">ทำไมเราถึงทำสิ่งนี้?</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: '🔍',
                  iconClass: 'icon-box-blue',
                  title: 'ความโปร่งใส',
                  desc: 'แสดงข้อมูลผู้ติดตั้งอย่างครบถ้วน ทั้งประสบการณ์ ใบรับรอง รีวิวจริง และราคาโดยประมาณ ไม่มีข้อมูลซ่อนเร้น',
                },
                {
                  icon: '🤝',
                  iconClass: 'icon-box-orange',
                  title: 'ความน่าเชื่อถือ',
                  desc: 'ทุกผู้ติดตั้งในระบบผ่านการตรวจสอบประวัติและใบรับรอง ก่อนที่จะปรากฎในแพลตฟอร์มของเรา',
                },
                {
                  icon: '⚡',
                  iconClass: 'icon-box-green',
                  title: 'ความสะดวก',
                  desc: 'ค้นหา เปรียบเทียบ คำนวณ และติดต่อผู้ติดตั้งได้ในที่เดียว ประหยัดเวลาและลดความยุ่งยาก',
                },
              ].map((item) => (
                <div key={item.title} className="card p-7 group hover:border-[var(--color-primary)]/30">
                  <div className={`icon-box ${item.iconClass} mb-5`}>{item.icon}</div>
                  <h3 className="font-bold text-lg text-[var(--color-text)] mb-2.5 group-hover:text-[var(--color-primary)] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--color-muted)] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── วิสัยทัศน์ ── */}
          <section className="relative rounded-3xl overflow-hidden">
            <div
              className="p-10 md:p-14 text-center"
              style={{ background: 'linear-gradient(135deg, rgba(15,31,75,0.5) 0%, rgba(2,98,236,0.5) 100%)' }}
            >
              <span className="section-eyebrow text-blue-200">วิสัยทัศน์</span>
              <h2 className="text-2xl md:text-3xl font-black text-white mt-2 mb-4 leading-tight">
                ประเทศไทยที่ขับเคลื่อนด้วย<br />พลังงานสะอาด
              </h2>
              <p className="text-white/80 max-w-xl mx-auto text-sm leading-relaxed">
                เราเชื่อว่าพลังงานโซลาร์เซลล์ไม่ใช่แค่ตัวเลือก แต่คือทิศทางที่ถูกต้องสำหรับอนาคต
                Solar Thani มุ่งมั่นเป็นสะพานเชื่อมระหว่างผู้ต้องการพลังงานสะอาดกับผู้เชี่ยวชาญที่ไว้วางใจได้
                เพื่อให้ทุกครัวเรือนและธุรกิจในไทยสามารถเข้าถึงพลังงานแสงอาทิตย์ได้อย่างง่ายดายและปลอดภัย
              </p>
            </div>
          </section>

          {/* ── ตัวเลขที่ภาคภูมิใจ ── */}
          <section>
            <div className="section-header">
              <span className="section-eyebrow">ตัวเลขที่ภาคภูมิใจ</span>
              <h2 className="section-title">ผลลัพธ์ที่สร้างความแตกต่าง</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { num: '150+',    label: 'ผู้ติดตั้งที่ตรวจสอบแล้ว', icon: '🏢' },
                { num: '77',      label: 'จังหวัดทั่วประเทศ',         icon: '📍' },
                { num: '10,000+', label: 'โครงการที่สำเร็จแล้ว',      icon: '✅' },
                { num: '4.8 ★',   label: 'คะแนนเฉลี่ยจากรีวิวจริง',  icon: '⭐' },
              ].map((s) => (
                <div key={s.label} className="card p-6 text-center">
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className="text-3xl font-black text-[var(--color-primary)] leading-none">{s.num}</div>
                  <div className="text-xs text-[var(--color-muted)] mt-2 leading-snug">{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── ค่านิยม ── */}
          <section>
            <div className="section-header">
              <span className="section-eyebrow">ค่านิยมของเรา</span>
              <h2 className="section-title">หลักการที่ยึดมั่น</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {[
                {
                  icon: '🛡️',
                  title: 'ความปลอดภัยมาก่อน',
                  desc: 'ผู้ติดตั้งทุกรายต้องผ่านการตรวจสอบใบอนุญาต ประวัติงาน และมาตรฐานความปลอดภัยก่อนลงทะเบียน',
                },
                {
                  icon: '💬',
                  title: 'รีวิวที่เชื่อถือได้',
                  desc: 'รีวิวทุกชิ้นผ่านการยืนยันจากทีมงาน ป้องกันรีวิวปลอมเพื่อให้ข้อมูลที่แท้จริงแก่ผู้ใช้',
                },
                {
                  icon: '📊',
                  title: 'ข้อมูลที่ถูกต้อง',
                  desc: 'ราคาและข้อมูลทางเทคนิคอ้างอิงจากตลาดจริง อัปเดตสม่ำเสมอเพื่อให้การคำนวณแม่นยำที่สุด',
                },
                {
                  icon: '🌿',
                  title: 'รักษ์โลก',
                  desc: 'เราเชื่อในพลังของพลังงานหมุนเวียน ทุกการติดตั้งโซลาร์คือก้าวสำคัญสู่อนาคตที่ยั่งยืน',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-5 p-6 card group hover:border-[var(--color-primary)]/30">
                  <div className="text-3xl flex-shrink-0 mt-1">{item.icon}</div>
                  <div>
                    <h3 className="font-bold text-[var(--color-text)] mb-1.5 group-hover:text-[var(--color-primary)] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[var(--color-muted)] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="text-center pb-8">
            <div className="card p-10 md:p-14 relative overflow-hidden">
              <div
                aria-hidden
                className="absolute top-0 left-0 right-0 h-1"
                style={{ background: 'linear-gradient(90deg, var(--color-accent) 0%, var(--color-primary) 50%, var(--color-secondary) 100%)' }}
              />
              <div aria-hidden className="absolute right-8 top-1/2 -translate-y-1/2 text-[8rem] opacity-[0.04] select-none pointer-events-none">☀️</div>
              <div className="relative">
                <span className="section-eyebrow">ร่วมกับเรา</span>
                <h2 className="section-title mt-1">พร้อมเริ่มต้นแล้วหรือยัง?</h2>
                <p className="text-[var(--color-muted)] mb-8 max-w-md mx-auto text-sm leading-relaxed">
                  ค้นหาผู้ติดตั้งในพื้นที่ของคุณ หรือลงทะเบียนเป็นผู้ให้บริการในแพลตฟอร์มของเรา
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/installers" className="btn btn-primary btn-lg inline-flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    ค้นหาผู้ติดตั้ง
                  </Link>
                  <Link href="/register" className="btn btn-secondary btn-lg">
                    📋 ลงทะเบียนเป็นผู้ติดตั้ง
                  </Link>
                  <Link href="/contact" className="btn btn-ghost btn-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    ติดต่อเรา
                  </Link>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
