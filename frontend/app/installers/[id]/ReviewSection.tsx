'use client';

import { useState, useRef } from 'react';
import type { Review } from '@/types';

function starsHtml(rating: number) {
  const pct = ((rating / 5) * 100).toFixed(1);
  return `<span class="stars-wrap"><span class="stars-base">★★★★★</span><span class="stars-fill" style="width:${pct}%">★★★★★</span></span>`;
}

function SliderCaptcha({ onSuccess }: { onSuccess: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const startX = useRef(0);

  function getTrackWidth() {
    return (trackRef.current?.offsetWidth ?? 300) - 44;
  }

  function onMouseDown(e: React.MouseEvent) {
    if (done) return;
    setDragging(true);
    startX.current = e.clientX - pos;
    e.preventDefault();
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || done) return;
    const newPos = Math.max(0, Math.min(e.clientX - startX.current, getTrackWidth()));
    setPos(newPos);
    if (newPos >= getTrackWidth() - 4) confirm();
  }

  function onMouseUp() { if (!done) { if (pos < getTrackWidth() - 4) setPos(0); setDragging(false); } }

  function onTouchStart(e: React.TouchEvent) {
    if (done) return;
    setDragging(true);
    startX.current = e.touches[0].clientX - pos;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging || done) return;
    const newPos = Math.max(0, Math.min(e.touches[0].clientX - startX.current, getTrackWidth()));
    setPos(newPos);
    if (newPos >= getTrackWidth() - 4) confirm();
  }

  function confirm() {
    setDone(true);
    setDragging(false);
    setPos(getTrackWidth());
    setTimeout(onSuccess, 600);
  }

  return (
    <div className="py-2">
      <p className="text-sm text-center mb-3 text-[var(--color-muted)]">
        🔒 เลื่อนแถบไปทางขวาสุดเพื่อยืนยัน
      </p>
      <div
        ref={trackRef}
        className="relative h-11 rounded-full select-none"
        style={{
          background: done ? '#d1fae5' : '#e5ecf6',
          border: `2px solid ${done ? '#10b981' : 'var(--color-border)'}`,
        }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onMouseUp}
      >
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-colors"
          style={{ width: `${pos + 44}px`, background: done ? 'rgba(16,185,129,0.2)' : 'rgba(2,98,236,0.1)' }}
        />
        {/* Label */}
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium pointer-events-none"
          style={{ color: done ? '#065f46' : 'var(--color-muted)' }}>
          {done ? '✓ ยืนยันสำเร็จ' : 'เลื่อนเพื่อยืนยัน →'}
        </span>
        {/* Handle */}
        <div
          className="absolute top-1 w-9 h-9 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md transition-colors"
          style={{
            left: `${pos + 2}px`,
            background: done ? '#10b981' : 'var(--color-primary)',
            color: '#fff',
            fontSize: '1.1rem',
          }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          {done ? '✓' : '›'}
        </div>
      </div>
    </div>
  );
}

export default function ReviewSection({
  installerId,
  reviews,
  rating,
  reviewCount,
}: {
  installerId: number;
  reviews: Review[];
  rating: number;
  reviewCount: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ rating: 5, title: '', body: '', reviewer_name: '', reviewer_email: '' });

  function updateForm(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  function validateForm() {
    if (!form.reviewer_name.trim()) return 'กรุณากรอกชื่อ';
    if (!form.reviewer_email.trim()) return 'กรุณากรอกอีเมล';
    if (form.body.length < 20) return 'รายละเอียดต้องมีอย่างน้อย 20 ตัวอักษร';
    return null;
  }

  function handleReviewSubmitClick(e: React.FormEvent) {
    e.preventDefault();
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setFormError('');
    setShowCaptcha(true);
  }

  async function afterCaptcha() {
    setShowCaptcha(false);
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, installer_id: installerId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('ขอบคุณสำหรับรีวิว! รีวิวของคุณกำลังรอการตรวจสอบ');
        setShowForm(false);
      } else {
        setFormError(data.error || 'เกิดข้อผิดพลาด');
        setShowForm(true);
      }
    } catch {
      setFormError('เกิดข้อผิดพลาด กรุณาลองใหม่');
      setShowForm(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">⭐ รีวิวจากลูกค้าจริง</h2>
        <button onClick={() => { setShowForm(true); setSuccess(''); setFormError(''); }} className="btn btn-outline btn-sm">
          ✏️ เขียนรีวิว
        </button>
      </div>

      {/* Rating summary */}
      <div className="flex items-center gap-3 mb-5 p-4 bg-blue-50/50 rounded-xl">
        <div className="text-center">
          <div className="text-4xl font-bold text-[var(--color-primary)]">{rating}</div>
          <div dangerouslySetInnerHTML={{ __html: starsHtml(rating) }} className="text-lg" />
          <div className="text-xs text-[var(--color-muted)] mt-1">{reviewCount} รีวิว</div>
        </div>
      </div>

      {success && <div className="alert alert-success mb-4"><span>✅</span> {success}</div>}

      {/* Review form */}
      {showForm && (
        <div className="border border-[var(--color-border)] rounded-xl p-4 mb-5">
          <h3 className="font-semibold mb-3">เขียนรีวิว</h3>
          {formError && <div className="alert alert-error mb-3"><span>⚠️</span> {formError}</div>}
          <form onSubmit={handleReviewSubmitClick} className="space-y-3">
            {/* Rating */}
            <div className="form-group">
              <label className="form-label">คะแนน</label>
              <select className="form-input" value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: parseInt(e.target.value) }))}>
                {[5, 4, 3, 2, 1].map((v) => <option key={v} value={v}>{v} ดาว {'★'.repeat(v)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">ชื่อ <span className="text-red-500">*</span></label>
                <input type="text" className="form-input" value={form.reviewer_name} onChange={updateForm('reviewer_name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">อีเมล <span className="text-red-500">*</span></label>
                <input type="email" className="form-input" value={form.reviewer_email} onChange={updateForm('reviewer_email')} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">หัวข้อรีวิว</label>
              <input type="text" className="form-input" placeholder="สรุปสั้นๆ" value={form.title} onChange={updateForm('title')} />
            </div>
            <div className="form-group">
              <label className="form-label">รายละเอียด <span className="text-red-500">*</span> (อย่างน้อย 20 ตัว)</label>
              <textarea className="form-input" rows={4} value={form.body} onChange={updateForm('body')} required style={{ resize: 'vertical' }} />
              <span className="form-hint">{form.body.length} ตัวอักษร</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">ยกเลิก</button>
              <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
                {submitting ? '⏳ กำลังส่ง...' : '📤 ส่งรีวิว'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Captcha modal */}
      {showCaptcha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 w-80 mx-4">
            <h3 className="font-bold text-center mb-1">🔒 ยืนยันตัวตน</h3>
            <p className="text-xs text-center text-[var(--color-muted)] mb-3">คุณไม่ใช่บอทใช่ไหม?</p>
            <SliderCaptcha onSuccess={afterCaptcha} />
            <button onClick={() => setShowCaptcha(false)} className="btn btn-ghost btn-sm w-full mt-2">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-muted)] text-sm">
          ยังไม่มีรีวิว — เป็นคนแรกที่เขียนรีวิว!
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-[var(--color-border)] pb-4 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-sm">{r.reviewer_name}</div>
                <span dangerouslySetInnerHTML={{ __html: starsHtml(r.rating) }} />
              </div>
              {r.title && <div className="font-medium text-sm mb-1">{r.title}</div>}
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">{r.body}</p>
              {r.reply && (
                <div className="mt-2 ml-4 p-3 bg-blue-50 rounded-lg text-xs">
                  <span className="font-semibold text-[var(--color-primary)]">💬 ตอบกลับจากบริษัท:</span>
                  <p className="mt-1 text-[var(--color-muted)]">{r.reply}</p>
                </div>
              )}
              <div className="text-xs text-[var(--color-muted)] mt-2">
                {new Date(r.created_at).toLocaleDateString('th-TH')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
