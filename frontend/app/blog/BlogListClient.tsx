'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Blog } from '@/types';

export default function BlogListClient({ blogs, defaultBlogImage }: { blogs: Blog[]; defaultBlogImage?: string | null }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');

  const categories = useMemo(() => [...new Set(blogs.map((b) => b.category).filter(Boolean))].sort(), [blogs]);
  const allTags = useMemo(() => {
    const set = new Set<string>();
    blogs.forEach((b) => { if (b.tags) { try { (JSON.parse(b.tags) as string[]).forEach((t) => set.add(t)); } catch {} } });
    return Array.from(set).sort();
  }, [blogs]);

  const filtered = useMemo(() => blogs.filter((b) => {
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !(b.excerpt || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (category && b.category !== category) return false;
    if (tag) { try { if (!(JSON.parse(b.tags || '[]') as string[]).includes(tag)) return false; } catch { return false; } }
    return true;
  }), [blogs, search, category, tag]);

  return (
    <div className="section-sm">
      <div className="container mx-auto px-4">
        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5 mb-8">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px] form-group">
              <label className="form-label text-xs">🔍 ค้นหาบทความ</label>
              <input
                type="text"
                className="form-input"
                placeholder="ชื่อบทความหรือเนื้อหา..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="min-w-[150px] form-group">
              <label className="form-label text-xs">📁 หมวดหมู่</label>
              <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">ทั้งหมด</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {allTags.length > 0 && (
              <div className="min-w-[130px] form-group">
                <label className="form-label text-xs">🏷️ แท็ก</label>
                <select className="form-input" value={tag} onChange={(e) => setTag(e.target.value)}>
                  <option value="">ทั้งหมด</option>
                  {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            <button
              onClick={() => { setSearch(''); setCategory(''); setTag(''); }}
              className="btn btn-ghost btn-sm self-end mb-[2px]"
            >
              ✕ ล้าง
            </button>
          </div>
          <div className="mt-3.5 text-sm text-[var(--color-muted)] border-t border-[var(--color-border)] pt-3">
            แสดง <strong className="text-[var(--color-text)]">{filtered.length}</strong> จาก {blogs.length} บทความ
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📰</div>
            <p className="text-[var(--color-muted)] text-sm">ไม่พบบทความที่ตรงกับการค้นหา</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((blog) => {
              const tags: string[] = blog.tags ? (() => { try { return JSON.parse(blog.tags!); } catch { return []; } })() : [];
              return (
                <Link key={blog.id} href={`/blog/${blog.slug}`} className="blog-card group">
                  <div className="blog-card-img">
                    {blog.cover_image ? (
                      <img src={blog.cover_image} alt={blog.title} className="w-full h-full object-cover" />
                    ) : defaultBlogImage ? (
                      <img src={defaultBlogImage} alt={blog.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#e8f4fd] to-[#d0e8fb]">
                        <span className="text-5xl opacity-20">☀️</span>
                      </div>
                    )}
                  </div>
                  <div className="blog-card-body">
                    <span className="badge badge-primary mb-3 w-fit">{blog.category}</span>
                    <h3 className="font-bold text-sm leading-snug mb-2 line-clamp-2 text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors flex-1">
                      {blog.title}
                    </h3>
                    {blog.excerpt && (
                      <p className="text-xs text-[var(--color-muted)] line-clamp-2 mb-3 leading-relaxed">{blog.excerpt}</p>
                    )}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {tags.slice(0, 3).map((t) => (
                          <span key={t} className="badge" style={{ background: 'var(--color-bg-alt)', color: 'var(--color-muted)', fontSize: '0.68rem' }}>#{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-[var(--color-muted)] flex items-center gap-2 mt-auto pt-3 border-t border-[var(--color-border)]">
                      <span>✍️ {blog.author}</span>
                      <span>·</span>
                      <span>{new Date(blog.published_at).toLocaleDateString('th-TH')}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
