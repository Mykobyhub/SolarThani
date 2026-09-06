'use client';

import { useEffect, useRef, useState } from 'react';

interface CodeInfo {
  code: string;
  expiresAt: string;
  addFriendUrl: string;
}

export default function LineConnect({
  linked,
  oaBasicId,
  lineEnabled,
  onGenerateCode,
  onUnlink,
  onCheckLinked,
}: {
  linked: boolean;
  oaBasicId: string;
  lineEnabled: boolean;
  onGenerateCode: () => Promise<CodeInfo | null>;
  onUnlink: () => Promise<void>;
  onCheckLinked: () => Promise<boolean>;
}) {
  const [code, setCode] = useState<CodeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  // Tracks a link confirmed via polling this session, without needing to mirror the `linked`
  // prop into local state (that prop already reflects reality on every parent re-fetch/reload).
  const [confirmedLinked, setConfirmedLinked] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLinked = linked || confirmedLinked;

  useEffect(() => {
    if (!code || isLinked) return;
    pollRef.current = setInterval(async () => {
      const nowLinked = await onCheckLinked();
      if (nowLinked) {
        setConfirmedLinked(true);
        setCode(null);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [code, isLinked, onCheckLinked]);

  async function generate() {
    setLoading(true);
    try {
      const c = await onGenerateCode();
      setCode(c);
    } finally {
      setLoading(false);
    }
  }

  async function unlink() {
    if (!confirm('ยกเลิกการเชื่อมต่อ LINE? คุณจะไม่ได้รับแจ้งเตือนทาง LINE อีกจนกว่าจะเชื่อมต่อใหม่')) return;
    setLoading(true);
    try {
      await onUnlink();
      setConfirmedLinked(false);
      setCode(null);
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    if (!code) return;
    navigator.clipboard?.writeText(`ยืนยัน SP-${code.code}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!lineEnabled) {
    return <div className="card p-5 text-sm text-[var(--color-muted)]">ระบบแจ้งเตือนทาง LINE ยังไม่เปิดใช้งานโดยผู้ดูแลระบบ</div>;
  }

  if (isLinked) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="line-oa-pill">🔗 เชื่อมต่อ LINE แล้ว</span>
          <button className="btn btn-sm btn-danger-outline" disabled={loading} onClick={unlink}>
            ยกเลิกการเชื่อมต่อ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="font-bold">🔔 เชื่อมต่อ LINE รับแจ้งเตือน</div>
      {!code ? (
        <>
          <p className="text-sm text-[var(--color-muted)]">
            เพิ่มเพื่อน LINE OA ของเรา แล้วพิมพ์รหัสยืนยันในแชทเพื่อรับแจ้งเตือนความคืบหน้าโครงการทาง LINE
          </p>
          <button className="btn btn-primary btn-sm" disabled={loading} onClick={generate}>
            {loading ? '⏳ กำลังสร้างรหัส...' : '+ เริ่มเชื่อมต่อ LINE'}
          </button>
        </>
      ) : (
        <>
          <div className="text-center">
            <div className="qr-box mb-3">📱</div>
            <a
              href={code.addFriendUrl}
              target="_blank"
              rel="noopener"
              className="btn w-full justify-center text-white mb-3"
              style={{ background: '#06c755', borderColor: '#06c755' }}
            >
              เพิ่มเพื่อน {oaBasicId} บน LINE →
            </a>
          </div>
          <div className="alert alert-info">
            <span>ℹ️</span> ขั้นตอนที่ 2: พิมพ์รหัสยืนยันนี้ในแชท LINE OA
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="verify-code-chip">ยืนยัน SP-{code.code}</span>
            <button className="btn btn-outline btn-sm" onClick={copyCode}>
              {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}
            </button>
          </div>
          <p className="text-xs text-[var(--color-muted)] text-center">รหัสหมดอายุใน 10 นาที · หน้านี้จะอัปเดตอัตโนมัติเมื่อเชื่อมต่อสำเร็จ</p>
        </>
      )}
    </div>
  );
}
