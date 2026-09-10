import type { Metadata } from 'next';
import Link from 'next/link';
import AffiliateSignupForm from './AffiliateSignupForm';

export const metadata: Metadata = {
  title: 'โปรแกรม Affiliate — แนะนำผู้ติดตั้งโซลาร์ รับค่าคอมมิชชัน',
  description:
    'เข้าร่วมโปรแกรม Affiliate ของ Solar Thani แชร์ลิงก์แนะนำผู้ติดตั้งโซลาร์เซลล์ที่ผ่านการตรวจสอบ รับค่าคอมมิชชันเมื่อลูกค้าปิดงานจริง',
};

const STEPS = [
  {
    n: 1,
    title: 'สมัครและยืนยันอีเมล',
    desc: 'สมัครฟรี กรอกข้อมูลพื้นฐาน แล้วยืนยันอีเมลเพื่อรับรหัสแนะนำ (referral code) ของคุณ',
  },
  {
    n: 2,
    title: 'รับลิงก์แนะนำ',
    desc: 'ใช้ลิงก์แบบทั่วไซต์ หรือลิงก์เฉพาะผู้ติดตั้งที่เข้าร่วมโปรแกรม จาก Dashboard ของคุณ',
  },
  {
    n: 3,
    title: 'แชร์ให้คนที่สนใจโซลาร์',
    desc: 'แชร์ผ่านโซเชียล บล็อก หรือชุมชนที่คุณดูแล เมื่อมีคนคลิกลิงก์ เราจะติดตามให้อัตโนมัติ 30 วัน',
  },
  {
    n: 4,
    title: 'รับค่าคอมมิชชัน',
    desc: 'เมื่อลูกค้าปิดงานและชำระเงินจริงกับผู้ติดตั้ง คุณจะได้รับค่าคอมมิชชันตามรอบการจ่ายเงินของงาน',
  },
];

const FAQS = [
  {
    q: 'ต้องเสียค่าใช้จ่ายในการเข้าร่วมหรือไม่?',
    a: 'ไม่มีค่าใช้จ่ายใดๆ ในการสมัครหรือเข้าร่วมโปรแกรม Affiliate',
  },
  {
    q: 'ค่าคอมมิชชันคำนวณอย่างไร?',
    a: 'ผู้ติดตั้งแต่ละรายกำหนดอัตราคอมมิชชันของตัวเอง (แบบเปอร์เซ็นต์หรือจำนวนคงที่) ค่าคอมมิชชันจะถูกคำนวณเมื่อมีการชำระเงินแต่ละงวดจริงของโครงการที่คุณแนะนำ ไม่ใช่ตอนที่ลูกค้าเพิ่งติดต่อเข้ามา',
  },
  {
    q: 'ลิงก์แนะนำมีอายุการติดตามนานแค่ไหน?',
    a: 'คุกกี้ติดตามการแนะนำมีอายุ 30 วันนับจากคลิกล่าสุด หากมีคนคลิกลิงก์ของคุณซ้ำ ระบบจะนับจากคลิกล่าสุดเสมอ',
  },
  {
    q: 'ได้รับเงินอย่างไร?',
    a: 'เมื่อยอดคอมมิชชันสะสมของคุณถึงเกณฑ์ขั้นต่ำ ทีมงานจะโอนเงินให้ตามบัญชีที่คุณตั้งค่าไว้ใน Dashboard เป็นรอบ (จ่ายด้วยมือในช่วงแรก ไม่ใช่ระบบอัตโนมัติ)',
  },
];

export default function AffiliatePage() {
  return (
    <>
      {/* Hero */}
      <div
        className="text-white py-20 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--color-bg-dark) 0%, var(--color-primary) 100%)' }}
      >
        <span
          aria-hidden
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[14rem] leading-none pointer-events-none select-none"
          style={{ opacity: 0.07 }}
        >
          🤝
        </span>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-2xl">
            <span className="badge badge-accent mb-4">โปรแกรม Affiliate</span>
            <h1 className="text-3xl md:text-4xl font-black leading-tight mb-4" style={{ color: '#fff' }}>
              แนะนำผู้ติดตั้งโซลาร์ที่คุณเชื่อถือ<br />รับค่าคอมมิชชันทุกงานที่ปิดจริง
            </h1>
            <p className="text-white/85 mb-8 leading-relaxed">
              เข้าร่วมโปรแกรม Affiliate ของ Solar Thani สมัครฟรี แชร์ลิงก์แนะนำ แล้วรับค่าคอมมิชชันเมื่อลูกค้าที่คุณแนะนำปิดงานและชำระเงินจริงกับผู้ติดตั้งในไดเรกทอรีของเรา
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#signup" className="btn btn-lg bg-white text-[var(--color-primary)] hover:bg-white/90">
                สมัครเข้าร่วมฟรี
              </a>
              <Link href="/affiliate/login" className="btn btn-lg btn-outline-white">
                เข้าสู่ระบบ Affiliate
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="section">
        <div className="container mx-auto px-4">
          <div className="section-header">
            <span className="section-eyebrow">ขั้นตอนง่ายๆ</span>
            <h2 className="section-title">เริ่มต้นได้ใน 4 ขั้นตอน</h2>
            <p className="section-sub">ไม่ต้องมีความรู้ด้านเทคนิค ไม่ต้องขายเอง แค่แนะนำต่อ</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="step-card">
                <span className="step-card-number">{s.n}</span>
                <div className="icon-box icon-box-blue mb-4" style={{ color: 'var(--color-primary)' }}>
                  {s.n}
                </div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Commission explainer */}
      <div className="section-sm" style={{ background: 'var(--color-surface-2)' }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="section-eyebrow">ค่าคอมมิชชันคำนวณอย่างไร</span>
              <h2 className="section-title">จ่ายจริงเมื่องานปิดจริง</h2>
              <p className="section-sub mb-5" style={{ maxWidth: 'none' }}>
                ค่าคอมมิชชันไม่ได้เกิดขึ้นตอนที่ลูกค้าเพิ่งติดต่อเข้ามา แต่จะคำนวณเมื่อมีการชำระเงินแต่ละงวดของโครงการจริง —
                ทำให้มั่นใจได้ว่าทุกยอดคอมมิชชันมาจากงานที่เกิดขึ้นจริง
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <span className="text-[var(--color-primary)] font-bold">✓</span>
                  <span>ผู้ติดตั้งแต่ละรายกำหนดอัตราคอมมิชชันเอง (เปอร์เซ็นต์หรือจำนวนคงที่)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[var(--color-primary)] font-bold">✓</span>
                  <span>ติดตามลิงก์แนะนำได้นาน 30 วันหลังคลิกล่าสุด</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[var(--color-primary)] font-bold">✓</span>
                  <span>ดูสถานะคอมมิชชันแบบเรียลไทม์ในแดชบอร์ดของคุณ</span>
                </li>
              </ul>
            </div>
            <div className="card-static p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] mb-4">
                ตัวอย่างการคำนวณ
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-muted)]">มูลค่างวดที่ปล่อยเงิน</span>
                  <span className="font-semibold">฿100,000</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-muted)]">อัตราคอมมิชชัน (ตัวอย่าง)</span>
                  <span className="font-semibold">5%</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="font-bold">ค่าคอมมิชชันที่คุณได้รับ</span>
                  <span className="font-black text-lg" style={{ color: 'var(--color-primary)' }}>฿5,000</span>
                </div>
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-3">
                ตัวเลขนี้เป็นเพียงตัวอย่าง อัตราคอมมิชชันจริงกำหนดโดยผู้ติดตั้งแต่ละราย
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="section-sm">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="section-header">
            <span className="section-eyebrow">คำถามที่พบบ่อย</span>
            <h2 className="section-title">FAQ</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="card p-4 group">
                <summary className="flex items-center justify-between cursor-pointer list-none font-semibold">
                  {f.q}
                  <span className="text-[var(--color-muted)] group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-[var(--color-muted)] mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Signup form */}
      <div id="signup" className="section-sm scroll-mt-20" style={{ background: 'var(--color-surface-2)' }}>
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-7">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-amber-400 flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg">
                🤝
              </div>
              <h2 className="text-2xl font-black text-[var(--color-text)]">สมัครเข้าร่วมโปรแกรม</h2>
              <p className="text-sm text-[var(--color-muted)] mt-1">ใช้เวลาไม่ถึง 2 นาที</p>
            </div>
            <AffiliateSignupForm />
          </div>
        </div>
      </div>
    </>
  );
}
