import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
  title: 'ติดต่อเรา — Solar Thani',
  description: 'ติดต่อทีมงาน Solar Thani สอบถามข้อมูล ขอใบเสนอราคา หรือแจ้งปัญหา',
};

export const revalidate = 300;

async function getHeaderData() {
  try {
    const rows = (await db.prepare("SELECT key, value FROM site_content WHERE key IN ('contact_header_image','contact_header_pos','contact_header_size')").all()) as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      image: map['contact_header_image'] || null,
      pos:   map['contact_header_pos']   || 'center',
      size:  map['contact_header_size']  || 'cover',
    };
  } catch { return { image: null, pos: 'center', size: 'cover' }; }
}

export default async function ContactPage() {
  const header = await getHeaderData();
  return (
    <>
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
            <span className="text-white">ติดต่อเรา</span>
          </nav>
          <h1 className="text-3xl font-bold text-white mt-2 mb-2">ติดต่อเรา</h1>
          <p className="text-white/80">มีคำถามหรือต้องการความช่วยเหลือ? ทีมงานยินดีช่วยเสมอ</p>
        </div>
      </div>
      <div className="section-sm">
        <div className="container mx-auto px-4">
          <Suspense fallback={<div className="text-center py-8">โหลด...</div>}>
            <ContactForm />
          </Suspense>
        </div>
      </div>
    </>
  );
}
