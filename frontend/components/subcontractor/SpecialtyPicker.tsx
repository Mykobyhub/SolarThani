'use client';

import { useState } from 'react';
import { JOB_CATEGORIES, CATEGORY_ICON } from '@/lib/subcontractor/constants';

// Tag-input combobox (design spec §2/§10): the 4 fixed job categories show as pre-existing
// selectable chips, plus a trailing borderless text input — type anything and press Enter/comma
// to add it as its own chip. Purely cosmetic/reference tags (design decision #3) — never used to
// restrict what a sub-contractor can be assigned to.
export default function SpecialtyPicker({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');

  function toggleFixed(cat: string) {
    onChange(value.includes(cat) ? value.filter((t) => t !== cat) : [...value, cat]);
  }

  function addCustomTag() {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  const customTags = value.filter((t) => !(JOB_CATEGORIES as readonly string[]).includes(t));

  return (
    <div className="chip-picker">
      {JOB_CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          className={`chip-option ${value.includes(cat) ? 'is-selected' : ''}`}
          onClick={() => toggleFixed(cat)}
        >
          {CATEGORY_ICON[cat]} {cat}
        </button>
      ))}
      {customTags.map((tag) => (
        <span key={tag} className="chip-option is-selected">
          {tag}
          <button type="button" className="chip-x" onClick={() => removeTag(tag)} aria-label={`ลบแท็ก ${tag}`}>×</button>
        </span>
      ))}
      <input
        type="text"
        className="chip-tag-input"
        placeholder="พิมพ์แท็กเพิ่มเติมแล้วกด Enter..."
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addCustomTag();
          }
        }}
      />
    </div>
  );
}
