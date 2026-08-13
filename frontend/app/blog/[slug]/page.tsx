import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import type { Blog } from '@/types';

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const blog = (await db.prepare("SELECT title, excerpt, meta_title, meta_description, cover_image FROM blogs WHERE slug=? AND status='active'").get(slug)) as Blog | undefined;
    if (!blog) return {};
    const title = blog.meta_title || blog.title;
    const desc = blog.meta_description || blog.excerpt || undefined;
    return {
      title,
      description: desc,
      openGraph: {
        title,
        description: desc,
        images: blog.cover_image ? [{ url: blog.cover_image, alt: title }] : [],
        type: 'article',
      },
      twitter: {
        card: blog.cover_image ? 'summary_large_image' : 'summary',
        title,
        description: desc,
        images: blog.cover_image ? [blog.cover_image] : [],
      },
    };
  } catch { return {}; }
}

export async function generateStaticParams() {
  try {
    const rows = (await db.prepare("SELECT slug FROM blogs WHERE status='active'").all()) as { slug: string }[];
    return rows.map((r) => ({ slug: r.slug }));
  } catch { return []; }
}

export const revalidate = 3600;

async function getBlog(slug: string): Promise<Blog | null> {
  try {
    return (await db.prepare("SELECT * FROM blogs WHERE slug=? AND status='active'").get(slug)) as Blog | null;
  } catch { return null; }
}

async function getRelated(blog: Blog): Promise<Blog[]> {
  try {
    return (await db
      .prepare("SELECT * FROM blogs WHERE status='active' AND category=? AND id!=? ORDER BY published_at DESC LIMIT 3")
      .all(blog.category, blog.id)) as Blog[];
  } catch { return []; }
}

async function getDefaultBlogImage(): Promise<string | null> {
  try {
    const row = (await db.prepare("SELECT value FROM site_content WHERE key='default_blog_image'").get()) as { value: string } | undefined;
    return row?.value || null;
  } catch { return null; }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const blog = await getBlog(slug);
  if (!blog) notFound();

  const related = await getRelated(blog);
  const defaultBlogImage = await getDefaultBlogImage();
  const tags: string[] = blog.tags ? (() => { try { return JSON.parse(blog.tags!); } catch { return []; } })() : [];

  return (
    <>
      <div className="page-header">
        <div className="container mx-auto px-4">
          <nav className="breadcrumb text-white/70">
            <Link href="/" className="hover:text-white">หน้าแรก</Link>
            <span>›</span>
            <Link href="/blog" className="hover:text-white">บทความ</Link>
            <span>›</span>
            <span className="text-white line-clamp-1">{blog.title}</span>
          </nav>
          <span className="badge badge-warning mt-2 mb-3">{blog.category}</span>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{blog.title}</h1>
          <div className="flex items-center gap-3 text-white/70 text-sm">
            <span>✍️ {blog.author}</span>
            <span>·</span>
            <span>{new Date(blog.published_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Article */}
          <article className="flex-1 min-w-0">
            {/* Cover */}
            {blog.cover_image && (
              <div className="aspect-video rounded-2xl overflow-hidden mb-6">
                <img
                  src={blog.cover_image}
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Excerpt */}
            {blog.excerpt && (
              <blockquote className="border-l-4 border-[var(--color-primary)] pl-4 py-1 mb-6 text-[var(--color-muted)] italic">
                {blog.excerpt}
              </blockquote>
            )}

            {/* Content */}
            <div
              className="prose max-w-none text-sm leading-relaxed"
              style={{ color: 'var(--color-text)' }}
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8">
                {tags.map((t) => (
                  <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="badge badge-primary">
                    #{t}
                  </Link>
                ))}
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0 space-y-5">
            {/* CTA */}
            <div className="p-5 rounded-[var(--radius-xl)]" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }}>
              <h3 className="font-bold text-xl mb-1.5" style={{ color: '#ffffff' }}>หาผู้ติดตั้งมืออาชีพ</h3>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-1.5 text-white/90 text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  ผู้ติดตั้งที่ผ่านการตรวจสอบ
                </div>
                <div className="flex items-center gap-1.5 text-white/90 text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  ทั่วประเทศไทย
                </div>
              </div>
              <Link href="/installers" className="btn btn-outline-white btn-sm w-full justify-center">ค้นหาผู้ติดตั้ง</Link>
            </div>

            {/* Calculator */}
            <div className="card p-5">
              <h3 className="font-bold mb-2">🧮 คำนวณราคา</h3>
              <p className="text-xs text-[var(--color-muted)] mb-3">ประเมินค่าใช้จ่ายและระยะคืนทุน</p>
              <Link href="/calculator" className="btn btn-outline btn-sm w-full justify-center">คำนวณฟรี</Link>
            </div>

            {/* Related */}
            {related.length > 0 && (
              <div className="card p-5">
                <h3 className="font-bold mb-3">บทความที่เกี่ยวข้อง</h3>
                <div className="space-y-3">
                  {related.map((r) => (
                    <Link key={r.id} href={`/blog/${r.slug}`} className="flex gap-3 group">
                      <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-blue-50 flex-shrink-0">
                        {r.cover_image || defaultBlogImage ? (
                          <Image src={r.cover_image || defaultBlogImage!} alt={r.title} fill className="object-cover" sizes="64px" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">☀️</div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">{r.title}</p>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">{new Date(r.published_at).toLocaleDateString('th-TH')}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
