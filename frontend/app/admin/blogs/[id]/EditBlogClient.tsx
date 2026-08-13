'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ImageUrlOrFileField, ContentImageInserter } from '../../BlogFormFields';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function EditBlogClient({ blog }: { blog: any }) {
  const router = useRouter();
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [form, setForm] = useState({
    title: blog.title || '',
    slug: blog.slug || '',
    excerpt: blog.excerpt || '',
    content: blog.content || '',
    cover_image: blog.cover_image || '',
    author: blog.author || '',
    category: blog.category || '',
    tags: (() => {
      try { return (JSON.parse(blog.tags || '[]') as string[]).join(', '); } catch { return ''; }
    })(),
    status: blog.status || 'active',
    meta_title: blog.meta_title || '',
    meta_description: blog.meta_description || '',
    published_at: blog.published_at ? String(blog.published_at).slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  function showAlert(type: 'success' | 'error', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  }

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function insertImageIntoContent(url: string) {
    const tag = `\n<img src="${url}" alt="" class="w-full rounded-lg my-4" />\n`;
    const el = contentRef.current;
    const start = el?.selectionStart ?? form.content.length;
    const end = el?.selectionEnd ?? form.content.length;
    setForm((f) => ({ ...f, content: f.content.slice(0, start) + tag + f.content.slice(end) }));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + tag.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function handleSave() {
    if (!form.title || !form.slug || !form.content) {
      showAlert('error', 'กรุณากรอกหัวข้อ, slug และเนื้อหาให้ครบ');
      return;
    }
    setSaving(true);
    const tags = JSON.stringify(form.tags.split(',').map((t) => t.trim()).filter(Boolean));
    const res = await fetch(`/api/admin/blogs/${blog.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tags }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.success) {
      router.push('/admin?tab=blogs');
      router.refresh();
    } else {
      showAlert('error', d.message || 'บันทึกไม่สำเร็จ');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <nav className="text-sm text-[var(--color-muted)] mb-4">
          <Link href="/admin?tab=blogs" className="hover:text-[var(--color-primary)]">Admin</Link>
          <span className="mx-1">›</span>
          <Link href="/admin?tab=blogs" className="hover:text-[var(--color-primary)]">บทความ</Link>
          <span className="mx-1">›</span>
          <span>แก้ไข</span>
        </nav>

        {alert && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {alert.msg}
          </div>
        )}

        <div className="card-static w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-bold text-lg">✏️ แก้ไขบทความ</h1>
            <Link href="/admin?tab=blogs" className="btn btn-ghost btn-sm">✕ ปิด</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">หัวข้อ *</label>
              <input className="form-input" value={form.title} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Slug *</label>
              <input className="form-input" value={form.slug} onChange={(e) => set('slug', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">หมวดหมู่</label>
              <input className="form-input" value={form.category} onChange={(e) => set('category', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">ผู้เขียน</label>
              <input className="form-input" value={form.author} onChange={(e) => set('author', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">สถานะ</label>
              <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">เผยแพร่</option>
                <option value="draft">ร่าง</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">วันที่เผยแพร่</label>
              <input type="date" className="form-input" value={form.published_at} onChange={(e) => set('published_at', e.target.value)} />
            </div>
            <div className="form-group md:col-span-2">
              <label className="form-label">แท็ก (คั่นด้วยจุลภาค)</label>
              <input className="form-input" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="โซลาร์เซลล์, ประหยัดไฟ, ..." />
            </div>
            <div className="form-group md:col-span-2">
              <label className="form-label">คำโปรย (Excerpt)</label>
              <textarea className="form-input" rows={2} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} style={{ resize: 'vertical' }} />
            </div>

            <div className="form-group md:col-span-2">
              <ImageUrlOrFileField
                label="🖼️ รูป Thumbnail (รูปปก)"
                value={form.cover_image}
                onChange={(url) => set('cover_image', url)}
                hint="แสดงเป็นรูปปกในหน้ารายการบทความและตอนแชร์ลิงก์ — วาง URL หรืออัพโหลดไฟล์ก็ได้"
              />
            </div>

            <div className="form-group md:col-span-2">
              <label className="form-label">เนื้อหาบทความ (HTML) *</label>
              <ContentImageInserter onInsert={insertImageIntoContent} />
              <textarea
                ref={contentRef}
                className="form-input mt-2 font-mono text-xs"
                rows={16}
                value={form.content}
                onChange={(e) => set('content', e.target.value)}
                style={{ resize: 'vertical' }}
              />
              <p className="form-hint">รองรับ HTML — ใช้ช่องด้านบนเพื่อแทรกรูปประกอบบทความ (URL หรืออัพโหลดไฟล์) ที่ตำแหน่งเคอร์เซอร์</p>
            </div>

            <div className="form-group">
              <label className="form-label">Meta Title (SEO)</label>
              <input className="form-input" value={form.meta_title} onChange={(e) => set('meta_title', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Meta Description (SEO)</label>
              <input className="form-input" value={form.meta_description} onChange={(e) => set('meta_description', e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
            <Link href="/admin?tab=blogs" className="btn btn-ghost btn-sm">ยกเลิก</Link>
            <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleSave}>
              {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกบทความ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
