'use client';

import { useState } from 'react';

export function ImageUrlOrFileField({ label, value, onChange, hint, subdir = 'blog' }: {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  subdir?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('subdir', subdir);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const d = await res.json();
      if (d.success) onChange(d.url);
      else alert(d.error || 'อัพโหลดไม่สำเร็จ');
    } catch {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="form-label">{label}</label>}
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="text"
          className="form-input flex-1 text-sm"
          style={{ minWidth: 200 }}
          placeholder="วาง URL รูปภาพ เช่น https://example.com/image.jpg"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <label className={`btn btn-secondary btn-sm shrink-0 cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          {uploading ? '⏳ กำลังอัพโหลด...' : '📁 อัพโหลดไฟล์'}
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = ''; }} />
        </label>
      </div>
      {value && (
        <img src={value} alt="preview" className="h-24 w-auto object-contain rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-alt)]" />
      )}
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  );
}

export function ContentImageInserter({ onInsert }: { onInsert: (url: string) => void }) {
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('subdir', 'blog');
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const d = await res.json();
      if (d.success) onInsert(d.url);
      else alert(d.error || 'อัพโหลดไม่สำเร็จ');
    } catch {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex gap-2 items-center flex-wrap p-2 rounded-lg bg-[var(--color-bg-alt)] border border-[var(--color-border)]">
      <span className="text-xs text-[var(--color-muted)] shrink-0">🖼️ รูปประกอบบทความ:</span>
      <input
        type="text"
        className="form-input py-1 text-xs flex-1"
        style={{ minWidth: 160 }}
        placeholder="วาง URL รูปภาพแล้วกดแทรก..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button type="button" className="btn btn-outline btn-sm shrink-0" disabled={!url}
        onClick={() => { onInsert(url); setUrl(''); }}>
        ➕ แทรก URL
      </button>
      <label className={`btn btn-secondary btn-sm shrink-0 cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
        {uploading ? '⏳ กำลังอัพโหลด...' : '📁 อัพโหลดไฟล์ & แทรก'}
        <input type="file" accept="image/*" className="hidden" disabled={uploading}
          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = ''; }} />
      </label>
    </div>
  );
}
