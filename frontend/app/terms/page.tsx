import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'เงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว',
  description: 'เงื่อนไขการใช้งาน นโยบายความเป็นส่วนตัว และนโยบาย PDPA ของเว็บไซต์ไดเรกทอรีผู้ติดตั้งโซลาร์เซลล์',
};

export interface SubSection { sub: string; body: string }
export interface Section    { id: string; title: string; content: SubSection[] }
export interface TermsData  { updatedDate: string; contactEmail: string; sections: Section[] }

export const TERMS_DEFAULTS: TermsData = {
  updatedDate: '1 กรกฎาคม 2568',
  contactEmail: 'support@solarthani.com',
  sections: [
    {
      id: 'terms',
      title: '1. เงื่อนไขการใช้งาน',
      content: [
        { sub: '1.1 การยอมรับเงื่อนไข', body: 'การใช้งานเว็บไซต์นี้หรือการลงทะเบียนเป็นผู้ให้บริการถือว่าคุณได้อ่าน เข้าใจ และยอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัวทั้งหมด หากคุณไม่ยอมรับเงื่อนไขเหล่านี้ กรุณาหยุดใช้งานเว็บไซต์' },
        { sub: '1.2 วัตถุประสงค์ของเว็บไซต์', body: 'เว็บไซต์นี้เป็นไดเรกทอรีรวบรวมรายชื่อผู้ติดตั้งโซลาร์เซลล์ที่ผ่านการตรวจสอบ เพื่อเชื่อมต่อผู้ที่สนใจติดตั้งโซลาร์เซลล์กับผู้ให้บริการที่น่าเชื่อถือ ข้อมูลบนเว็บไซต์มีไว้เพื่อการอ้างอิงเบื้องต้นเท่านั้น' },
        { sub: '1.3 การลงทะเบียนผู้ให้บริการ', body: 'ผู้ที่ลงทะเบียนเป็นผู้ติดตั้งรับรองว่าข้อมูลที่ให้ไว้ถูกต้องและเป็นความจริง มีใบอนุญาตหรือคุณสมบัติที่เกี่ยวข้องครบถ้วน และยินยอมให้ทางเว็บไซต์แสดงข้อมูลโปรไฟล์ต่อสาธารณะ ทางเว็บไซต์ขอสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีที่ฝ่าฝืนเงื่อนไข' },
        { sub: '1.4 ข้อจำกัดความรับผิดชอบ', body: 'ทางเว็บไซต์ทำหน้าที่เป็นตัวกลางในการให้ข้อมูลเท่านั้น และไม่รับผิดชอบต่อคุณภาพของงาน ราคา หรือการดำเนินการของผู้ให้บริการที่ลงทะเบียนไว้ ผู้ใช้ควรตรวจสอบและพิจารณาผู้ให้บริการด้วยตนเองก่อนตัดสินใจ' },
      ],
    },
    {
      id: 'privacy',
      title: '2. นโยบายความเป็นส่วนตัว',
      content: [
        { sub: '2.1 ข้อมูลที่เราเก็บรวบรวม', body: 'เราเก็บรวบรวมข้อมูลที่จำเป็นสำหรับการให้บริการ ได้แก่: ข้อมูลการลงทะเบียน (ชื่อบริษัท, อีเมล, เบอร์โทร), ข้อมูลโปรไฟล์ (สถานที่, คำอธิบายบริการ, ราคา), บันทึกการใช้งาน (IP address, ประเภทเบราว์เซอร์) และข้อมูลที่ผู้ใช้กรอกผ่านแบบฟอร์มติดต่อ' },
        { sub: '2.2 วัตถุประสงค์ในการใช้ข้อมูล', body: 'ข้อมูลที่เก็บรวบรวมถูกใช้เพื่อ: แสดงโปรไฟล์ผู้ให้บริการในไดเรกทอรี, ส่งการแจ้งเตือนที่เกี่ยวข้องกับบัญชีและบริการ, ติดต่อเพื่อยืนยันข้อมูลหรือแก้ไขปัญหา, วิเคราะห์และปรับปรุงบริการ และปฏิบัติตามข้อกำหนดทางกฎหมาย' },
        { sub: '2.3 การเปิดเผยข้อมูลแก่บุคคลที่สาม', body: 'เราไม่จำหน่าย แลกเปลี่ยน หรือเปิดเผยข้อมูลส่วนบุคคลของคุณแก่บุคคลภายนอกเพื่อวัตถุประสงค์ทางการค้า ยกเว้นกรณีที่ได้รับความยินยอมจากเจ้าของข้อมูล หรือเมื่อมีคำสั่งจากหน่วยงานที่มีอำนาจตามกฎหมาย' },
        { sub: '2.4 การรักษาความปลอดภัยข้อมูล', body: 'เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสม รวมถึงการเข้ารหัสรหัสผ่านและการจำกัดสิทธิ์การเข้าถึงข้อมูล อย่างไรก็ตาม ไม่มีระบบใดที่ปลอดภัยสมบูรณ์แบบ เราจึงขอให้คุณรักษาข้อมูลบัญชีของตนเองอย่างระมัดระวัง' },
      ],
    },
    {
      id: 'pdpa',
      title: '3. นโยบาย PDPA (พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล)',
      content: [
        { sub: '3.1 ฐานทางกฎหมายในการประมวลผลข้อมูล', body: 'เราประมวลผลข้อมูลส่วนบุคคลของคุณภายใต้ฐานทางกฎหมายดังต่อไปนี้: (1) ความยินยอม — เมื่อคุณยอมรับเงื่อนไขนี้และลงทะเบียน, (2) การปฏิบัติตามสัญญา — เพื่อให้บริการที่คุณร้องขอ, (3) ประโยชน์โดยชอบด้วยกฎหมาย — เพื่อความปลอดภัยและการปรับปรุงบริการ' },
        { sub: '3.2 สิทธิ์ของเจ้าของข้อมูลส่วนบุคคล', body: 'ภายใต้ PDPA คุณมีสิทธิ์ดังนี้: สิทธิ์รับทราบ — ได้รับแจ้งว่าข้อมูลถูกเก็บรวบรวมอย่างไร, สิทธิ์เข้าถึง — ขอดูข้อมูลส่วนบุคคลของตนเอง, สิทธิ์แก้ไข — ขอแก้ไขข้อมูลที่ไม่ถูกต้อง, สิทธิ์ลบ — ขอให้ลบข้อมูลเมื่อไม่จำเป็นอีกต่อไป, สิทธิ์คัดค้าน — คัดค้านการประมวลผลข้อมูลบางประเภท และสิทธิ์ถ่ายโอน — ขอรับข้อมูลในรูปแบบที่อ่านได้โดยเครื่อง' },
        { sub: '3.3 การให้ความยินยอมและการถอนความยินยอม', body: 'การลงทะเบียนและทำเครื่องหมายยอมรับเงื่อนไขถือเป็นการให้ความยินยอมอย่างชัดแจ้ง คุณสามารถถอนความยินยอมได้ทุกเมื่อโดยการติดต่อเราที่อีเมลด้านล่าง การถอนความยินยอมจะไม่กระทบต่อการประมวลผลที่เกิดขึ้นก่อนหน้า แต่อาจส่งผลให้ไม่สามารถใช้บริการบางส่วนได้' },
        { sub: '3.4 ระยะเวลาการเก็บรักษาข้อมูล', body: 'เราจะเก็บรักษาข้อมูลส่วนบุคคลตราบเท่าที่จำเป็นสำหรับการให้บริการ หรือตามที่กฎหมายกำหนด เมื่อบัญชีถูกยกเลิก ข้อมูลจะถูกลบหรือทำให้เป็นนิรนามภายใน 90 วัน เว้นแต่มีเหตุผลทางกฎหมายที่ต้องเก็บไว้นานกว่านั้น' },
      ],
    },
    {
      id: 'contact-consent',
      title: '4. การยินยอมให้ติดต่อ',
      content: [
        { sub: '4.1 การติดต่อเพื่อการบริการ', body: 'เมื่อคุณลงทะเบียนเป็นผู้ให้บริการ คุณยินยอมให้เราส่งอีเมลหรือข้อความที่เกี่ยวข้องกับบัญชีของคุณ เช่น การยืนยันการลงทะเบียน การแจ้งสถานะการอนุมัติ การแจ้งเตือน leads (ผู้สนใจติดต่อ) และการแจ้งเตือนรีวิวใหม่' },
        { sub: '4.2 การติดต่อเพื่อปรับปรุงข้อมูล', body: 'เราอาจติดต่อคุณเพื่อยืนยันหรืออัปเดตข้อมูลโปรไฟล์ แจ้งนโยบายที่เปลี่ยนแปลง หรือส่งข้อมูลที่เป็นประโยชน์เกี่ยวกับการพัฒนาเว็บไซต์ คุณสามารถยกเลิกการรับอีเมลประเภทนี้ได้ตลอดเวลาผ่านการตั้งค่าบัญชีหรือลิงก์ยกเลิกในอีเมล' },
        { sub: '4.3 ข้อมูลที่แสดงต่อสาธารณะ', body: 'ข้อมูลโปรไฟล์ที่คุณให้ไว้ (ชื่อบริษัท, พื้นที่ให้บริการ, เบอร์โทร, LINE URL และคำอธิบายบริการ) จะถูกแสดงต่อสาธารณะในไดเรกทอรี เพื่อให้ผู้สนใจสามารถติดต่อคุณได้โดยตรง' },
      ],
    },
    {
      id: 'cookies',
      title: '5. การใช้คุกกี้',
      content: [
        { sub: '', body: 'เว็บไซต์ใช้คุกกี้ที่จำเป็น (Essential Cookies) เพื่อรักษา session การเข้าสู่ระบบ และคุกกี้สำหรับการวิเคราะห์การใช้งาน (Analytics Cookies) เพื่อทำความเข้าใจพฤติกรรมผู้ใช้และปรับปรุงบริการ คุณสามารถปิดคุกกี้ในเบราว์เซอร์ได้ แต่อาจส่งผลต่อการทำงานบางส่วน' },
      ],
    },
    {
      id: 'changes',
      title: '6. การเปลี่ยนแปลงนโยบาย',
      content: [
        { sub: '', body: 'เราขอสงวนสิทธิ์ในการปรับปรุงเงื่อนไขและนโยบายนี้เป็นครั้งคราว การเปลี่ยนแปลงที่มีนัยสำคัญจะแจ้งให้ทราบผ่านทางอีเมลหรือประกาศบนเว็บไซต์ การใช้งานต่อเนื่องหลังจากมีการเปลี่ยนแปลงถือว่าคุณยอมรับเงื่อนไขใหม่' },
      ],
    },
    {
      id: 'contact-us',
      title: '7. ติดต่อเรา',
      content: [
        { sub: '', body: 'หากคุณมีคำถามเกี่ยวกับนโยบายนี้ หรือต้องการใช้สิทธิ์ตาม PDPA เช่น ขอดู แก้ไข หรือลบข้อมูลส่วนบุคคล กรุณาติดต่อเราผ่านช่องทางด้านล่าง เราจะตอบกลับคำขอภายใน 30 วันทำการนับจากวันที่ได้รับคำขอ' },
      ],
    },
  ],
};

async function getTermsData(): Promise<TermsData> {
  try {
    const row = (await db.prepare("SELECT value FROM site_content WHERE key='terms_content'").get()) as { value: string } | undefined;
    if (row?.value) return JSON.parse(row.value) as TermsData;
  } catch { /* fall through */ }
  return TERMS_DEFAULTS;
}

export default async function TermsPage() {
  const terms = await getTermsData();

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="container mx-auto px-4">
          <nav className="breadcrumb text-white/70">
            <Link href="/" className="hover:text-white">หน้าแรก</Link>
            <span>›</span>
            <span className="text-white">เงื่อนไขและนโยบาย</span>
          </nav>
          <h1 className="text-3xl font-bold text-white mb-2 mt-1">เงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว</h1>
          <p className="text-white/80 text-sm">มีผลบังคับใช้ตั้งแต่ 1 มิถุนายน 2568 · ปรับปรุงล่าสุด {terms.updatedDate}</p>
        </div>
      </div>

      <div className="section-sm">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">

            {/* Intro box */}
            <div
              className="rounded-xl p-5 mb-8 text-sm leading-relaxed"
              style={{ background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)' }}
            >
              <p className="font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>
                สรุปสำหรับผู้ลงทะเบียนผู้ติดตั้ง
              </p>
              <p style={{ color: 'var(--color-muted)' }}>
                เมื่อคุณลงทะเบียน คุณยินยอมให้เราเก็บข้อมูลที่จำเป็น แสดงโปรไฟล์ต่อสาธารณะ
                และติดต่อเพื่อแจ้งผู้สนใจ (leads) รวมถึงข้อมูลเกี่ยวกับบัญชีของคุณ
                เราไม่จำหน่ายข้อมูลให้บุคคลที่สาม และคุณสามารถขอลบข้อมูลได้ตลอดเวลา
              </p>
            </div>

            {/* Table of contents */}
            <nav className="mb-8 p-4 rounded-xl" style={{ background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>สารบัญ</p>
              <ol className="space-y-1">
                {terms.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-sm hover:underline" style={{ color: 'var(--color-primary)' }}>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* Sections */}
            <div className="space-y-10">
              {terms.sections.map((section) => (
                <section key={section.id} id={section.id}>
                  <h2 className="text-lg font-bold mb-4 pb-2" style={{ color: 'var(--color-text)', borderBottom: '2px solid var(--color-primary)' }}>
                    {section.title}
                  </h2>

                  {section.id === 'contact-us' ? (
                    <div className="space-y-4">
                      {section.content.map((item, i) => (
                        <div key={i}>
                          {item.sub && <h3 className="font-semibold mb-1.5 text-sm" style={{ color: 'var(--color-text)' }}>{item.sub}</h3>}
                          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-muted)' }}>{item.body}</p>
                        </div>
                      ))}
                      <div className="rounded-xl p-5 text-sm" style={{ background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)' }}>
                        <div className="space-y-2" style={{ color: 'var(--color-muted)' }}>
                          <p>
                            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>อีเมล: </span>
                            <a href={`mailto:${terms.contactEmail}`} className="hover:underline" style={{ color: 'var(--color-primary)' }}>
                              {terms.contactEmail}
                            </a>
                          </p>
                          <p>
                            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>แบบฟอร์มติดต่อ: </span>
                            <Link href="/contact" className="hover:underline" style={{ color: 'var(--color-primary)' }}>
                              หน้าติดต่อเรา
                            </Link>
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {section.content.map((item, i) => (
                        <div key={i}>
                          {item.sub && <h3 className="font-semibold mb-1.5 text-sm" style={{ color: 'var(--color-text)' }}>{item.sub}</h3>}
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>{item.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>

            {/* Back to register */}
            <div className="mt-10 pt-6 text-center" style={{ borderTop: '1px solid var(--color-border)' }}>
              <Link href="/register" className="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
                กลับไปลงทะเบียน
              </Link>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
