'use client';

import { useState } from 'react';
import SpecialtyPicker from './SpecialtyPicker';
import { parseTags, type JobCategory } from '@/lib/subcontractor/constants';

export interface RosterItem {
  id: number;
  name: string;
  phone: string | null;
  specialty_tags: string;
  line_user_id: string | null;
}

// Inline picker (design spec §3a/§3b) used both for "+ มอบหมาย" (unassigned row) and
// "🔁 เปลี่ยนช่าง" (already-assigned row) — same component, `currentSubcontractorId` just changes
// whether the current assignee shows up disabled at the top of the list.
export default function AssignPicker({
  category,
  roster,
  currentSubcontractorId,
  busy,
  onPickExisting,
  onCreateAndAssign,
  onCancel,
}: {
  category: JobCategory;
  roster: RosterItem[];
  currentSubcontractorId?: number;
  busy: boolean;
  onPickExisting: (subcontractorId: number) => void;
  onCreateAndAssign: (name: string, phone: string, tags: string[]) => void;
  onCancel: () => void;
}) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  function submitNew() {
    if (!name.trim()) return;
    onCreateAndAssign(name.trim(), phone.trim(), tags);
  }

  return (
    <div className="assign-picker">
      {roster.length > 0 && (
        <div className="assign-roster-list">
          {roster.map((r) => {
            const isCurrent = r.id === currentSubcontractorId;
            const rTags = parseTags(r.specialty_tags);
            const isMatch = rTags.includes(category);
            return (
              <button
                key={r.id}
                type="button"
                disabled={busy || isCurrent}
                className={`assign-roster-item ${isCurrent ? 'is-current' : ''} ${!isCurrent && isMatch ? 'is-match' : ''}`}
                onClick={() => !isCurrent && onPickExisting(r.id)}
              >
                <span>{r.name}{isCurrent ? ' (ปัจจุบัน)' : ''}</span>
                {rTags.length > 0 && <span className="text-xs text-[var(--color-muted)]">{rTags.join(', ')}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="assign-picker-divider">หรือ</div>

      {!showNewForm ? (
        <button type="button" className="assign-new-btn" onClick={() => setShowNewForm(true)}>
          + เพิ่มช่างใหม่และมอบหมายทันที
        </button>
      ) : (
        <div className="assign-new-form">
          <div className="assign-new-form-grid">
            <input type="text" className="form-input" placeholder="ชื่อช่าง" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="tel" className="form-input" placeholder="เบอร์โทร (ไม่บังคับ)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <SpecialtyPicker value={tags} onChange={setTags} />
          <p className="form-hint">
            ยังไม่ส่งคำเชิญ LINE ในขั้นตอนนี้ — ไปที่แท็บ &quot;ทีมช่าง&quot; เพื่อส่งคำเชิญให้ช่างคนนี้ทีหลัง
          </p>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || !name.trim()} onClick={submitNew}>
            {busy ? '⏳ กำลังบันทึก...' : 'บันทึกและมอบหมายงานนี้ทันที'}
          </button>
        </div>
      )}

      <button type="button" className="btn btn-ghost btn-sm border border-[var(--color-border)]" onClick={onCancel}>ยกเลิก</button>
    </div>
  );
}
