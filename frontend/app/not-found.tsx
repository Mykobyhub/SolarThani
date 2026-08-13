import Link from 'next/link';

export const metadata = {
  title: 'ไม่พบหน้าที่ต้องการ',
};

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16">
      {/* Solar illustration */}
      <div className="relative mb-8">
        {/* Glow ring */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-20"
          style={{ background: 'radial-gradient(circle, #FD6902 0%, #0262EC 70%, transparent 100%)', transform: 'scale(1.6)' }}
        />
        {/* Sun + panel icon */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative"
        >
          {/* Sun rays */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="60" y1="14" x2="60" y2="6"
              stroke="#FD6902"
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${deg} 60 60)`}
            />
          ))}
          {/* Sun circle */}
          <circle cx="60" cy="60" r="18" fill="#FD6902" opacity="0.15" />
          <circle cx="60" cy="60" r="12" fill="#FD6902" opacity="0.9" />
          {/* Solar panel (tilted rectangle with grid) */}
          <g transform="translate(60,60) rotate(-15) translate(-28,-20)">
            <rect x="0" y="0" width="56" height="40" rx="3" fill="#0262EC" opacity="0.9" />
            {/* Panel grid lines */}
            <line x1="18.7" y1="0" x2="18.7" y2="40" stroke="white" strokeWidth="1" opacity="0.4" />
            <line x1="37.3" y1="0" x2="37.3" y2="40" stroke="white" strokeWidth="1" opacity="0.4" />
            <line x1="0" y1="13.3" x2="56" y2="13.3" stroke="white" strokeWidth="1" opacity="0.4" />
            <line x1="0" y1="26.7" x2="56" y2="26.7" stroke="white" strokeWidth="1" opacity="0.4" />
            {/* Shine */}
            <rect x="0" y="0" width="56" height="40" rx="3" fill="url(#panelShine)" opacity="0.15" />
            <defs>
              <linearGradient id="panelShine" x1="0" y1="0" x2="56" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="white" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </g>
          {/* Disconnected plug icon - small */}
          <circle cx="92" cy="30" r="10" fill="#fee2e2" />
          <text x="92" y="34" textAnchor="middle" fontSize="12">⚡</text>
        </svg>
      </div>

      {/* Heading */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          ไม่พบหน้าที่ต้องการ
        </h1>
        <p className="text-[var(--color-muted)] max-w-sm mx-auto leading-relaxed">
          อาจเป็นเพราะลิงก์ผิด, ผู้ติดตั้งรายนี้ไม่ได้ใช้งานแล้ว,
          หรือหน้านี้ถูกย้ายไปที่อื่น
        </p>
      </div>

      {/* Suggestion cards */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <Link href="/installers" className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
          ดูผู้ติดตั้งทั้งหมด
        </Link>
        <Link href="/" className="btn btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          กลับหน้าหลัก
        </Link>
        <Link href="/calculator" className="btn btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.35-5.45 1.03a.75.75 0 0 0-.475.729v.586a3 3 0 0 0 3.124 2.996 36.001 36.001 0 0 0 5.601 0 3 3 0 0 0 3.124-2.996v-.586a.75.75 0 0 0-.474-.73A11.953 11.953 0 0 0 12 2.25Z" />
          </svg>
          คำนวณราคา
        </Link>
      </div>

      {/* Tip box */}
      <div
        className="rounded-xl px-5 py-4 text-sm max-w-md text-center"
        style={{ background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)' }}
      >
        <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>💡 เคล็ดลับ: </span>
        <span style={{ color: 'var(--color-muted)' }}>
          ใช้หน้า <Link href="/installers" className="underline" style={{ color: 'var(--color-primary)' }}>รายชื่อผู้ติดตั้ง</Link> เพื่อค้นหาช่างในพื้นที่ของคุณได้เลย
        </span>
      </div>
    </div>
  );
}
