import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import type { Blog, SiteContent } from '@/types';
import BlogListClient from './BlogListClient';

export const metadata: Metadata = {
  title: 'บทความโซลาร์เซลล์',
  description: 'ความรู้เรื่องโซลาร์เซลล์ เทคนิคการเลือก ข่าวสารวงการพลังงาน และเคล็ดลับประหยัดค่าไฟ',
};

export const revalidate = 300;

async function getBlogs(): Promise<Blog[]> {
  try {
    return (await db
      .prepare("SELECT * FROM blogs WHERE status='active' ORDER BY published_at DESC")
      .all()) as Blog[];
  } catch { return []; }
}

async function getSiteData() {
  try {
    const rows = (await db.prepare("SELECT key, value FROM site_content WHERE key IN ('default_blog_image','blog_header_image','blog_header_pos','blog_header_size')").all()) as SiteContent[];
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      defaultBlogImage: map['default_blog_image']  || null,
      headerImage:      map['blog_header_image']   || null,
      headerPos:        map['blog_header_pos']     || 'center',
      headerSize:       map['blog_header_size']    || 'cover',
    };
  } catch { return { defaultBlogImage: null, headerImage: null, headerPos: 'center', headerSize: 'cover' }; }
}

export default async function BlogPage() {
  const blogs = await getBlogs();
  const { defaultBlogImage, headerImage, headerPos, headerSize } = await getSiteData();
  return (
    <>
      <div
        className="page-header"
        style={headerImage ? {
          backgroundImage: `url(${headerImage})`,
          backgroundSize: headerSize,
          backgroundPosition: headerPos,
        } : undefined}
      >
        <div className="container mx-auto px-4">
          <nav className="breadcrumb text-white/70">
            <Link href="/" className="hover:text-white">หน้าแรก</Link>
            <span>›</span>
            <span className="text-white">บทความ</span>
          </nav>
          <p className="text-white/80 text-sm mt-1 mb-1">📰 บล็อก</p>
          <h1 className="text-3xl font-bold text-white mb-2">บทความโซลาร์เซลล์</h1>
          <p className="text-white/80">ความรู้ เทคนิค และข่าวสารวงการพลังงานโซลาร์</p>
        </div>
      </div>
      <BlogListClient blogs={blogs} defaultBlogImage={defaultBlogImage} />
    </>
  );
}
