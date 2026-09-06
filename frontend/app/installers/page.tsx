import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import type { Installer } from '@/types';
import InstallersClient from './InstallersClient';

export const metadata: Metadata = {
  title: 'รายชื่อผู้ติดตั้งโซลาร์เซลล์',
  description: 'ค้นหาและเปรียบเทียบผู้ติดตั้งโซลาร์เซลล์กว่า 150 รายทั่วประเทศ กรองตามจังหวัด คะแนน และประสบการณ์',
};

// No `revalidate` here (ISR) — this page now reads the `q` and `province` searchParams (to serve
// the homepage search box / WebSite SearchAction target `/installers?q=...`, and the homepage
// "จังหวัดยอดนิยม" links `/installers?province=...`), which opts it into per-request dynamic
// rendering. See https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional

async function getInstallers(): Promise<Installer[]> {
  try {
    return (await db
      .prepare("SELECT * FROM installers WHERE status='active' ORDER BY (rating * 1.0) DESC")
      .all()) as Installer[];
  } catch { return []; }
}

async function getSiteData() {
  try {
    const rows = (await db.prepare("SELECT key, value FROM site_content WHERE key IN ('installers_header_image','installers_header_pos','installers_header_size','default_installer_image','default_installer_card_image')").all()) as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      headerImage: map['installers_header_image'] || null,
      headerPos:   map['installers_header_pos']   || 'center',
      headerSize:  map['installers_header_size']  || 'cover',
      defaultInstallerImage:     map['default_installer_image']      || null,
      defaultInstallerCardImage: map['default_installer_card_image'] || null,
    };
  } catch { return { headerImage: null, headerPos: 'center', headerSize: 'cover', defaultInstallerImage: null, defaultInstallerCardImage: null }; }
}

interface Props { searchParams: Promise<{ q?: string; province?: string }> }

export default async function InstallersPage({ searchParams }: Props) {
  const { q, province } = await searchParams;
  const installers = await getInstallers();
  const site = await getSiteData();

  return (
    <>
      {/* Page Header */}
      <div
        className="page-header"
        style={site.headerImage ? {
          backgroundImage: `url(${site.headerImage})`,
          backgroundSize: site.headerSize,
          backgroundPosition: site.headerPos,
        } : undefined}
      >
        <div className="container mx-auto px-4">
          <nav className="breadcrumb text-white/70">
            <Link href="/" className="hover:text-white">หน้าแรก</Link>
            <span>›</span>
            <span className="text-white">รายชื่อผู้ติดตั้ง</span>
          </nav>
          <p className="text-white/80 text-sm mt-1 mb-1">🏢 ไดเรกทอรี</p>
          <h1 className="text-3xl font-bold text-white mb-2">รายชื่อผู้ติดตั้งโซลาร์เซลล์</h1>
          <p className="text-white/80">ค้นหาและเปรียบเทียบผู้ติดตั้งที่ผ่านการตรวจสอบทั่วประเทศไทย</p>
        </div>
      </div>

      <InstallersClient installers={installers} defaultInstallerImage={site.defaultInstallerImage} defaultInstallerCardImage={site.defaultInstallerCardImage} initialSearch={q} initialProvince={province} />
    </>
  );
}
