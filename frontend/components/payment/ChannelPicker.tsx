'use client';

const OPTIONS: { value: string; label: string; recommend?: boolean }[] = [
  { value: 'email', label: '📧 อีเมลเท่านั้น' },
  { value: 'both', label: '📧 + 💬 ทั้งสองช่องทาง', recommend: true },
  { value: 'line', label: '💬 LINE เท่านั้น' },
];

export default function ChannelPicker({
  value,
  lineLinked,
  disabled,
  onChange,
}: {
  value: string;
  lineLinked: boolean;
  disabled?: boolean;
  onChange: (channel: string) => void;
}) {
  return (
    <div>
      <div className="channel-picker">
        {OPTIONS.map((o) => {
          const gated = o.value !== 'email' && !lineLinked;
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabled || gated}
              className={`channel-option ${value === o.value ? 'is-selected' : ''}`}
              onClick={() => onChange(o.value)}
              title={gated ? 'เชื่อมต่อ LINE ก่อนเพื่อเลือกช่องทางนี้' : undefined}
            >
              {o.recommend && <span className="tag-recommend">แนะนำ</span>}
              {o.label}
            </button>
          );
        })}
      </div>
      {!lineLinked && <p className="text-xs text-[var(--color-muted)] mt-1.5">เชื่อมต่อ LINE ก่อนจึงจะเลือกรับแจ้งเตือนทาง LINE ได้</p>}
    </div>
  );
}
